import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { ProductStatus } from 'yeppi-common';
import ProductMobileListing from '~/components/Product/MobileListing.vue';
import { useProductStore } from '~/stores/Product/Product';

describe('Products/Services mobile listing', () => {
	it('shows matching variant SKUs in one link to the existing product', async () => {
		const wrapper = await mountSuspended(ProductMobileListing, {
			props: { initialize: false, typeOptions: [], selectedType: 'all' },
		});
		const store = useProductStore();
		store.filter.query = 'cc-30';
		store.products = [{
			code: 'PRD-104',
			slug: 'ceramic-coating',
			name: 'Ceramic Coating',
			updated_at: new Date('2026-11-22T00:00:00Z'),
			status: ProductStatus.PUBLISHED,
			variants: [{ variant_code: '1', sku: 'CC-30' }, { variant_code: '2', sku: 'CC-30-L' }],
		}];
		await nextTick();

		const links = wrapper.findAll('a[href="/products/ceramic-coating"]');
		expect(links).toHaveLength(1);
		expect(links[0]?.text()).toContain('SKU CC-30');
		expect(links[0]?.text()).toContain('Published');

		store.products = [{
			code: 'PRD-105',
			name: 'Infused Wax',
			sku: 'IW-PARENT',
			updated_at: new Date('2026-11-22T00:00:00Z'),
		}];
		store.filter.query = '';
		await nextTick();
		expect(wrapper.get('a[href="/products/PRD-105"]').text()).toContain('SKU IW-PARENT');
	});
});
