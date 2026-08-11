import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { UserRoles } from 'yeppi-common';
import { useAuthStore } from '../../app/stores/Auth/Auth';
import { EMAIL_PREVIEW_DEBOUNCE_MS, useDocumentTemplateStore } from '../../app/stores/DocumentTemplate/DocumentTemplate';
import type { DocumentTemplateDetail, DocumentTemplateRevision } from '../../app/utils/types/document-template';
import type { DocumentTemplateMutationResp } from '../../app/repository/modules/document-template/models/response/mutation.resp';

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

const baseDetail: DocumentTemplateDetail = {
	template_code: 'order-confirmation',
	channel: 'email',
	display_name: 'Order confirmation',
	category: 'customer',
	editable: true,
	version: 2,
	catalog_schema_version: 1,
	catalog_system_template_version: 1,
	fields: [
		{ path: 'content.greeting', label: 'Greeting', kind: 'rich-text', max_length: 500, allow_blank: true, allowed_tokens: ['{{customer.name}}'] },
	],
	blocks: [{ id: 'order-items', label: 'Order items', required: true, default_enabled: true }],
	allowed_tokens: ['{{customer.name}}'],
	configuration: { content: { greeting: '<p>Welcome</p>' }, blocks: [{ id: 'order-items', enabled: true, props: {} }] },
	inherited_values: { merchantInfo: { companyName: 'Aster Home' } },
	catalog_default_values: { brand: { primaryColor: '#EE7F01' } },
	effective_preview_values: { merchantInfo: { companyName: 'Aster Home' } },
	draft_revision: {
		id: 'draft-1',
		revision_no: 2,
		status: 'draft',
		schema_version: 1,
		system_template_version: 1,
		created_by: null,
		start_date: null,
		end_date: null,
		published_at: null,
		created_at: '2026-07-31T00:00:00.000Z',
		configuration: { content: { greeting: '<p>Welcome</p>' }, blocks: [{ id: 'order-items', enabled: true, props: {} }] },
	},
	latest_published_revision: null,
	active_revision: null,
};

const originalBlobDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Blob');
const originalCreateObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeObjectUrlDescriptor = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

function restoreProperty(target: object, key: PropertyKey, descriptor: PropertyDescriptor | undefined): void {
	if (descriptor) Object.defineProperty(target, key, descriptor);
	else Reflect.deleteProperty(target, key);
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

function revision(overrides: Partial<DocumentTemplateRevision> = {}): DocumentTemplateRevision {
	return {
		...structuredClone(baseDetail.draft_revision!),
		...overrides,
		configuration: overrides.configuration ?? structuredClone(baseDetail.draft_revision!.configuration),
	};
}

const publishedRevision = revision({
	id: 'published-1',
	revision_no: 1,
	status: 'published',
	published_at: '2026-07-30T00:00:00.000Z',
});

describe('useDocumentTemplateStore editing session', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		Object.values(api).forEach(mock => mock.mockReset());
		api.list.mockResolvedValue({ document_templates: [] });
		api.get.mockResolvedValue(structuredClone(baseDetail));
		api.previewEmail.mockResolvedValue({ html: '<p>Preview</p>', subject: 'Preview', revision_id: null, revision_no: null });
		api.listRevisions.mockResolvedValue({ revisions: [] });
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({ $api: { documentTemplate: api } });
		useAuthStore().user = {
			id: 'staff-1',
			role: UserRoles.MERCHANT_STAFF,
			email_address: 'staff@example.test',
			name: 'Staff',
			dial_code: '+60',
			phone_no: '123456789',
		};
	});

	afterEach(() => {
		useDocumentTemplateStore().dispose();
		restoreProperty(globalThis, 'Blob', originalBlobDescriptor);
		restoreProperty(URL, 'createObjectURL', originalCreateObjectUrlDescriptor);
		restoreProperty(URL, 'revokeObjectURL', originalRevokeObjectUrlDescriptor);
		vi.useRealTimers();
	});

	async function openEmail() {
		const store = useDocumentTemplateStore();
		await store.openTemplate('email', 'order-confirmation');
		return store;
	}

	function grantAdministration(): void {
		useAuthStore().user!.role = UserRoles.MERCHANT_ADMIN;
	}

	async function publishDraft(store: ReturnType<typeof useDocumentTemplateStore>, startDate: Date | null = null, endDate: Date | null = null) {
		const preparation = store.preparePublish({ startDate, endDate });
		return preparation.status === 'ready' ? await store.confirmPublish(preparation.intent) : 'failed';
	}

	it('exposes semantic state and intent without implementation controls', () => {
		const store = useDocumentTemplateStore();

		expect(Object.keys(store)).not.toEqual(expect.arrayContaining([
			'generation',
			'selectionEpoch',
			'editGeneration',
			'mutationGeneration',
			'summariesGeneration',
			'saveGeneration',
			'previewGeneration',
			'publishGeneration',
			'revisionsGeneration',
			'testGeneration',
			'previewedConfigurationKey',
		]));
		for (const key of ['loadDetail', 'loadRevisions', 'previewDraft', 'configurationForRequest', 'publish', 'reset', 'clearPreview']) {
			expect(store).not.toHaveProperty(key);
		}
	});

	it('opens a Document Template with authoritative detail and initial preview', async () => {
		const store = await openEmail();

		expect(store.selected).toEqual({ channel: 'email', templateCode: 'order-confirmation' });
		expect(store.detail?.template_code).toBe('order-confirmation');
		expect(store.preview).toEqual({ channel: 'email', html: '<p>Preview</p>', subject: 'Preview', revisionId: null, revisionNo: null });
	});

	it('keeps only the newest selection across A-B-A detail races', async () => {
		const first = deferred<DocumentTemplateDetail>();
		api.get
			.mockReturnValueOnce(first.promise)
			.mockResolvedValueOnce({ ...structuredClone(baseDetail), template_code: 'invoice' })
			.mockResolvedValueOnce({ ...structuredClone(baseDetail), display_name: 'Fresh order confirmation' });
		const store = useDocumentTemplateStore();

		const firstOpen = store.openTemplate('email', 'order-confirmation');
		await store.openTemplate('email', 'invoice');
		const finalOpen = store.openTemplate('email', 'order-confirmation');
		first.resolve({ ...structuredClone(baseDetail), display_name: 'Stale order confirmation' });
		await Promise.all([firstOpen, finalOpen]);

		expect(store.selected).toEqual({ channel: 'email', templateCode: 'order-confirmation' });
		expect(store.detail?.display_name).toBe('Fresh order confirmation');
		expect(api.previewEmail).toHaveBeenCalledTimes(2);
	});

	it('disposes pending catalog, detail, and preview work without resurfacing state', async () => {
		const catalog = deferred<{ document_templates: [] }>();
		const detail = deferred<DocumentTemplateDetail>();
		api.list.mockReturnValue(catalog.promise);
		api.get.mockReturnValue(detail.promise);
		const store = useDocumentTemplateStore();
		const loadingCatalog = store.loadCatalog();
		const opening = store.openTemplate('email', 'order-confirmation');

		store.dispose();
		catalog.resolve({ document_templates: [] });
		detail.resolve(structuredClone(baseDetail));
		await Promise.all([loadingCatalog, opening]);

		expect(store.loading).toBe(false);
		expect(store.selected).toBeNull();
		expect(store.detail).toBeNull();
		expect(store.preview).toBeNull();
		expect(api.previewEmail).not.toHaveBeenCalled();
	});

	it('keeps edits dirty until explicit save succeeds', async () => {
		const store = await openEmail();
		const saved = revision({ revision_no: 3, configuration: { content: { greeting: '<p>Hello</p>' } } });
		api.saveDraft.mockResolvedValue({ version: 3, draft_revision: saved });

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

	it('allows clearing required content while exposing a semantic field error', async () => {
		api.get.mockResolvedValue({
			...structuredClone(baseDetail),
			fields: [
				...baseDetail.fields,
				{ path: 'content.subject', label: 'Subject', kind: 'plain-text', max_length: 200, allow_blank: false, allowed_tokens: [] },
			],
		});
		const store = await openEmail();

		store.setConfigurationPath('content.subject', 'Invoice');
		store.setConfigurationPath('content.subject', '');

		expect(store.draft.content?.subject).toBe('');
		expect(store.fieldErrors['content.subject']).toBe('Subject cannot be blank');
		expect(store.isDirty).toBe(true);
	});

	it('preserves edits made while save is pending', async () => {
		const store = await openEmail();
		const saving = deferred<{ version: number; draft_revision: DocumentTemplateRevision }>();
		api.saveDraft.mockReturnValue(saving.promise);
		store.setConfigurationPath('content.greeting', '<p>Saved</p>');
		const pending = store.saveDraft();
		store.setConfigurationPath('content.greeting', '<p>Newer local</p>');
		saving.resolve({ version: 3, draft_revision: revision({ revision_no: 3, configuration: { content: { greeting: '<p>Saved</p>' } } }) });

		await pending;

		expect(store.draft.content?.greeting).toBe('<p>Newer local</p>');
		expect(store.isDirty).toBe(true);
		expect(store.detail?.version).toBe(3);
	});

	it('preserves field edits made while reset is pending', async () => {
		api.get.mockResolvedValue({
			...structuredClone(baseDetail),
			fields: [
				...baseDetail.fields,
				{ path: 'content.footer', label: 'Footer', kind: 'rich-text', max_length: 500, allow_blank: true, allowed_tokens: [] },
			],
		});
		const store = await openEmail();
		grantAdministration();
		store.setConfigurationPath('content.footer', '<p>Before reset</p>');
		const intent = store.prepareReset()!;
		const resetting = deferred<DocumentTemplateMutationResp>();
		api.reset.mockReturnValue(resetting.promise);
		const pending = store.confirmReset(intent);
		store.setConfigurationPath('content.greeting', '<p>Newer local</p>');
		const serverDraft = revision({
			id: 'draft-reset',
			revision_no: 3,
			configuration: { content: { greeting: '<p>Reset baseline</p>', footer: '<p>Reset footer</p>' } },
		});
		resetting.resolve({ version: 3, draft_revision: serverDraft });

		await pending;

		expect(store.draft.content).toEqual({ greeting: '<p>Newer local</p>', footer: '<p>Reset footer</p>' });
		expect(store.isDirty).toBe(true);
	});

	it('preserves block edits made while restore is pending', async () => {
		api.get.mockResolvedValue({
			...structuredClone(baseDetail),
			blocks: [...baseDetail.blocks, { id: 'footer', label: 'Footer', required: false, default_enabled: true }],
		});
		const store = await openEmail();
		grantAdministration();
		store.setBlockEnabled('footer', true);
		const restoring = deferred<DocumentTemplateMutationResp>();
		api.restore.mockReturnValue(restoring.promise);
		const pending = store.restoreRevision(1);
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
		restoring.resolve({ version: 3, draft_revision: serverDraft });

		await pending;

		expect(store.draft.blocks?.find(block => block.id === 'footer')?.enabled).toBe(false);
		expect(store.draft.blocks?.find(block => block.id === 'server-added')?.enabled).toBe(true);
		expect(store.isDirty).toBe(true);
	});

	it('preserves local edits and exposes reload intent after a 409 conflict', async () => {
		const store = await openEmail();
		store.setConfigurationPath('content.greeting', '<p>Local</p>');
		api.saveDraft.mockRejectedValue({ response: { data: { statusCode: 409, metadata: { current_version: 4 } } } });

		await store.saveDraft();

		expect(store.conflict).toEqual({ currentVersion: 4 });
		expect(store.draft.content?.greeting).toBe('<p>Local</p>');
		api.get.mockResolvedValue({ ...structuredClone(baseDetail), version: 4 });
		await store.reloadServerVersion();
		expect(store.detail?.version).toBe(4);
		expect(store.conflict).toBeNull();
	});

	it('coalesces email edits into one latest preview request', async () => {
		const store = await openEmail();
		api.previewEmail.mockClear();
		api.previewEmail.mockResolvedValue({ html: '<p>Latest</p>', subject: 'Latest', revision_id: null, revision_no: null });
		vi.useFakeTimers();

		store.setConfigurationPath('content.greeting', '<p>First</p>');
		store.setConfigurationPath('content.greeting', '<p>Latest</p>');
		await vi.advanceTimersByTimeAsync(EMAIL_PREVIEW_DEBOUNCE_MS - 1);
		expect(api.previewEmail).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);

		expect(api.previewEmail).toHaveBeenCalledOnce();
		expect(api.previewEmail).toHaveBeenCalledWith('email', 'order-confirmation', {
			configuration: {
				content: { greeting: '<p>Latest</p>' },
				blocks: [{ id: 'order-items', enabled: true, props: {} }],
			},
		});
	});

	it('keeps the newest overlapping email preview response', async () => {
		const store = await openEmail();
		const older = deferred<{ html: string; subject: string; revision_id: null; revision_no: null }>();
		const newer = deferred<{ html: string; subject: string; revision_id: null; revision_no: null }>();
		api.previewEmail.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);

		const olderPreview = store.refreshPreview();
		const newerPreview = store.refreshPreview();
		newer.resolve({ html: '<p>Newest</p>', subject: 'Newest', revision_id: null, revision_no: null });
		await newerPreview;
		older.resolve({ html: '<p>Older</p>', subject: 'Older', revision_id: null, revision_no: null });
		await olderPreview;

		expect(store.preview).toMatchObject({ channel: 'email', html: '<p>Newest</p>', subject: 'Newest' });
	});

	it('rejects an in-flight dirty preview after the edit returns to baseline', async () => {
		const store = await openEmail();
		const dirtyPreview = deferred<{ html: string; subject: string; revision_id: null; revision_no: null }>();
		api.previewEmail.mockReturnValueOnce(dirtyPreview.promise);
		vi.useFakeTimers();

		store.setConfigurationPath('content.greeting', '<p>Dirty</p>');
		await vi.advanceTimersByTimeAsync(EMAIL_PREVIEW_DEBOUNCE_MS);
		store.setConfigurationPath('content.greeting', '<p>Welcome</p>');
		dirtyPreview.resolve({ html: '<p>Dirty preview</p>', subject: 'Dirty', revision_id: null, revision_no: null });
		await Promise.resolve();
		await Promise.resolve();

		expect(store.isDirty).toBe(false);
		expect(store.preview).toMatchObject({ channel: 'email', html: '<p>Preview</p>', subject: 'Preview' });
	});

	it('marks a retained PDF preview outdated without automatically rendering another PDF', async () => {
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:pdf') });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
		api.get.mockResolvedValue({ ...structuredClone(baseDetail), channel: 'pdf' });
		api.previewPdf.mockResolvedValue(new Blob(['pdf']));
		const store = useDocumentTemplateStore();
		await store.openTemplate('pdf', 'order-confirmation');
		api.previewPdf.mockClear();

		store.setConfigurationPath('content.greeting', '<p>Changed</p>');

		expect(store.preview).toMatchObject({ channel: 'pdf', objectUrl: 'blob:pdf' });
		expect(store.previewStale).toBe(true);
		expect(api.previewPdf).not.toHaveBeenCalled();
	});

	it('replaces and revokes PDF Blob URLs on refresh and disposal', async () => {
		const createObjectURL = vi.fn().mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second');
		const revokeObjectURL = vi.fn();
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
		api.get.mockResolvedValue({ ...structuredClone(baseDetail), channel: 'pdf' });
		api.previewPdf.mockResolvedValue(new Blob(['pdf']));
		const store = useDocumentTemplateStore();
		await store.openTemplate('pdf', 'order-confirmation');

		await store.refreshPreview();
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:first');
		store.dispose();
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:second');
	});

	it('keeps the previous PDF when a replacement is invalid', async () => {
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:first') });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
		api.get.mockResolvedValue({ ...structuredClone(baseDetail), channel: 'pdf' });
		api.previewPdf.mockResolvedValueOnce(new Blob(['first'])).mockResolvedValueOnce({ not: 'a blob' });
		const store = useDocumentTemplateStore();
		await store.openTemplate('pdf', 'order-confirmation');

		await store.refreshPreview();

		expect(store.preview).toMatchObject({ channel: 'pdf', objectUrl: 'blob:first' });
		expect(store.previewStale).toBe(true);
		expect(store.error).toBe('Invalid PDF preview response');
	});

	it('does not create a PDF URL when revocation is unavailable', async () => {
		const createObjectURL = vi.fn(() => 'blob:leaked');
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: undefined });
		api.get.mockResolvedValue({ ...structuredClone(baseDetail), channel: 'pdf' });
		api.previewPdf.mockResolvedValue(new Blob(['pdf']));
		const store = useDocumentTemplateStore();

		await store.openTemplate('pdf', 'order-confirmation');

		expect(createObjectURL).not.toHaveBeenCalled();
		expect(store.preview).toBeNull();
		expect(store.error).toBe('PDF previews are unavailable in this environment');
	});

	it('prepares an immutable publication intent and converts local dates to UTC', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-31T00:00:00.000Z'));
		const store = await openEmail();
		grantAdministration();
		const startDate = new Date('2026-08-01T08:00:00+08:00');
		const endDate = new Date('2026-08-07T08:00:00+08:00');

		const preparation = store.preparePublish({ startDate, endDate });
		startDate.setUTCFullYear(2030);
		endDate.setUTCFullYear(2030);

		expect(preparation).toEqual({
			status: 'ready',
			scheduled: true,
			intent: {
				channel: 'email',
				templateCode: 'order-confirmation',
				revisionId: 'draft-1',
				revisionNo: 2,
				startDate: new Date('2026-08-01T00:00:00.000Z'),
				endDate: new Date('2026-08-07T00:00:00.000Z'),
			},
		});
	});

	it('publishes the prepared activation snapshot when intent dates are mutated later', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-31T00:00:00.000Z'));
		const store = await openEmail();
		grantAdministration();
		const published = revision({ id: 'published-now', status: 'published', published_at: '2026-08-01T00:00:00.000Z' });
		api.publish.mockResolvedValue({ version: 3, latest_published_revision: published });
		const prepared = store.preparePublish({
			startDate: new Date('2026-08-01T08:00:00+08:00'),
			endDate: new Date('2026-08-07T08:00:00+08:00'),
		});
		if (prepared.status !== 'ready') throw new Error('Expected publication intent');

		prepared.intent.startDate!.setUTCFullYear(2030);
		prepared.intent.endDate!.setUTCFullYear(2030);
		await store.confirmPublish(prepared.intent);

		expect(api.publish).toHaveBeenCalledWith('email', 'order-confirmation', {
			version: 2,
			revision_no: 2,
			start_date: '2026-08-01T00:00:00.000Z',
			end_date: '2026-08-07T00:00:00.000Z',
		});
	});

	it.each([
		[{ startDate: new Date('invalid'), endDate: null }, 'Schedule date is invalid'],
		[{ startDate: new Date('2026-08-02T00:00:00.000Z'), endDate: new Date('2026-08-01T00:00:00.000Z') }, 'Schedule start must be before its end'],
		[{ startDate: null, endDate: new Date('2026-07-30T00:00:00.000Z') }, 'Schedule end must be in the future'],
	] as const)('rejects invalid publication windows through semantic errors', async (window, message) => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-31T00:00:00.000Z'));
		const store = await openEmail();
		grantAdministration();

		expect(store.preparePublish(window)).toEqual({ status: 'rejected' });
		expect(store.error).toBe(message);
	});

	it('rejects dirty, stale, and expired publication confirmation without transport', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-07-31T00:00:00.000Z'));
		const store = await openEmail();
		grantAdministration();
		store.setConfigurationPath('content.greeting', '<p>Dirty</p>');
		expect(store.preparePublish({ startDate: null, endDate: null })).toEqual({ status: 'rejected' });
		expect(store.error).toBe('Save draft before publishing');

		api.get.mockResolvedValue(structuredClone(baseDetail));
		await store.openTemplate('email', 'order-confirmation');
		const prepared = store.preparePublish({ startDate: null, endDate: new Date('2026-08-01T00:00:00.000Z') });
		expect(prepared.status).toBe('ready');
		vi.setSystemTime(new Date('2026-08-02T00:00:00.000Z'));
		const outcome = prepared.status === 'ready' ? await store.confirmPublish(prepared.intent) : 'stale';

		expect(outcome).toBe('failed');
		expect(api.publish).not.toHaveBeenCalled();
	});

	it('publishes the exact saved revision and adopts its authoritative configuration', async () => {
		const store = await openEmail();
		grantAdministration();
		const published = revision({
			id: 'published-now',
			status: 'published',
			configuration: { content: { greeting: '<p>Published</p>' }, brand: { primaryColor: '#123456' } },
		});
		api.publish.mockResolvedValue({ version: 3, latest_published_revision: published });

		expect(await publishDraft(store)).toBe('completed');

		expect(api.publish).toHaveBeenCalledWith('email', 'order-confirmation', {
			version: 2,
			revision_no: 2,
			start_date: null,
			end_date: null,
		});
		expect(store.detail?.draft_revision).toBeNull();
		expect(store.detail?.active_revision).toEqual(published);
		expect(store.draft).toEqual(published.configuration);
		expect(store.isDirty).toBe(false);
	});

	it('rejects reset confirmation after the authoritative version changes', async () => {
		const store = await openEmail();
		grantAdministration();
		const intent = store.prepareReset()!;
		api.get.mockResolvedValue({ ...structuredClone(baseDetail), version: 3 });
		await store.openTemplate('email', 'order-confirmation');

		expect(await store.confirmReset(intent)).toBe('stale');
		expect(api.reset).not.toHaveBeenCalled();
	});

	it('completes reset with authoritative history and refreshed preview', async () => {
		const store = await openEmail();
		grantAdministration();
		const resetDraft = revision({ id: 'draft-reset', revision_no: 3, configuration: {} });
		api.reset.mockResolvedValue({ version: 3, draft_revision: resetDraft });
		api.listRevisions.mockResolvedValue({ revisions: [resetDraft, publishedRevision] });
		api.previewEmail.mockResolvedValue({ html: '<p>Reset</p>', subject: 'Reset', revision_id: resetDraft.id, revision_no: 3 });

		const outcome = await store.confirmReset(store.prepareReset()!);

		expect(outcome).toBe('completed');
		expect(store.revisions).toEqual([resetDraft, publishedRevision]);
		expect(store.draft).toEqual({});
		expect(store.isDirty).toBe(false);
		expect(store.preview).toMatchObject({ channel: 'email', html: '<p>Reset</p>' });
	});

	it('isolates catalog and detail loading failures while preserving semantic messages', async () => {
		const catalog = deferred<never>();
		const detail = deferred<never>();
		api.list.mockReturnValue(catalog.promise);
		api.get.mockReturnValue(detail.promise);
		const store = useDocumentTemplateStore();
		const loadingCatalog = store.loadCatalog();
		const opening = store.openTemplate('email', 'order-confirmation');
		expect(store.loading).toBe(true);

		detail.reject({ response: { data: { message: 'Detail unavailable' } } });
		await opening;
		expect(store.loading).toBe(true);
		catalog.reject({ response: { data: { message: 'Catalog unavailable' } } });
		await expect(loadingCatalog).rejects.toBeTruthy();

		expect(store.loading).toBe(false);
		expect(store.detailError).toBe('Detail unavailable');
		expect(store.summaryError).toBe('Catalog unavailable');
	});

	it('extracts safe action and field errors without stringifying unknown objects', async () => {
		const store = await openEmail();
		store.setConfigurationPath('content.greeting', '<p>Changed</p>');
		api.saveDraft.mockRejectedValue({
			response: {
				data: {
					message: 'Nested validation failed',
					metadata: { field_errors: { 'content.greeting': 'Greeting is invalid', 'ignored': { nested: true } } },
				},
			},
		});

		await store.saveDraft();

		expect(store.error).toBe('Nested validation failed');
		expect(store.fieldErrors).toEqual({ 'content.greeting': 'Greeting is invalid' });
		api.testSend.mockRejectedValue({ unexpected: { value: true } });
		await store.sendTest();
		expect(store.error).toBe('Failed to send test document template');
	});

	it('never exposes administration actions to staff', async () => {
		const store = await openEmail();

		expect(store.canEdit).toBe(true);
		expect(store.canPublish).toBe(false);
		expect(store.preparePublish({ startDate: null, endDate: null })).toEqual({ status: 'rejected' });
		expect(store.prepareReset()).toBeNull();
	});
});
