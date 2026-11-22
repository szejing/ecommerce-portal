import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import { useNuxtApp } from '#imports';
import { flushPromises } from '@vue/test-utils';
import ZRecordLink from '~/components/Z/RecordLink.vue';
import CategoryListing from '~/pages/products/categories/index.vue';

describe('Catalogue record row', () => {
	it('uses a button when opening an editor and a link when opening a detail route', async () => {
		const openEditor = vi.fn();
		const editor = await mountSuspended(ZRecordLink, { attrs: { onClick: openEditor }, slots: { default: 'Car care' } });
		await editor.get('button[type="button"]').trigger('click');
		expect(editor.text()).toContain('Car care');
		expect(openEditor).toHaveBeenCalledOnce();

		const detail = await mountSuspended(ZRecordLink, {
			props: { to: '/products/combos/car-care' },
			slots: { default: 'Car care bundle' },
		});
		expect(detail.get('a[href="/products/combos/car-care"]').text()).toContain('Car care bundle');
	});

	it('keeps category children visible until their parent is collapsed', async () => {
		const child = { code: 'SOAP', description: 'Wash supplies', is_internal: false };
		const root = { code: 'AUTO', description: 'Car care', is_internal: false, category_children: [child] };
		const load = vi.spyOn(useNuxtApp().$api.category, 'getMany').mockResolvedValue({
			'data': [root],
			'value': [root],
			'count': 2,
			'@odata.count': 2,
		});
		try {
			const wrapper = await mountSuspended(CategoryListing, {
				global: { stubs: { ZPagePanel: { template: '<main><slot /></main>' } } },
			});
			await flushPromises();
			const mobile = wrapper.get('section[aria-label="Categories"]');
			const toggle = mobile.get('button[aria-expanded="true"]');
			expect(mobile.text()).toContain('Wash supplies');
			await toggle.trigger('click');
			expect(toggle.attributes('aria-expanded')).toBe('false');
			expect(mobile.text()).not.toContain('Wash supplies');
			wrapper.unmount();
		} finally {
			load.mockRestore();
		}
	});
});
