import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { UserRoles } from 'yeppi-common';
import { useAuthStore } from '../../app/stores/Auth/Auth';
import { useDocumentTemplateStore } from '../../app/stores/DocumentTemplate/DocumentTemplate';
import type {
	DocumentTemplateConfiguration,
	DocumentTemplateDetail,
	DocumentTemplateMutationResponse,
	DocumentTemplateRevision,
} from '../../app/utils/types/document-template';

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	useAppUiStore: () => ({ showToast: vi.fn(), setExcludeRoutes: vi.fn() }),
}));

const api = {
	list: vi.fn(),
	get: vi.fn(),
	saveDraft: vi.fn(),
	previewEmail: vi.fn(),
	previewPdf: vi.fn(),
	testSend: vi.fn(),
	publish: vi.fn(),
	reset: vi.fn(),
	listRevisions: vi.fn(),
	restore: vi.fn(),
};

const detail: DocumentTemplateDetail = {
	template_code: 'order-confirmation',
	channel: 'email',
	display_name: 'Order confirmation',
	category: 'customer',
	editable: true,
	version: 2,
	catalog_schema_version: 1,
	catalog_system_template_version: 1,
	fields: [{ path: 'content.greeting', label: 'Greeting', kind: 'rich-text', max_length: 500, allow_blank: true, allowed_tokens: ['{{customer.name}}'] }],
	blocks: [{ id: 'order-items', label: 'Order items', required: true, default_enabled: true }],
	allowed_tokens: ['{{customer.name}}'],
	configuration: { content: { greeting: '<p>Welcome</p>' }, blocks: [{ id: 'order-items', enabled: true, props: {} }] },
	inherited_values: { merchantInfo: { companyName: 'Aster Home' } },
	catalog_default_values: { brand: { primaryColor: '#EE7F01' } },
	effective_preview_values: { merchantInfo: { companyName: 'Aster Home' } },
	draft_revision: {
		id: 'draft-1', revision_no: 2, status: 'draft', schema_version: 1, system_template_version: 1, created_by: null,
		start_date: null, end_date: null, published_at: null, created_at: '2026-07-31T00:00:00.000Z',
		configuration: { content: { greeting: '<p>Welcome</p>' }, blocks: [{ id: 'order-items', enabled: true, props: {} }] },
	},
	latest_published_revision: null,
	active_revision: null,
};

const originalBlobDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Blob');
const originalCreateObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

function restoreProperty(target: object, key: PropertyKey, descriptor: PropertyDescriptor | undefined) {
	if (descriptor) Object.defineProperty(target, key, descriptor);
	else Reflect.deleteProperty(target, key);
}

function revision(overrides: Partial<DocumentTemplateRevision>): DocumentTemplateRevision {
	return {
		...structuredClone(detail.draft_revision!),
		...overrides,
		configuration: overrides.configuration ?? structuredClone(detail.draft_revision!.configuration),
	};
}

const existingPublished = revision({
	id: 'published-1',
	revision_no: 1,
	status: 'published',
	published_at: '2026-07-30T00:00:00.000Z',
});
const existingArchived = revision({ id: 'archived-1', revision_no: 0, status: 'archived' });

describe('useDocumentTemplateStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		Object.values(api).forEach(mock => mock.mockReset());
		api.get.mockResolvedValue(structuredClone(detail));
		api.listRevisions.mockResolvedValue({ revisions: [] });
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({ $api: { documentTemplate: api } });
		useAuthStore().user = { id: 'staff-1', role: UserRoles.MERCHANT_STAFF, email_address: 'staff@example.test', name: 'Staff', dial_code: '+60', phone_no: '123456789' };
	});

	afterEach(() => {
		restoreProperty(globalThis, 'Blob', originalBlobDescriptor);
		restoreProperty(URL, 'createObjectURL', originalCreateObjectUrlDescriptor);
		restoreProperty(URL, 'revokeObjectURL', originalRevokeObjectUrlDescriptor);
		vi.useRealTimers();
	});

	async function selectDraft() {
		const store = useDocumentTemplateStore();
		await store.loadDetail('email', 'order-confirmation');
		return store;
	}

	function deferred<T>() {
		let resolve!: (value: T) => void;
		let reject!: (reason?: unknown) => void;
		return { promise: new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; }), resolve, reject };
	}

	function seedRevisionHistory(store: ReturnType<typeof useDocumentTemplateStore>) {
		store.revisions = [structuredClone(detail.draft_revision!), structuredClone(existingPublished), structuredClone(existingArchived)];
	}

	function expectSingleDraftHistory(store: ReturnType<typeof useDocumentTemplateStore>, nextDraftId: string) {
		expect(store.revisions.map(({ id, status }) => ({ id, status }))).toEqual([
			{ id: nextDraftId, status: 'draft' },
			{ id: 'draft-1', status: 'archived' },
			{ id: 'published-1', status: 'published' },
			{ id: 'archived-1', status: 'archived' },
		]);
		expect(store.revisions.filter(candidate => candidate.status === 'draft')).toHaveLength(1);
		expect(store.revisions[2]).toEqual(existingPublished);
		expect(store.revisions[3]).toEqual(existingArchived);
	}

	it('keeps edits dirty until explicit save succeeds', async () => {
		const store = await selectDraft();
		api.saveDraft.mockResolvedValue({ version: 3, draft_revision: { ...detail.draft_revision!, revision_no: 3, configuration: { content: { greeting: '<p>Hello</p>' } } } });

		store.setConfigurationPath('content.greeting', '<p>Hello</p>');
		expect(store.isDirty).toBe(true);
		expect(api.saveDraft).not.toHaveBeenCalled();
		await store.saveDraft();

		expect(api.saveDraft).toHaveBeenCalledWith('email', 'order-confirmation', {
			version: 2,
			configuration: { content: { greeting: '<p>Hello</p>' }, blocks: [{ id: 'order-items', enabled: true, props: {} }] },
		});
		expect(store.isDirty).toBe(false);
		expect(store.detail?.version).toBe(3);
	});

	it('preserves local edits and exposes reload action on HTTP 409', async () => {
		const store = await selectDraft();
		store.setConfigurationPath('content.greeting', '<p>Local</p>');
		api.saveDraft.mockRejectedValue({
			metadata: { request_id: 'transport-1' },
			response: { data: { statusCode: 409, metadata: { current_version: 4 } } },
		});

		await store.saveDraft();

		expect(store.conflict).toEqual({ currentVersion: 4 });
		expect(store.draft.content?.greeting).toBe('<p>Local</p>');
		expect(store.isDirty).toBe(true);
	});

	it('never exposes publish actions to staff roles', () => {
		const auth = useAuthStore();
		auth.user = { id: 'staff-1', role: UserRoles.MERCHANT_STAFF, email_address: 'staff@example.test', name: 'Staff', dial_code: '+60', phone_no: '123456789' };
		const store = useDocumentTemplateStore();

		expect(store.canPublish).toBe(false);
		expect(store.canEdit).toBe(true);
	});

	it('ignores stale detail results after a newer selection', async () => {
		let resolveFirst!: (value: DocumentTemplateDetail) => void;
		api.get.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
		api.get.mockResolvedValueOnce({ ...detail, template_code: 'invoice', display_name: 'Invoice' });
		const store = useDocumentTemplateStore();

		const first = store.loadDetail('email', 'order-confirmation');
		await store.loadDetail('email', 'invoice');
		resolveFirst(detail);
		await first;

		expect(store.selected).toEqual({ channel: 'email', templateCode: 'invoice' });
		expect(store.detail?.template_code).toBe('invoice');
	});

	it('deduplicates latest and active revisions by id when loading detail', async () => {
		api.get.mockResolvedValue({
			...structuredClone(detail),
			latest_published_revision: structuredClone(existingPublished),
			active_revision: structuredClone(existingPublished),
		});
		const store = useDocumentTemplateStore();

		await store.loadDetail('email', 'order-confirmation');

		expect(store.revisions.map(candidate => candidate.id)).toEqual(['draft-1', 'published-1']);
		expect(store.revisions[1]).toEqual(existingPublished);
	});

	it('replaces and revokes a PDF preview URL without mixing it into an email preview', async () => {
		const createObjectURL = vi.fn(() => 'blob:preview-1');
		const revokeObjectURL = vi.fn();
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
		api.get.mockResolvedValue({ ...detail, channel: 'pdf' });
		api.previewPdf.mockResolvedValue(new Blob(['pdf']));
		const store = useDocumentTemplateStore();
		await store.loadDetail('pdf', 'order-confirmation');

		await store.previewDraft();
		store.clearPreview();

		expect(store.preview).toBeNull();
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
	});

	it('clears state immediately and ignores an ABA stale detail response', async () => {
		const first = deferred<DocumentTemplateDetail>();
		api.get.mockImplementationOnce(() => first.promise);
		api.get.mockResolvedValueOnce({ ...detail, template_code: 'invoice' });
		api.get.mockResolvedValueOnce({ ...detail, display_name: 'Fresh order confirmation' });
		const store = useDocumentTemplateStore();
		const firstLoad = store.loadDetail('email', 'order-confirmation');
		await store.loadDetail('email', 'invoice');
		const finalLoad = store.loadDetail('email', 'order-confirmation');
		expect(store.detail).toBeNull();
		first.resolve({ ...detail, display_name: 'Stale order confirmation' });
		await Promise.all([firstLoad, finalLoad]);
		expect(store.detail?.display_name).toBe('Fresh order confirmation');
	});

	it('preserves a newer edit while updating the saved baseline', async () => {
		const store = await selectDraft();
		const save = deferred<{ version: number; draft_revision: NonNullable<DocumentTemplateDetail['draft_revision']> }>();
		api.saveDraft.mockReturnValue(save.promise);
		store.setConfigurationPath('content.greeting', '<p>Saved</p>');
		const pending = store.saveDraft();
		store.setConfigurationPath('content.greeting', '<p>Newer local</p>');
		save.resolve({ version: 3, draft_revision: { ...detail.draft_revision!, configuration: { content: { greeting: '<p>Saved</p>' } } } });
		await pending;
		expect(store.draft.content?.greeting).toBe('<p>Newer local</p>');
		expect(store.isDirty).toBe(true);
		expect(store.detail?.version).toBe(3);
	});

	it('serializes positive logo ids and omits untouched block inheritance', async () => {
		const store = await selectDraft();
		store.draft = { brand: { logoAssetId: 42 } };
		store.refreshDirty();
		api.saveDraft.mockResolvedValue({ version: 3, draft_revision: { ...detail.draft_revision!, configuration: { brand: { logoAssetId: 42 } } } });
		await store.saveDraft();
		expect(api.saveDraft).toHaveBeenCalledWith('email', 'order-confirmation', {
			version: 2,
			configuration: { brand: { logoAssetId: 42 } },
		});
	});

	it('does not apply a stale mutation error after dispose', async () => {
		const store = await selectDraft();
		const save = deferred<never>();
		api.saveDraft.mockReturnValue(save.promise);
		store.setConfigurationPath('content.greeting', '<p>Local</p>');
		const pending = store.saveDraft();
		store.dispose();
		save.reject({ statusCode: 409, metadata: { current_version: 5 } });
		await pending;
		expect(store.conflict).toBeNull();
		expect(store.error).toBeNull();
	});

	it('uses the published revision configuration as its next baseline', async () => {
		const store = await selectDraft();
		useAuthStore().user!.role = UserRoles.MERCHANT_ADMIN;
		store.detail!.fields.push({ path: 'brand.primaryColor', label: 'Primary colour', kind: 'color', max_length: 20, allow_blank: false, allowed_tokens: [] });
		api.publish.mockResolvedValue({ version: 3, latest_published_revision: { ...detail.draft_revision!, status: 'published', configuration: { content: { greeting: '<p>Published</p>' }, brand: { primaryColor: '#123456' } } } });
		await store.publish();
		expect(store.draft).toEqual({ content: { greeting: '<p>Published</p>' }, brand: { primaryColor: '#123456' } });
		expect(store.isDirty).toBe(false);
		store.setConfigurationPath('content.greeting', '<p>Changed</p>');
		expect(store.configurationForRequest()).toEqual({ content: { greeting: '<p>Changed</p>' }, brand: { primaryColor: '#123456' } });
	});

	it('updates the active revision after an immediately eligible publish', async () => {
		const store = await selectDraft();
		useAuthStore().user!.role = UserRoles.MERCHANT_ADMIN;
		store.detail!.active_revision = structuredClone(existingPublished);
		const publishedDraft = revision({
			id: 'published-now',
			revision_no: 2,
			status: 'published',
			start_date: null,
			end_date: null,
			published_at: '2026-07-31T12:00:00.000Z',
		});
		api.publish.mockResolvedValue({ version: 3, latest_published_revision: publishedDraft });

		await store.publish();

		expect(store.detail?.active_revision).toEqual(publishedDraft);
	});

	it('fails closed without a publish request while a draft is dirty', async () => {
		const store = await selectDraft();
		useAuthStore().user!.role = UserRoles.MERCHANT_ADMIN;
		store.setConfigurationPath('content.greeting', '<p>Unsaved</p>');
		await store.publish();
		expect(api.publish).not.toHaveBeenCalled();
		expect(store.error).toBe('Save draft before publishing');
	});

	it('loads authoritative history and ignores stale pre-save history', async () => {
		const store = await selectDraft();
		seedRevisionHistory(store);
		const staleHistory = deferred<{ revisions: DocumentTemplateRevision[] }>();
		const nextDraft = revision({ id: 'draft-2', revision_no: 3, status: 'draft', configuration: { content: { greeting: '<p>Saved</p>' } } });
		const authoritativeHistory = [
			nextDraft,
			revision({ id: 'draft-1', revision_no: 2, status: 'archived', updated_at: '2026-07-31T03:00:00.000Z' }),
			structuredClone(existingPublished),
			structuredClone(existingArchived),
		];
		api.listRevisions.mockReturnValueOnce(staleHistory.promise).mockResolvedValueOnce({ revisions: authoritativeHistory });
		const historyRequest = store.loadRevisions();
		api.saveDraft.mockResolvedValue({ version: 3, draft_revision: nextDraft });
		store.setConfigurationPath('content.greeting', '<p>Saved</p>');

		await store.saveDraft();
		staleHistory.resolve({ revisions: [revision({ id: 'stale-draft', status: 'draft' })] });
		await historyRequest;

		expectSingleDraftHistory(store, 'draft-2');
		expect(store.revisions).toEqual(authoritativeHistory);
		expect(store.detail?.draft_revision).toEqual(nextDraft);
		expect(store.isDirty).toBe(false);
	});

	it('loads authoritative history and ignores stale pre-reset history', async () => {
		const store = await selectDraft();
		useAuthStore().user!.role = UserRoles.MERCHANT_ADMIN;
		seedRevisionHistory(store);
		const staleHistory = deferred<{ revisions: DocumentTemplateRevision[] }>();
		const nextDraft = revision({ id: 'draft-reset', revision_no: 3, status: 'draft', configuration: { content: { greeting: '<p>Reset</p>' } } });
		const authoritativeHistory = [
			nextDraft,
			revision({ id: 'draft-1', revision_no: 2, status: 'archived', updated_at: '2026-07-31T03:00:00.000Z' }),
			structuredClone(existingPublished),
			structuredClone(existingArchived),
		];
		api.listRevisions.mockReturnValueOnce(staleHistory.promise).mockResolvedValueOnce({ revisions: authoritativeHistory });
		const historyRequest = store.loadRevisions();
		api.reset.mockResolvedValue({ version: 3, draft_revision: nextDraft });

		await store.reset();
		staleHistory.resolve({ revisions: [revision({ id: 'stale-draft', status: 'draft' })] });
		await historyRequest;

		expectSingleDraftHistory(store, 'draft-reset');
		expect(store.revisions).toEqual(authoritativeHistory);
		expect(store.draft).toEqual(nextDraft.configuration);
		expect(store.isDirty).toBe(false);
	});

	it('loads authoritative history and ignores stale pre-restore history', async () => {
		const store = await selectDraft();
		useAuthStore().user!.role = UserRoles.MERCHANT_ADMIN;
		seedRevisionHistory(store);
		const staleHistory = deferred<{ revisions: DocumentTemplateRevision[] }>();
		const nextDraft = revision({ id: 'draft-restore', revision_no: 3, status: 'draft', configuration: { content: { greeting: '<p>Restored</p>' } } });
		const authoritativeHistory = [
			nextDraft,
			revision({ id: 'draft-1', revision_no: 2, status: 'archived', updated_at: '2026-07-31T03:00:00.000Z' }),
			structuredClone(existingPublished),
			structuredClone(existingArchived),
		];
		api.listRevisions.mockReturnValueOnce(staleHistory.promise).mockResolvedValueOnce({ revisions: authoritativeHistory });
		const historyRequest = store.loadRevisions();
		api.restore.mockResolvedValue({ version: 3, draft_revision: nextDraft });

		await store.restore(1);
		staleHistory.resolve({ revisions: [revision({ id: 'stale-draft', status: 'draft' })] });
		await historyRequest;

		expectSingleDraftHistory(store, 'draft-restore');
		expect(store.revisions).toEqual(authoritativeHistory);
		expect(store.draft).toEqual(nextDraft.configuration);
		expect(store.isDirty).toBe(false);
	});

	it.each(['save', 'reset', 'restore'] as const)('refreshes authoritative revision metadata after %s', async mutationName => {
		const store = await selectDraft();
		useAuthStore().user!.role = UserRoles.MERCHANT_ADMIN;
		const staleDraft = revision({ id: 'draft-1', status: 'draft', updated_at: '2026-07-31T01:00:00.000Z' });
		store.revisions = [staleDraft, structuredClone(existingPublished), structuredClone(existingArchived)];
		const nextDraft = revision({ id: `draft-${mutationName}`, revision_no: 3, status: 'draft', updated_at: '2026-07-31T02:00:00.000Z' });
		const authoritativeArchived = revision({
			...staleDraft,
			status: 'archived',
			updated_at: '2026-07-31T03:00:00.000Z',
		});
		const authoritativeHistory = [nextDraft, authoritativeArchived, structuredClone(existingPublished), structuredClone(existingArchived)];
		const history = deferred<{ revisions: DocumentTemplateRevision[] }>();
		api.listRevisions.mockReturnValue(history.promise);
		api.saveDraft.mockResolvedValue({ version: 3, draft_revision: nextDraft });
		api.reset.mockResolvedValue({ version: 3, draft_revision: nextDraft });
		api.restore.mockResolvedValue({ version: 3, draft_revision: nextDraft });
		if (mutationName === 'save') store.setConfigurationPath('content.greeting', '<p>Saved</p>');

		const pending = mutationName === 'save' ? store.saveDraft() : mutationName === 'reset' ? store.reset() : store.restore(1);
		await vi.waitFor(() => expect(api.listRevisions).toHaveBeenCalledTimes(1));
		expect(store.revisions.filter(candidate => candidate.status === 'draft')).toEqual([nextDraft]);
		expect(store.revisions.some(candidate => candidate.id === 'draft-1')).toBe(false);
		history.resolve({ revisions: authoritativeHistory });
		await pending;

		expect(store.revisions).toEqual(authoritativeHistory);
		expect(store.revisions[1]?.updated_at).toBe('2026-07-31T03:00:00.000Z');
	});

	it('ignores an older authoritative history refresh after a newer save', async () => {
		const store = await selectDraft();
		const firstHistory = deferred<{ revisions: DocumentTemplateRevision[] }>();
		const firstDraft = revision({ id: 'draft-first', revision_no: 3, status: 'draft' });
		const secondDraft = revision({ id: 'draft-second', revision_no: 4, status: 'draft' });
		const secondHistory = [secondDraft, structuredClone(existingPublished), structuredClone(existingArchived)];
		api.saveDraft.mockResolvedValueOnce({ version: 3, draft_revision: firstDraft });
		api.saveDraft.mockResolvedValueOnce({ version: 4, draft_revision: secondDraft });
		api.listRevisions.mockReturnValueOnce(firstHistory.promise).mockResolvedValueOnce({ revisions: secondHistory });
		store.setConfigurationPath('content.greeting', '<p>First</p>');
		const firstSave = store.saveDraft();
		await vi.waitFor(() => expect(api.listRevisions).toHaveBeenCalledTimes(1));
		store.setConfigurationPath('content.greeting', '<p>Second</p>');

		await store.saveDraft();
		firstHistory.resolve({ revisions: [firstDraft] });
		await firstSave;

		expect(store.revisions).toEqual(secondHistory);
		expect(store.detail?.version).toBe(4);
	});

	it('converts the consumed draft to published and ignores stale history after publish', async () => {
		const store = await selectDraft();
		useAuthStore().user!.role = UserRoles.MERCHANT_ADMIN;
		seedRevisionHistory(store);
		const staleHistory = deferred<{ revisions: DocumentTemplateRevision[] }>();
		api.listRevisions.mockReturnValue(staleHistory.promise);
		const historyRequest = store.loadRevisions();
		const publishedDraft = revision({
			id: 'published-draft',
			revision_no: 2,
			status: 'published',
			start_date: '2026-08-01T00:00:00.000Z',
			end_date: '2026-09-01T00:00:00.000Z',
			published_at: '2026-07-31T12:00:00.000Z',
		});
		api.publish.mockResolvedValue({ version: 3, latest_published_revision: publishedDraft });

		await store.publish();
		staleHistory.resolve({ revisions: [revision({ id: 'stale-draft', status: 'draft' })] });
		await historyRequest;

		expect(store.revisions).toEqual([publishedDraft, existingPublished, existingArchived]);
		expect(store.revisions.some(candidate => candidate.status === 'draft')).toBe(false);
		expect(store.detail?.draft_revision).toBeNull();
		expect(store.detail?.latest_published_revision).toEqual(publishedDraft);
	});

	it('keeps loading until detail then summaries settle and isolates the summary error', async () => {
		const detailRequest = deferred<DocumentTemplateDetail>();
		const summariesRequest = deferred<never>();
		api.get.mockReturnValue(detailRequest.promise);
		api.list.mockReturnValue(summariesRequest.promise);
		const store = useDocumentTemplateStore();
		const pendingDetail = store.loadDetail('email', 'order-confirmation');
		const pendingSummaries = store.loadSummaries();
		store.error = 'Current action failure';

		expect(store.loading).toBe(true);
		detailRequest.resolve(structuredClone(detail));
		await pendingDetail;
		expect(store.loading).toBe(true);
		summariesRequest.reject({ response: { data: { message: 'Summary service unavailable' } } });
		await expect(pendingSummaries).rejects.toBeTruthy();

		expect(store.loading).toBe(false);
		expect(store.summaryError).toBe('Summary service unavailable');
		expect(store.detailError).toBeNull();
		expect(store.error).toBe('Current action failure');
	});

	it('keeps loading until summaries then detail settle and isolates the detail error', async () => {
		const detailRequest = deferred<never>();
		const summariesRequest = deferred<{ document_templates: [] }>();
		api.get.mockReturnValue(detailRequest.promise);
		api.list.mockReturnValue(summariesRequest.promise);
		const store = useDocumentTemplateStore();
		const pendingDetail = store.loadDetail('email', 'order-confirmation');
		const pendingSummaries = store.loadSummaries();
		store.error = 'Current action failure';

		summariesRequest.resolve({ document_templates: [] });
		await pendingSummaries;
		expect(store.loading).toBe(true);
		detailRequest.reject({ error: { message: 'Detail service unavailable' } });
		await pendingDetail;

		expect(store.loading).toBe(false);
		expect(store.detailError).toBe('Detail service unavailable');
		expect(store.summaryError).toBeNull();
		expect(store.error).toBe('Current action failure');
	});

	it('dispose clears both load flags and invalidates their pending results', async () => {
		const detailRequest = deferred<DocumentTemplateDetail>();
		const summariesRequest = deferred<{ document_templates: [] }>();
		api.get.mockReturnValue(detailRequest.promise);
		api.list.mockReturnValue(summariesRequest.promise);
		const store = useDocumentTemplateStore();
		const pendingDetail = store.loadDetail('email', 'order-confirmation');
		const pendingSummaries = store.loadSummaries();

		store.dispose();
		expect(store.loadingDetail).toBe(false);
		expect(store.loadingSummaries).toBe(false);
		expect(store.loading).toBe(false);
		detailRequest.resolve({ ...structuredClone(detail), display_name: 'Stale detail' });
		summariesRequest.resolve({ document_templates: [] });
		await Promise.all([pendingDetail, pendingSummaries]);

		expect(store.detail).toBeNull();
		expect(store.detailError).toBeNull();
		expect(store.summaryError).toBeNull();
	});

	it('preserves a field edit made while reset is pending', async () => {
		const store = await selectDraft();
		useAuthStore().user!.role = UserRoles.MERCHANT_ADMIN;
		store.detail!.fields.push({ path: 'content.footer', label: 'Footer', kind: 'rich-text', max_length: 500, allow_blank: true, allowed_tokens: [] });
		store.setConfigurationPath('content.footer', '<p>Before reset</p>');
		const request = deferred<DocumentTemplateMutationResponse>();
		api.reset.mockReturnValue(request.promise);
		const pending = store.reset();
		store.setConfigurationPath('content.greeting', '<p>Newer local</p>');
		const serverDraft = revision({
			id: 'draft-reset',
			revision_no: 3,
			configuration: { content: { greeting: '<p>Reset baseline</p>', footer: '<p>Reset footer</p>' } },
		});
		request.resolve({ version: 3, draft_revision: serverDraft });

		await pending;

		expect(store.baseline).toEqual(serverDraft.configuration);
		expect(store.draft.content?.greeting).toBe('<p>Newer local</p>');
		expect(store.draft.content?.footer).toBe('<p>Reset footer</p>');
		expect(store.detail?.version).toBe(3);
		expect(store.isDirty).toBe(true);
	});

	it('does not restore untouched fields when reset removes their entire section', async () => {
		const store = await selectDraft();
		useAuthStore().user!.role = UserRoles.MERCHANT_ADMIN;
		store.detail!.fields.push({ path: 'content.footer', label: 'Footer', kind: 'rich-text', max_length: 500, allow_blank: true, allowed_tokens: [] });
		store.setConfigurationPath('content.footer', '<p>Before reset</p>');
		const request = deferred<DocumentTemplateMutationResponse>();
		api.reset.mockReturnValue(request.promise);
		const pending = store.reset();
		store.setConfigurationPath('content.greeting', '<p>Newer local</p>');
		const serverDraft = revision({ id: 'draft-reset', revision_no: 3, configuration: {} });
		request.resolve({ version: 3, draft_revision: serverDraft });

		await pending;

		expect(store.baseline).toEqual({});
		expect(store.draft).toEqual({ content: { greeting: '<p>Newer local</p>' } });
		expect(store.isDirty).toBe(true);
	});

	it('preserves a block edit made while restore is pending', async () => {
		const store = await selectDraft();
		useAuthStore().user!.role = UserRoles.MERCHANT_ADMIN;
		store.detail!.blocks.push({ id: 'footer', label: 'Footer', required: false, default_enabled: true });
		store.setBlockEnabled('footer', true);
		const request = deferred<DocumentTemplateMutationResponse>();
		api.restore.mockReturnValue(request.promise);
		const pending = store.restore(1);
		store.setBlockEnabled('footer', false);
		const serverDraft = revision({
			id: 'draft-restore',
			revision_no: 3,
			configuration: {
				blocks: [
					{ id: 'order-items', enabled: true, props: {} },
					{ id: 'footer', enabled: true, props: {} },
					{ id: 'server-added', enabled: true, props: {} },
				],
			},
		});
		request.resolve({ version: 3, draft_revision: serverDraft });

		await pending;

		expect(store.baseline).toEqual(serverDraft.configuration);
		expect(store.draft.blocks?.find(block => block.id === 'footer')?.enabled).toBe(false);
		expect(store.draft.blocks?.find(block => block.id === 'server-added')?.enabled).toBe(true);
		expect(store.detail?.draft_revision).toEqual(serverDraft);
		expect(store.isDirty).toBe(true);
	});

	it.each([
		['reset', (store: ReturnType<typeof useDocumentTemplateStore>) => store.reset()],
		['restore', (store: ReturnType<typeof useDocumentTemplateStore>) => store.restore(1)],
	] as const)('replaces a clean draft after %s succeeds', async (_name, mutate) => {
		const store = await selectDraft();
		useAuthStore().user!.role = UserRoles.MERCHANT_ADMIN;
		const serverDraft = revision({ id: 'draft-next', revision_no: 3, configuration: { content: { greeting: '<p>Server baseline</p>' } } });
		const response = { version: 3, draft_revision: serverDraft };
		api.reset.mockResolvedValue(response);
		api.restore.mockResolvedValue(response);

		await mutate(store);

		expect(store.draft).toEqual(serverDraft.configuration);
		expect(store.baseline).toEqual(serverDraft.configuration);
		expect(store.isDirty).toBe(false);
	});

	it('extracts action messages and safe field errors from nested API envelopes', async () => {
		const store = await selectDraft();
		store.setConfigurationPath('content.greeting', '<p>Changed</p>');
		api.saveDraft.mockRejectedValue({
			metadata: { request_id: 'transport-1' },
			response: {
				data: {
					message: 'Nested validation failed',
					metadata: { field_errors: { 'content.greeting': 'Greeting is invalid', ignored: { nested: true } } },
				},
			},
		});

		await store.saveDraft();

		expect(store.error).toBe('Nested validation failed');
		expect(store.fieldErrors).toEqual({ 'content.greeting': 'Greeting is invalid' });
	});

	it('uses readable plain-object messages and never stringifies unknown objects', async () => {
		const store = await selectDraft();
		api.testSend.mockRejectedValueOnce({ message: 'Plain API failure' });
		await store.testSend();
		expect(store.error).toBe('Plain API failure');

		api.testSend.mockRejectedValueOnce({ unexpected: { value: true } });
		await store.testSend();
		expect(store.error).toBe('Failed to send test document template');
		expect(store.error).not.toBe('[object Object]');
	});

	it('handles invalid dates and distinguishes sparse arrays from length and undefined changes', () => {
		const store = useDocumentTemplateStore();
		const invalidDate = new Date(Number.NaN) as unknown as string;
		store.baseline = { content: { greeting: invalidDate } };
		store.draft = { content: { greeting: invalidDate } };
		expect(() => store.refreshDirty()).not.toThrow();
		expect(store.isDirty).toBe(false);

		store.baseline = { blocks: [] };
		store.draft = { blocks: new Array(1) } as DocumentTemplateConfiguration;
		store.refreshDirty();
		expect(store.isDirty).toBe(true);

		store.baseline = { blocks: new Array(1) } as DocumentTemplateConfiguration;
		store.draft = { blocks: [undefined] } as unknown as DocumentTemplateConfiguration;
		store.refreshDirty();
		expect(store.isDirty).toBe(true);
	});

	it('clears and revokes the previous PDF when a replacement response is invalid', async () => {
		const createObjectURL = vi.fn(() => 'blob:preview-1');
		const revokeObjectURL = vi.fn();
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
		api.get.mockResolvedValue({ ...detail, channel: 'pdf' });
		api.previewPdf.mockResolvedValueOnce(new Blob(['first']));
		api.previewPdf.mockResolvedValueOnce({ not: 'a blob' });
		const store = useDocumentTemplateStore();
		await store.loadDetail('pdf', 'order-confirmation');
		await store.previewDraft();

		await store.previewDraft();

		expect(store.preview).toBeNull();
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
		expect(store.error).toBe('Invalid PDF preview response');
	});

	it('clears and revokes the previous PDF when its replacement request rejects', async () => {
		const revokeObjectURL = vi.fn();
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview-1') });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
		api.get.mockResolvedValue({ ...detail, channel: 'pdf' });
		api.previewPdf.mockResolvedValueOnce(new Blob(['first']));
		api.previewPdf.mockRejectedValueOnce(new Error('Replacement failed'));
		const store = useDocumentTemplateStore();
		await store.loadDetail('pdf', 'order-confirmation');
		await store.previewDraft();

		await store.previewDraft();

		expect(store.preview).toBeNull();
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
		expect(store.error).toBe('Replacement failed');
	});

	it('accepts a real PDF Blob when the global Blob constructor is unavailable', async () => {
		const pdf = new Blob(['pdf']);
		Object.defineProperty(globalThis, 'Blob', { configurable: true, value: undefined });
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') });
		api.get.mockResolvedValue({ ...detail, channel: 'pdf' });
		api.previewPdf.mockResolvedValue(pdf);
		const store = useDocumentTemplateStore();
		await store.loadDetail('pdf', 'order-confirmation');

		await store.previewDraft();

		expect(store.preview).toMatchObject({ channel: 'pdf', blob: pdf, objectUrl: 'blob:preview' });
	});

	it('rejects a non-Blob PDF response when the global Blob constructor is unavailable', async () => {
		Object.defineProperty(globalThis, 'Blob', { configurable: true, value: undefined });
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') });
		api.get.mockResolvedValue({ ...detail, channel: 'pdf' });
		api.previewPdf.mockResolvedValue({ not: 'a blob' });
		const store = useDocumentTemplateStore();
		await store.loadDetail('pdf', 'order-confirmation');

		await store.previewDraft();

		expect(store.preview).toBeNull();
		expect(store.error).toBe('Invalid PDF preview response');
	});

	it('rejects a duck-typed Blob spoof when the global Blob constructor is unavailable', async () => {
		Object.defineProperty(globalThis, 'Blob', { configurable: true, value: undefined });
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:preview') });
		api.get.mockResolvedValue({ ...detail, channel: 'pdf' });
		api.previewPdf.mockResolvedValue({
			size: 3,
			type: 'application/pdf',
			arrayBuffer: vi.fn(),
			slice: vi.fn(),
			stream: vi.fn(),
			text: vi.fn(),
			[Symbol.toStringTag]: 'Blob',
		});
		const store = useDocumentTemplateStore();
		await store.loadDetail('pdf', 'order-confirmation');

		await store.previewDraft();

		expect(store.preview).toBeNull();
		expect(store.error).toBe('Invalid PDF preview response');
	});

	it('fails safely and clears the prior PDF when object URL APIs are missing', async () => {
		const revokeObjectURL = vi.fn();
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:first') });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
		api.get.mockResolvedValue({ ...detail, channel: 'pdf' });
		api.previewPdf.mockResolvedValue(new Blob(['pdf']));
		const store = useDocumentTemplateStore();
		await store.loadDetail('pdf', 'order-confirmation');
		await store.previewDraft();
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: undefined });

		await store.previewDraft();

		expect(store.preview).toBeNull();
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:first');
		expect(store.error).toBe('PDF previews are unavailable in this environment');
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: undefined });
		expect(() => store.clearPreview()).not.toThrow();
	});

	it('never creates PDF object URLs when the runtime cannot revoke them', async () => {
		const createObjectURL = vi.fn(() => 'blob:leaked');
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: undefined });
		api.get.mockResolvedValue({ ...detail, channel: 'pdf' });
		api.previewPdf.mockResolvedValue(new Blob(['pdf']));
		const store = useDocumentTemplateStore();
		await store.loadDetail('pdf', 'order-confirmation');

		await store.previewDraft();
		store.clearPreview();
		await store.previewDraft();

		expect(createObjectURL).not.toHaveBeenCalled();
		expect(store.preview).toBeNull();
		expect(store.error).toBe('PDF previews are unavailable in this environment');
	});
});
