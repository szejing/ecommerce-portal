import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { UserRoles } from 'yeppi-common';
import { useAuthStore } from '../../app/stores/Auth/Auth';
import { useDocumentTemplateStore } from '../../app/stores/DocumentTemplate/DocumentTemplate';
import type { DocumentTemplateDetail } from '../../app/utils/types/document-template';

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
	fields: [{ path: 'content.greeting', label: 'Greeting', kind: 'rich-text', max_length: 500, allow_blank: true, allowed_tokens: ['{{customer.name}}'] }],
	blocks: [{ id: 'order-items', label: 'Order items', required: true, default_enabled: true }],
	allowed_tokens: ['{{customer.name}}'],
	configuration: { content: { greeting: '<p>Welcome</p>' }, blocks: [{ id: 'order-items', enabled: true, props: {} }] },
	inherited_values: { merchantInfo: { companyName: 'Aster Home' } },
	effective_preview_values: { merchantInfo: { companyName: 'Aster Home' } },
	draft_revision: {
		id: 'draft-1', revision_no: 2, status: 'draft', schema_version: 1, system_template_version: 1,
		start_date: null, end_date: null, published_at: null, created_at: '2026-07-31T00:00:00.000Z',
		configuration: { content: { greeting: '<p>Welcome</p>' }, blocks: [{ id: 'order-items', enabled: true, props: {} }] },
	},
	latest_published_revision: null,
	active_revision: null,
};

describe('useDocumentTemplateStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		Object.values(api).forEach(mock => mock.mockReset());
		api.get.mockResolvedValue(structuredClone(detail));
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({ $api: { documentTemplate: api } });
		useAuthStore().user = { id: 'staff-1', role: UserRoles.MERCHANT_STAFF, email_address: 'staff@example.test', name: 'Staff', dial_code: '+60', phone_no: '123456789' };
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
		api.saveDraft.mockRejectedValue({ statusCode: 409, metadata: { current_version: 4 } });

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
});
