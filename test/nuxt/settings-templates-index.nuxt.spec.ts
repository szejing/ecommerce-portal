import type { Pinia } from 'pinia';
import { setActivePinia } from 'pinia';
import { defineComponent, h, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { KEY } from 'yeppi-common';
import { NuxtPage } from '#components';
import TemplateNavigation from '~/components/Z/TemplateStudio/TemplateNavigation.vue';
import TemplateEditor from '~/components/Z/TemplateStudio/TemplateEditor.vue';
import { useDocumentTemplateStore } from '~/stores/DocumentTemplate/DocumentTemplate';
import type { DocumentTemplateChannel, DocumentTemplateSummary } from '~/utils/types/document-template';

const overlayMocks = vi.hoisted(() => ({
	open: vi.fn(),
	close: vi.fn(),
	create: vi.fn(),
	props: undefined as undefined | { onLeave?: () => void; onStay?: () => void },
}));
const watchMocks = vi.hoisted(() => ({
	templateRegistered: vi.fn(),
	templateTriggered: vi.fn(),
}));

mockNuxtImport('watch', original => (
	source: unknown,
	callback: (...args: unknown[]) => unknown,
	options?: unknown,
) => {
	const initialValue = typeof source === 'function' ? source() : undefined;
	const isTemplateSelectionWatcher = Array.isArray(initialValue)
		&& initialValue.length === 3
		&& Array.isArray(initialValue[2])
		&& (initialValue[0] === 'email' || initialValue[0] === 'pdf')
		&& typeof initialValue[1] === 'string';
	if (isTemplateSelectionWatcher) watchMocks.templateRegistered();
	return original(source, (...args: unknown[]) => {
		if (isTemplateSelectionWatcher) watchMocks.templateTriggered();
		return callback(...args);
	}, options);
});

mockNuxtImport('useOverlay', () => () => ({
	create: overlayMocks.create.mockImplementation((_component, options?: { props?: typeof overlayMocks.props }) => {
		overlayMocks.props = options?.props;
		return {
			open: overlayMocks.open,
			close: overlayMocks.close,
		};
	}),
}));

function summary(
	templateCode: string,
	displayName: string,
	channel: DocumentTemplateChannel,
	editable: boolean,
	category: DocumentTemplateSummary['category'] = editable ? 'customer' : 'system',
): DocumentTemplateSummary {
	return {
		template_code: templateCode,
		channel,
		display_name: displayName,
		category,
		editable,
		version: 1,
		draft_revision: null,
		latest_published_revision: null,
		active_revision: null,
		scheduled_revisions: [],
		expired_revisions: [],
	};
}

const catalogSummaries: DocumentTemplateSummary[] = [
	summary('forgot-password', 'Forgot password', 'email', false),
	summary('order-confirmation', 'Order confirmation', 'email', true),
	summary('invoice', 'Invoice email', 'email', true),
	summary('invoice', 'Invoice PDF', 'pdf', true),
	summary('receipt', 'Receipt PDF', 'pdf', true),
	summary('future-customer-email', 'Future customer email', 'email', true),
	summary('crm-user-welcome', 'CRM user welcome', 'email', false),
	summary('merchant-onboarding-welcome', 'Merchant onboarding welcome', 'email', false, 'merchant'),
	summary('admin-order-alert', 'Admin order alert', 'email', false, 'merchant'),
];

const rejectedQueryCases = [
	{
		label: 'invalid',
		query: { channel: 'pdf', template: 'not-in-the-catalog' },
	},
	{
		label: 'locked',
		query: { channel: 'email', template: 'crm-user-welcome' },
	},
] as const;

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	return { promise: new Promise<T>((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; }), resolve, reject };
}

const RouteHost = defineComponent({
	setup: () => () => h(NuxtPage),
});

describe('TemplateNavigation', () => {
	it('lists only editable templates in a select', async () => {
		const wrapper = await mountSuspended(TemplateNavigation, {
			props: { templates: catalogSummaries },
		});

		const select = wrapper.getComponent({ name: 'USelect' });
		const items = select.props('items') as Array<{ label: string; value: string }>;

		expect(wrapper.find('[data-testid="template-navigation"]').exists()).toBe(true);
		expect(items.map((item) => item.value)).toEqual([
			'email:order-confirmation',
			'email:invoice',
			'pdf:invoice',
			'pdf:receipt',
			'email:future-customer-email',
		]);
		expect(items.every((item) => !item.value.includes('forgot-password') && !item.value.includes('crm-user-welcome'))).toBe(true);
		expect(wrapper.text()).not.toContain('Locked templates');
	});

	it('emits only editable template selections', async () => {
		const wrapper = await mountSuspended(TemplateNavigation, {
			props: { templates: catalogSummaries },
		});

		const select = wrapper.getComponent({ name: 'USelect' });
		select.vm.$emit('update:modelValue', 'email:order-confirmation');
		await nextTick();
		select.vm.$emit('update:modelValue', 'email:forgot-password');
		await nextTick();

		expect(wrapper.emitted('select')).toEqual([[catalogSummaries[1]]]);
	});

	it('selects a template from the dropdown', async () => {
		const wrapper = await mountSuspended(TemplateNavigation, {
			props: { templates: catalogSummaries },
		});

		expect(wrapper.find('[aria-label="Template navigation"]').exists()).toBe(true);

		const select = wrapper.getComponent({ name: 'USelect' });
		select.vm.$emit('update:modelValue', 'pdf:invoice');
		await nextTick();
		expect(wrapper.emitted('select')).toEqual([[catalogSummaries[3]]]);
	});
});

describe('TemplateEditor', () => {
	it('owns translated editor tabs and delegates their bodies to slots', async () => {
		const slots = {
			content: '<div data-testid="content-editor-slot">Content controls</div>',
			brand: '<div>Brand controls</div>',
		};
		const wrapper = await mountSuspended(TemplateEditor, {
			slots: {
				...slots,
			},
		});
		const tabs = wrapper.getComponent({ name: 'UTabs' });

		expect((tabs.props('items') as Array<{ label: string }>).map(item => item.label)).toEqual(['Content', 'Brand']);
		expect(wrapper.get('[data-testid="content-editor-slot"]').text()).toBe('Content controls');

		const activeWrapper = await mountSuspended(TemplateEditor, {
			props: { activeTab: 'brand' },
			slots,
		});
		expect(activeWrapper.text()).toContain('Brand controls');
	});
});

describe('TemplateStudioPage', () => {
	const pageCleanups: Array<() => void> = [];

	beforeEach(async () => {
		setActivePinia(useNuxtApp().$pinia as Pinia);
		vi.restoreAllMocks();
		useDocumentTemplateStore(useNuxtApp().$pinia as Pinia).$reset();
		useCookie(KEY.ACCESS_TOKEN).value = 'test-access-token';
		useCookie(KEY.X_MERCHANT_ID).value = 'M00001';
		overlayMocks.open.mockReset();
		overlayMocks.close.mockReset();
		overlayMocks.create.mockReset();
		overlayMocks.props = undefined;
		watchMocks.templateRegistered.mockReset();
		watchMocks.templateTriggered.mockReset();
	});

	afterEach(() => {
		pageCleanups.splice(0).forEach(cleanup => cleanup());
	});

	async function mountPage(route = '/settings/templates') {
		const store = useDocumentTemplateStore(useNuxtApp().$pinia as Pinia);
		const loadSummaries = vi.spyOn(store, 'loadSummaries').mockImplementation(async () => {
			store.summaries = catalogSummaries;
		});
		const loadDetail = vi.spyOn(store, 'loadDetail').mockImplementation(async (channel, templateCode) => {
			store.selected = { channel, templateCode };
		});
		const wrapper = await mountSuspended(RouteHost, { route });
		pageCleanups.push(() => wrapper.unmount());
		const router = useRouter();

		return { wrapper, store, loadSummaries, loadDetail, router };
	}

	it('loads the first editable template and keeps fallback selection in the URL', async () => {
		const { loadSummaries, loadDetail, router } = await mountPage('/settings/templates?channel=email&template=forgot-password');

		expect(loadSummaries).toHaveBeenCalledOnce();
		expect(loadDetail).toHaveBeenCalledOnce();
		expect(loadDetail).toHaveBeenCalledWith('email', 'order-confirmation');
		expect(watchMocks.templateRegistered).toHaveBeenCalledOnce();
		expect(router.currentRoute.value.query).toMatchObject({
			channel: 'email',
			template: 'order-confirmation',
		});
	});

	it('honours a valid editable URL selection', async () => {
		const { loadDetail, router } = await mountPage('/settings/templates?channel=pdf&template=invoice');

		expect(loadDetail).toHaveBeenCalledWith('pdf', 'invoice');
		expect(router.currentRoute.value.query).toMatchObject({ channel: 'pdf', template: 'invoice' });
	});

	it('replays only the latest query after the initial detail request settles', async () => {
		const store = useDocumentTemplateStore(useNuxtApp().$pinia as Pinia);
		const initialDetail = deferred<void>();
		vi.spyOn(store, 'loadSummaries').mockImplementation(async () => {
			store.summaries = catalogSummaries;
		});
		const loadDetail = vi.spyOn(store, 'loadDetail').mockImplementation(async (channel, templateCode) => {
			store.selected = { channel, templateCode };
			if (channel === 'email' && templateCode === 'order-confirmation') await initialDetail.promise;
		});
		const mountPromise = mountSuspended(RouteHost, {
			route: '/settings/templates?channel=email&template=order-confirmation',
		});
		const router = useRouter();
		await vi.waitFor(() => expect(loadDetail).toHaveBeenCalledWith('email', 'order-confirmation'));

		await router.push({ path: '/settings/templates', query: { channel: 'email', template: 'invoice' } });
		await router.push({ path: '/settings/templates', query: { channel: 'pdf', template: 'receipt' } });
		expect(router.currentRoute.value.query).toMatchObject({ channel: 'pdf', template: 'receipt' });
		expect(loadDetail).toHaveBeenCalledOnce();

		initialDetail.resolve();
		const wrapper = await mountPromise;
		pageCleanups.push(() => wrapper.unmount());
		await vi.waitFor(() => expect(loadDetail).toHaveBeenCalledTimes(2));

		expect(loadDetail.mock.calls).toEqual([
			['email', 'order-confirmation'],
			['pdf', 'receipt'],
		]);
		expect(store.selected).toEqual({ channel: 'pdf', templateCode: 'receipt' });
		expect(router.currentRoute.value.query).toMatchObject({ channel: 'pdf', template: 'receipt' });
		expect(watchMocks.templateRegistered).toHaveBeenCalledOnce();
	});

	it('falls back from a truly invalid URL selection', async () => {
		const { loadDetail, router } = await mountPage('/settings/templates?channel=pdf&template=not-in-the-catalog');

		expect(loadDetail).toHaveBeenCalledWith('email', 'order-confirmation');
		expect(router.currentRoute.value.query).toMatchObject({ channel: 'email', template: 'order-confirmation' });
	});

	it('synchronizes an editable navigation selection back to the URL', async () => {
		const { wrapper, loadDetail, router } = await mountPage();
		const navigation = wrapper.getComponent(TemplateNavigation);

		navigation.vm.$emit('select', catalogSummaries[3]);
		await vi.waitFor(() => expect(loadDetail).toHaveBeenLastCalledWith('pdf', 'invoice'));
		expect(router.currentRoute.value.query).toMatchObject({ channel: 'pdf', template: 'invoice' });
	});

	it('renders navigation above a responsive editor and preview shell', async () => {
		const { wrapper } = await mountPage();
		const shell = wrapper.get('[data-testid="template-studio-shell"]');

		expect(shell.classes()).toContain('space-y-4');
		expect(wrapper.find('[data-testid="template-navigation-region"]').exists()).toBe(true);
		expect(wrapper.getComponent({ name: 'USelect' }).exists()).toBe(true);
		expect(wrapper.find('[data-testid="template-editor-region"]').exists()).toBe(true);
		expect(wrapper.get('[data-testid="template-preview-region"]').classes()).toContain('xl:sticky');
	});

	it('blocks route navigation when explicit unsaved edits exist', async () => {
		const { store, router } = await mountPage();
		const dispose = vi.spyOn(store, 'dispose');
		store.isDirty = true;
		await nextTick();

		await router.push('/settings');

		expect(router.currentRoute.value.path).toBe('/settings/templates');
		expect(overlayMocks.open).toHaveBeenCalledOnce();

		overlayMocks.props?.onLeave?.();
		await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/settings'));
		expect(dispose).toHaveBeenCalled();
	});

	it('keeps the current URL and detail when a dirty navigation selection stays', async () => {
		const { wrapper, store, loadDetail, router } = await mountPage();
		store.isDirty = true;
		await nextTick();

		wrapper.getComponent(TemplateNavigation).vm.$emit('select', catalogSummaries[3]);
		await vi.waitFor(() => expect(overlayMocks.open).toHaveBeenCalledOnce());

		expect(router.currentRoute.value.query).toMatchObject({ channel: 'email', template: 'order-confirmation' });
		expect(store.selected).toEqual({ channel: 'email', templateCode: 'order-confirmation' });
		expect(loadDetail).not.toHaveBeenCalledWith('pdf', 'invoice');

		overlayMocks.props?.onStay?.();
		expect(router.currentRoute.value.query).toMatchObject({ channel: 'email', template: 'order-confirmation' });
	});

	it('loads a dirty navigation selection only after confirmation', async () => {
		const { wrapper, store, loadDetail, router } = await mountPage();
		store.isDirty = true;
		await nextTick();

		wrapper.getComponent(TemplateNavigation).vm.$emit('select', catalogSummaries[3]);
		await vi.waitFor(() => expect(overlayMocks.open).toHaveBeenCalledOnce());
		overlayMocks.props?.onLeave?.();

		await vi.waitFor(() => expect(router.currentRoute.value.query).toMatchObject({ channel: 'pdf', template: 'invoice' }));
		expect(loadDetail).toHaveBeenCalledWith('pdf', 'invoice');
	});

	it('blocks browser query navigation while dirty and preserves the current selection on stay', async () => {
		const { store, loadDetail, router } = await mountPage();
		store.isDirty = true;
		await nextTick();

		await router.push({ path: '/settings/templates', query: { channel: 'pdf', template: 'invoice' } });

		expect(overlayMocks.open).toHaveBeenCalledOnce();
		expect(router.currentRoute.value.query).toMatchObject({ channel: 'email', template: 'order-confirmation' });
		expect(store.selected).toEqual({ channel: 'email', templateCode: 'order-confirmation' });
		expect(loadDetail).not.toHaveBeenCalledWith('pdf', 'invoice');

		overlayMocks.props?.onStay?.();
		expect(router.currentRoute.value.query).toMatchObject({ channel: 'email', template: 'order-confirmation' });
	});

	for (const { label, query } of rejectedQueryCases) {
		it(`keeps the current canonical URL and detail when a dirty ${label} query stays`, async () => {
			const { store, loadDetail, router } = await mountPage('/settings/templates?channel=pdf&template=invoice');
			store.isDirty = true;
			await nextTick();

			await router.push({ path: '/settings/templates', query });

			expect(overlayMocks.open).toHaveBeenCalledOnce();
			expect(router.currentRoute.value.query).toMatchObject({ channel: 'pdf', template: 'invoice' });
			expect(store.selected).toEqual({ channel: 'pdf', templateCode: 'invoice' });
			expect(loadDetail).not.toHaveBeenCalledWith('email', 'order-confirmation');

			overlayMocks.props?.onStay?.();
			expect(overlayMocks.close).toHaveBeenCalledOnce();
			expect(router.currentRoute.value.query).toMatchObject({ channel: 'pdf', template: 'invoice' });
		});

		it(`canonicalizes a dirty ${label} query after one leave confirmation`, async () => {
			const { store, loadDetail, router } = await mountPage('/settings/templates?channel=pdf&template=invoice');
			store.isDirty = true;
			await nextTick();

			await router.push({ path: '/settings/templates', query });
			expect(overlayMocks.open).toHaveBeenCalledOnce();
			overlayMocks.props?.onLeave?.();

			await vi.waitFor(() => expect(router.currentRoute.value.query).toMatchObject({
				channel: 'email',
				template: 'order-confirmation',
			}));
			expect(overlayMocks.open).toHaveBeenCalledOnce();
			expect(loadDetail).toHaveBeenCalledWith('email', 'order-confirmation');
			expect(store.selected).toEqual({ channel: 'email', templateCode: 'order-confirmation' });
		});
	}

	it('does not resume initial selection after leaving while summaries are pending', async () => {
		const store = useDocumentTemplateStore(useNuxtApp().$pinia as Pinia);
		store.summaries = catalogSummaries;
		const summariesRequest = deferred<void>();
		const loadSummaries = vi.spyOn(store, 'loadSummaries').mockReturnValue(summariesRequest.promise);
		const loadDetail = vi.spyOn(store, 'loadDetail').mockResolvedValue();
		const dispose = vi.spyOn(store, 'dispose');
		const mountPromise = mountSuspended(RouteHost, {
			route: '/settings/templates?channel=pdf&template=not-in-the-catalog',
		});
		const router = useRouter();
		await vi.waitFor(() => expect(loadSummaries).toHaveBeenCalledOnce());
		const watchersBeforeLeave = {
			registered: watchMocks.templateRegistered.mock.calls.length,
			triggered: watchMocks.templateTriggered.mock.calls.length,
		};

		const leavePromise = router.push('/settings');
		await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
		summariesRequest.resolve();
		await leavePromise;
		const wrapper = await mountPromise;
		pageCleanups.push(() => wrapper.unmount());
		await router.replace({ path: '/settings', query: { channel: 'email' } });
		await nextTick();

		expect(router.currentRoute.value.fullPath).toBe('/settings?channel=email');
		expect(store.summaries).toEqual(catalogSummaries);
		expect(store.selected).toBeNull();
		expect(loadDetail).not.toHaveBeenCalled();
		expect({
			registered: watchMocks.templateRegistered.mock.calls.length,
			triggered: watchMocks.templateTriggered.mock.calls.length,
		}).toEqual(watchersBeforeLeave);
	});

	it('localizes fixed catalog names in Malay and falls back for unknown future entries', async () => {
		await useNuxtApp().$i18n.setLocale('ms');
		try {
			const { wrapper } = await mountPage();
			const items = wrapper.getComponent({ name: 'USelect' }).props('items') as Array<{ label: string; value: string }>;

			expect(wrapper.text()).toContain('Pengesahan pesanan');
			expect(wrapper.get('[data-testid="template-editor-region"]').text()).toContain('Pengesahan pesanan');
			expect(items.find((item) => item.value === 'email:future-customer-email')?.label).toBe('Future customer email');
		} finally {
			await useNuxtApp().$i18n.setLocale('en');
		}
	});

	it('localizes fallback load errors in Malay without replacing API messages', async () => {
		await useNuxtApp().$i18n.setLocale('ms');
		try {
			const { wrapper, store } = await mountPage();
			store.summaryError = 'Failed to load document templates';
			store.detailError = 'Failed to load document template';
			await nextTick();

			expect(wrapper.text()).toContain('Templat dokumen tidak dapat dimuatkan. Sila cuba lagi.');
			expect(wrapper.text()).toContain('Templat dokumen ini tidak dapat dimuatkan. Sila cuba lagi.');
			expect(wrapper.text()).not.toContain('Failed to load document template');

			store.summaryError = 'Summary service unavailable';
			store.detailError = 'Detail service unavailable';
			await nextTick();

			expect(wrapper.text()).toContain('Summary service unavailable');
			expect(wrapper.text()).toContain('Detail service unavailable');
		} finally {
			await useNuxtApp().$i18n.setLocale('en');
		}
	});
});
