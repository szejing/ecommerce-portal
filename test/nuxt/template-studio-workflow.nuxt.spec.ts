import type { Pinia } from 'pinia';
import { setActivePinia } from 'pinia';
import { defineComponent, h, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { KEY, UserRoles } from 'yeppi-common';
import { NuxtPage } from '#components';
import ActivationWindow from '~/components/Z/TemplateStudio/ActivationWindow.vue';
import ContentEditor from '~/components/Z/TemplateStudio/ContentEditor.vue';
import RevisionHistory from '~/components/Z/TemplateStudio/RevisionHistory.vue';
import SectionEditor from '~/components/Z/TemplateStudio/SectionEditor.vue';
import TemplateEditor from '~/components/Z/TemplateStudio/TemplateEditor.vue';
import TemplatePreview from '~/components/Z/TemplateStudio/TemplatePreview.vue';
import { useAuthStore } from '~/stores/Auth/Auth';
import {
	useDocumentTemplateStore,
	type EmailPreview,
	type PdfPreview,
} from '~/stores/DocumentTemplate/DocumentTemplate';
import type {
	DocumentTemplateDetail,
	DocumentTemplateRevision,
	DocumentTemplateSummary,
} from '~/utils/types/document-template';

const overlayMocks = vi.hoisted(() => ({
	open: vi.fn(),
	close: vi.fn(),
	create: vi.fn(),
	props: undefined as undefined | {
		title?: string;
		message?: string;
		onConfirm?: () => Promise<void> | void;
		onCancel?: () => void;
	},
}));

mockNuxtImport('useOverlay', () => () => ({
	create: overlayMocks.create.mockImplementation((_component, options?: { props?: typeof overlayMocks.props }) => {
		overlayMocks.props = options?.props;
		return { open: overlayMocks.open, close: overlayMocks.close };
	}),
}));

const emailPreview: EmailPreview = {
	channel: 'email',
	html: '<html><head></head><body><h1>Invoice</h1></body></html>',
	subject: 'Invoice INV-1',
	revisionId: null,
	revisionNo: null,
};

const pdfPreview: PdfPreview = {
	channel: 'pdf',
	blob: new Blob(['pdf'], { type: 'application/pdf' }),
	objectUrl: 'blob:store-owned-preview',
};

function revision(
	revisionNo: number,
	overrides: Partial<DocumentTemplateRevision> = {},
): DocumentTemplateRevision {
	return {
		id: `revision-${revisionNo}`,
		revision_no: revisionNo,
		status: 'published',
		schema_version: 1,
		system_template_version: 1,
		created_by: null,
		configuration: { content: { greeting: `<p>Revision ${revisionNo}</p>` } },
		start_date: null,
		end_date: null,
		published_at: '2026-07-30T04:00:00.000Z',
		created_at: '2026-07-30T03:00:00.000Z',
		...overrides,
	};
}

const savedDraft = revision(7, {
	id: 'draft-7',
	status: 'draft',
	published_at: null,
	configuration: { content: { subject: 'Invoice {{invoiceNumber}}', greeting: '<p>Hello</p>' } },
});
const activeRevision = revision(6, { id: 'published-6' });

const detailFixture: DocumentTemplateDetail = {
	template_code: 'invoice',
	channel: 'email',
	display_name: 'Invoice email',
	category: 'customer',
	editable: true,
	version: 3,
	catalog_schema_version: 1,
	catalog_system_template_version: 1,
	fields: [
		{ path: 'content.subject', label: 'Subject', kind: 'plain-text', max_length: 200, allow_blank: false, allowed_tokens: ['invoiceNumber'] },
		{ path: 'content.greeting', label: 'Greeting', kind: 'rich-text', max_length: 400, allow_blank: false, allowed_tokens: [] },
		{ path: 'brand.primaryColor', label: 'Primary colour', kind: 'color', max_length: 7, allow_blank: false, allowed_tokens: [] },
	],
	blocks: [
		{ id: 'orderItems', label: 'Order items', required: true, default_enabled: true },
		{ id: 'merchantContact', label: 'Merchant contact', required: false, default_enabled: true },
	],
	allowed_tokens: ['invoiceNumber'],
	configuration: savedDraft.configuration,
	inherited_values: { merchantInfo: { companyName: 'Aster Home' } },
	effective_preview_values: { ...savedDraft.configuration, brand: { primaryColor: '#EE7F01' } },
	draft_revision: savedDraft,
	latest_published_revision: activeRevision,
	active_revision: activeRevision,
};

function summary(channel: 'email' | 'pdf' = 'email'): DocumentTemplateSummary {
	return {
		template_code: 'invoice',
		channel,
		display_name: channel === 'email' ? 'Invoice email' : 'Invoice PDF',
		category: 'customer',
		editable: true,
		version: 3,
		draft_revision: savedDraft,
		latest_published_revision: activeRevision,
		active_revision: activeRevision,
		scheduled_revisions: [],
		expired_revisions: [],
	};
}

const RouteHost = defineComponent({ setup: () => () => h(NuxtPage) });

describe('TemplatePreview', () => {
	it('renders email HTML only in a sandboxed CSP srcdoc iframe', async () => {
		const wrapper = await mountSuspended(TemplatePreview, {
			props: { channel: 'email', preview: emailPreview },
		});

		const iframe = wrapper.get('iframe');
		expect(iframe.attributes('sandbox')).toBe('');
		expect(iframe.attributes('srcdoc')).toContain('Content-Security-Policy');
		expect(iframe.attributes('srcdoc')).toContain('<h1>Invoice</h1>');
		expect(wrapper.html()).not.toContain('v-html');
	});

	it('switches desktop and mobile widths without requesting another preview', async () => {
		const wrapper = await mountSuspended(TemplatePreview, {
			props: { channel: 'email', preview: emailPreview },
		});

		await wrapper.get('[data-viewport="mobile"]').trigger('click');

		expect(wrapper.get('[data-preview-frame]').classes()).toContain('max-w-[390px]');
		expect(wrapper.emitted('refresh')).toBeUndefined();
	});

	it('uses the store-owned PDF object URL without duplicating or revoking it', async () => {
		const createObjectUrl = vi.spyOn(URL, 'createObjectURL');
		const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL');
		const wrapper = await mountSuspended(TemplatePreview, {
			props: { channel: 'pdf', preview: pdfPreview },
		});

		expect(wrapper.get('object').attributes('data')).toBe(pdfPreview.objectUrl);
		expect(createObjectUrl).not.toHaveBeenCalled();
		wrapper.unmount();
		expect(revokeObjectUrl).not.toHaveBeenCalled();
	});
});

describe('ActivationWindow', () => {
	it('emits nullable boundaries for Publish now and open-ended schedules', async () => {
		const publishNow = await mountSuspended(ActivationWindow, {
			props: { timezone: 'Asia/Kuala_Lumpur' },
		});
		await publishNow.get('[data-action="publish-now"]').trigger('click');
		expect(publishNow.emitted('confirm')).toEqual([[{ startDate: null, endDate: null }]]);

		const schedule = await mountSuspended(ActivationWindow, {
			props: { timezone: 'Asia/Kuala_Lumpur', startDate: null, endDate: null },
		});
		await schedule.get('[data-mode="schedule"]').trigger('click');
		await schedule.get('[data-action="schedule"]').trigger('click');
		expect(schedule.emitted('confirm')).toEqual([[{ startDate: null, endDate: null }]]);
	});

	it('rejects non-increasing or expired schedule ends before emitting', async () => {
		const wrapper = await mountSuspended(ActivationWindow, {
			props: {
				timezone: 'Asia/Kuala_Lumpur',
				startDate: new Date('2026-08-07T08:00:00+08:00'),
				endDate: new Date('2026-08-06T08:00:00+08:00'),
				now: new Date('2026-08-01T00:00:00.000Z'),
			},
		});

		await wrapper.get('[data-mode="schedule"]').trigger('click');
		await wrapper.get('[data-action="schedule"]').trigger('click');

		expect(wrapper.emitted('confirm')).toBeUndefined();
		expect(wrapper.get('[role="alert"]').text()).toContain('after the start');
	});

	it('checks the schedule end against the current click time', async () => {
		vi.useFakeTimers();
		try {
			vi.setSystemTime(new Date('2026-08-01T00:00:00.000Z'));
			const wrapper = await mountSuspended(ActivationWindow, {
				props: { timezone: 'Asia/Kuala_Lumpur', endDate: new Date('2026-08-02T00:00:00.000Z') },
			});
			vi.setSystemTime(new Date('2026-08-03T00:00:00.000Z'));

			await wrapper.get('[data-mode="schedule"]').trigger('click');
			await wrapper.get('[data-action="schedule"]').trigger('click');

			expect(wrapper.emitted('confirm')).toBeUndefined();
			expect(wrapper.get('[role="alert"]').text()).toContain('future');
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('RevisionHistory', () => {
	it('shows boundary labels and revision administration details', async () => {
		const wrapper = await mountSuspended(RevisionHistory, {
			props: {
				revisions: [
					revision(4, { created_by: 'Jane Admin' }),
					revision(5, { start_date: '2026-08-01T00:00:00.000Z' }),
					revision(3, { end_date: '2026-07-31T04:00:00.000Z' }),
				],
				activeRevisionId: 'revision-4',
				now: new Date('2026-07-31T04:00:00.000Z'),
				timezone: 'Asia/Kuala_Lumpur',
				schemaVersion: 1,
				systemTemplateVersion: 1,
				canRestore: true,
			},
		});

		expect(wrapper.text()).toContain('Active');
		expect(wrapper.text()).toContain('Scheduled');
		expect(wrapper.text()).toContain('Expired');
		expect(wrapper.text()).toContain('Jane Admin');
		expect(wrapper.text()).toContain('Revision 4');
		expect(wrapper.text()).toContain('Published');
		expect(wrapper.text()).toContain('Starts');
		expect(wrapper.text()).toContain('Ends');
	});

	it('disables restore when either catalog version is incompatible', async () => {
		const wrapper = await mountSuspended(RevisionHistory, {
			props: {
				revisions: [revision(4, { schema_version: 2 }), revision(3, { system_template_version: 2 })],
				schemaVersion: 1,
				systemTemplateVersion: 1,
				canRestore: true,
			},
		});

		expect(wrapper.findAll('[data-action="restore"]')).toHaveLength(2);
		expect(wrapper.findAll('[data-action="restore"]').every(button => button.attributes('disabled') !== undefined)).toBe(true);
		expect(wrapper.text()).toContain('Incompatible');
	});

	it('fails closed when authoritative catalog versions are absent', async () => {
		const wrapper = await mountSuspended(RevisionHistory, {
			props: { revisions: [revision(4)], canRestore: true },
		});

		expect(wrapper.get('[data-action="restore"]').attributes('disabled')).toBeDefined();
		expect(wrapper.text()).toContain('Incompatible');
	});
});

describe('Template Studio workflow', () => {
	const cleanups: Array<() => void> = [];

	beforeEach(() => {
		setActivePinia(useNuxtApp().$pinia as Pinia);
		vi.restoreAllMocks();
		overlayMocks.open.mockReset();
		overlayMocks.close.mockReset();
		overlayMocks.create.mockReset();
		overlayMocks.props = undefined;
		useDocumentTemplateStore().$reset();
		useAuthStore().$reset();
		useCookie(KEY.ACCESS_TOKEN).value = 'test-access-token';
		useCookie(KEY.X_MERCHANT_ID).value = 'M00001';
	});

	afterEach(async () => {
		cleanups.splice(0).forEach(cleanup => cleanup());
		vi.useRealTimers();
		await useNuxtApp().$i18n.setLocale('en');
	});

	async function mountWorkflow(options: {
		channel?: 'email' | 'pdf';
		role?: UserRoles;
		dirty?: boolean;
		hasDraft?: boolean;
	} = {}) {
		const channel = options.channel ?? 'email';
		const store = useDocumentTemplateStore();
		useAuthStore().user = {
			id: 'admin-1',
			role: options.role ?? UserRoles.MERCHANT_ADMIN,
			email_address: 'admin@example.test',
			name: 'Jane Admin',
			dial_code: '+60',
			phone_no: '123456789',
		};
		const selectedSummary = summary(channel);
		const selectedDetail: DocumentTemplateDetail = {
			...detailFixture,
			channel,
			display_name: selectedSummary.display_name,
			draft_revision: options.hasDraft === false ? null : savedDraft,
		};
		vi.spyOn(store, 'loadSummaries').mockImplementation(async () => {
			store.summaries = [selectedSummary];
		});
		vi.spyOn(store, 'loadDetail').mockImplementation(async () => {
			store.selected = { channel, templateCode: 'invoice' };
			store.detail = selectedDetail;
			store.revisions = [savedDraft, activeRevision, revision(5, { end_date: '2026-07-01T00:00:00.000Z' })];
			store.setBaseline(selectedDetail.draft_revision?.configuration ?? selectedDetail.configuration);
			if (options.dirty) store.setConfigurationPath('content.greeting', '<p>Unsaved</p>');
		});
		vi.spyOn(store, 'loadRevisions').mockResolvedValue();
		const previewDraft = vi.spyOn(store, 'previewDraft').mockResolvedValue();
		const wrapper = await mountSuspended(RouteHost, {
			route: `/settings/templates?channel=${channel}&template=invoice`,
		});
		cleanups.push(() => wrapper.unmount());
		await nextTick();
		previewDraft.mockClear();
		return { wrapper, store, previewDraft };
	}

	it('wires the controlled Task 16 editors to store mutations through shell slots', async () => {
		const { wrapper, store } = await mountWorkflow();

		expect(wrapper.findComponent(ContentEditor).exists()).toBe(true);
		wrapper.getComponent(ContentEditor).vm.$emit('update:path', 'content.subject', 'Updated invoice');
		await nextTick();
		expect(store.draft.content?.subject).toBe('Updated invoice');

		await wrapper.findAll('[role="tab"]').find(tab => tab.text() === 'Sections')!.trigger('mousedown', {
			button: 0,
			ctrlKey: false,
		});
		await nextTick();
		expect(wrapper.findComponent(SectionEditor).exists()).toBe(true);
	});

	it('debounces edited previews by 400 ms, supports manual refresh, and cancels on unmount', async () => {
		const { wrapper, store, previewDraft } = await mountWorkflow();
		previewDraft.mockRestore();
		const apiPreview = vi.spyOn(useNuxtApp().$api.documentTemplate, 'previewEmail').mockResolvedValue({
			html: emailPreview.html,
			subject: emailPreview.subject,
			revision_id: null,
			revision_no: null,
		});
		vi.useFakeTimers();

		store.setConfigurationPath('content.greeting', '<p>First</p>');
		await nextTick();
		store.setConfigurationPath('content.greeting', '<p>Latest</p>');
		await nextTick();
		await vi.advanceTimersByTimeAsync(399);
		expect(apiPreview).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(apiPreview).toHaveBeenCalledOnce();

		await wrapper.get('[data-action="refresh-preview"]').trigger('click');
		await vi.advanceTimersByTimeAsync(400);
		expect(apiPreview).toHaveBeenCalledTimes(2);

		store.setConfigurationPath('content.greeting', '<p>Unmounted</p>');
		await nextTick();
		wrapper.unmount();
		await vi.advanceTimersByTimeAsync(400);
		expect(apiPreview).toHaveBeenCalledTimes(2);
		expect(store.preview).toBeNull();
	});

	it('publishes the exact saved draft with null activation boundaries only after confirmation', async () => {
		const { wrapper, store } = await mountWorkflow();
		const publish = vi.spyOn(useNuxtApp().$api.documentTemplate, 'publish').mockResolvedValue({
			version: 4,
			latest_published_revision: revision(7),
		});
		const storePublish = vi.spyOn(store, 'publish');

		await wrapper.get('[data-action="publish-now"]').trigger('click');
		expect(overlayMocks.open).toHaveBeenCalledOnce();
		expect(storePublish).not.toHaveBeenCalled();
		await overlayMocks.props?.onConfirm?.();

		expect(storePublish).toHaveBeenCalledWith(7);
		expect(publish).toHaveBeenCalledWith('email', 'invoice', {
			version: 3,
			revision_no: 7,
			start_date: null,
			end_date: null,
		});
	});

	it('converts local schedule boundaries to UTC for the exact saved draft', async () => {
		const { wrapper } = await mountWorkflow();
		const publish = vi.spyOn(useNuxtApp().$api.documentTemplate, 'publish').mockResolvedValue({
			version: 4,
			latest_published_revision: revision(7),
		});
		wrapper.getComponent(ActivationWindow).vm.$emit('confirm', {
			startDate: new Date('2026-08-01T08:00:00+08:00'),
			endDate: new Date('2026-08-07T08:00:00+08:00'),
		});
		await nextTick();
		expect(publish).not.toHaveBeenCalled();
		await overlayMocks.props?.onConfirm?.();

		expect(publish).toHaveBeenCalledWith('email', 'invoice', {
			version: 3,
			revision_no: 7,
			start_date: '2026-08-01T00:00:00.000Z',
			end_date: '2026-08-07T00:00:00.000Z',
		});
	});

	it('revalidates the schedule end immediately before the confirmed backend call', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-01T00:00:00.000Z'));
		const { wrapper } = await mountWorkflow();
		const publish = vi.spyOn(useNuxtApp().$api.documentTemplate, 'publish');
		wrapper.getComponent(ActivationWindow).vm.$emit('confirm', {
			startDate: null,
			endDate: new Date('2026-08-02T00:00:00.000Z'),
		});
		await nextTick();
		vi.setSystemTime(new Date('2026-08-03T00:00:00.000Z'));

		await overlayMocks.props?.onConfirm?.();

		expect(publish).not.toHaveBeenCalled();
	});

	it('requires the same saved draft to still be selected when publish is confirmed', async () => {
		const { wrapper, store } = await mountWorkflow();
		const publish = vi.spyOn(useNuxtApp().$api.documentTemplate, 'publish');

		await wrapper.get('[data-action="publish-now"]').trigger('click');
		store.detail = { ...store.detail!, draft_revision: revision(8, { id: 'draft-8', status: 'draft' }) };
		await overlayMocks.props?.onConfirm?.();

		expect(publish).not.toHaveBeenCalled();
	});

	it('disables publishing until an explicit draft save exists and is clean', async () => {
		const dirty = await mountWorkflow({ dirty: true });
		expect(dirty.wrapper.get('[data-action="publish-now"]').attributes('disabled')).toBeDefined();
		expect(dirty.wrapper.text()).toContain('Save draft before publishing');

		dirty.wrapper.unmount();
		const unsaved = await mountWorkflow({ hasDraft: false });
		expect(unsaved.wrapper.get('[data-action="publish-now"]').attributes('disabled')).toBeDefined();
		expect(unsaved.wrapper.text()).toContain('Save a draft before publishing');
	});

	it.each(['publish', 'restore', 'reset'] as const)('requires one confirmation before %s', async (action) => {
		const { wrapper, store } = await mountWorkflow();
		const actionSpy = vi.spyOn(store, action === 'restore' ? 'restoreRevision' : action === 'reset' ? 'resetTemplate' : 'publish').mockResolvedValue();
		if (action === 'restore') {
			await wrapper.findAll('[role="tab"]').find(tab => tab.text() === 'History')!.trigger('mousedown', {
				button: 0,
				ctrlKey: false,
			});
			await nextTick();
		}

		await wrapper.get(`[data-action="${action === 'publish' ? 'publish-now' : action}"]`).trigger('click');

		expect(overlayMocks.open).toHaveBeenCalledOnce();
		expect(actionSpy).not.toHaveBeenCalled();
	});

	it('hides administration controls from staff while retaining save, preview, and email test send', async () => {
		const { wrapper } = await mountWorkflow({ role: UserRoles.MERCHANT_STAFF });

		expect(wrapper.find('[data-action="save-draft"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="refresh-preview"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="test-send"]').exists()).toBe(true);
		expect(wrapper.find('[data-action="publish-now"]').exists()).toBe(false);
		expect(wrapper.find('[data-action="schedule"]').exists()).toBe(false);
		expect(wrapper.find('[data-action="reset"]').exists()).toBe(false);

		wrapper.getComponent(TemplateEditor).vm.$emit('update:activeTab', 'history');
		await nextTick();
		expect(wrapper.find('[data-action="restore"]').exists()).toBe(false);
	});

	it('uses authoritative catalog versions instead of a stale current draft for restore compatibility', async () => {
		const { wrapper, store } = await mountWorkflow();
		store.detail = {
			...store.detail!,
			catalog_schema_version: 2,
			catalog_system_template_version: 2,
		};
		await nextTick();
		await wrapper.findAll('[role="tab"]').find(tab => tab.text() === 'History')!.trigger('mousedown', {
			button: 0,
			ctrlKey: false,
		});
		await nextTick();

		const restoreButtons = wrapper.findAll('[data-action="restore"]');
		expect(restoreButtons.length).toBeGreaterThan(0);
		expect(restoreButtons.every(button => button.attributes('disabled') !== undefined)).toBe(true);
	});

	it('never renders test send for PDF templates', async () => {
		const { wrapper } = await mountWorkflow({ channel: 'pdf' });
		expect(wrapper.find('[data-action="test-send"]').exists()).toBe(false);
	});

	it.each(['restore', 'reset'] as const)('returns to clean Content after a successful %s-created draft', async (action) => {
		const { wrapper, store } = await mountWorkflow();
		const createdDraft = revision(8, { id: `draft-${action}`, status: 'draft', published_at: null });
		if (action === 'restore') {
			vi.spyOn(useNuxtApp().$api.documentTemplate, 'restore').mockResolvedValue({ version: 4, draft_revision: createdDraft });
			await wrapper.findAll('[role="tab"]').find(tab => tab.text() === 'History')!.trigger('mousedown', {
				button: 0,
				ctrlKey: false,
			});
			await nextTick();
		} else {
			vi.spyOn(useNuxtApp().$api.documentTemplate, 'reset').mockResolvedValue({ version: 4, draft_revision: createdDraft });
			wrapper.getComponent(TemplateEditor).vm.$emit('update:activeTab', 'brand');
			await nextTick();
		}

		await wrapper.get(`[data-action="${action}"]`).trigger('click');
		await overlayMocks.props?.onConfirm?.();

		expect(wrapper.getComponent(TemplateEditor).props('activeTab')).toBe('content');
		expect(store.detail?.draft_revision?.id).toBe(createdDraft.id);
		expect(store.isDirty).toBe(false);
	});

	it('shows a compact 409 conflict with an explicit server reload and no raw error text', async () => {
		const { wrapper, store } = await mountWorkflow({ dirty: true });
		const reload = vi.spyOn(store, 'reloadAfterConflict').mockResolvedValue();
		store.conflict = { currentVersion: 12 };
		store.error = 'database host 10.0.0.4 rejected connection';
		await nextTick();

		expect(wrapper.get('[data-testid="template-conflict"]').text()).toContain('12');
		expect(wrapper.text()).not.toContain('10.0.0.4');
		expect(reload).not.toHaveBeenCalled();
		await wrapper.get('[data-action="reload-server-version"]').trigger('click');
		expect(reload).toHaveBeenCalledOnce();
	});

	it('localizes the new workflow in Malay', async () => {
		await useNuxtApp().$i18n.setLocale('ms');
		const { wrapper } = await mountWorkflow({ dirty: true });

		expect(wrapper.text()).toContain('Simpan draf sebelum menerbitkan');
		expect(wrapper.text()).toContain('Muat semula pratonton');
		expect(wrapper.text()).toContain('Terbitkan sekarang');
	});
});
