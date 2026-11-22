import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AllocationType, DiscountType } from 'yeppi-common';
import { useNuxtApp } from '#imports';
import DiscountsPage from '~/pages/marketing/discounts/index.vue';
import { useDiscountStore } from '~/stores/discount/discount';
import VoucherListing from '~/components/Z/Section/VoucherListing.vue';
import { useVoucherStore } from '~/stores/voucher/voucher';
import type { BaseODataResp } from '~/repository/base/base.resp';
import type { Discount } from '~/utils/types/discount';
import type { Voucher } from '~/utils/types/voucher';

mockNuxtImport('useMobileListScroll', () => () => async () => {});

const discount: Discount = {
	code: 'SAVE10',
	description: 'Ten percent off',
	is_disabled: false,
	starts_at: null,
	ends_at: null,
	usage_limit: null,
	usage_count: 0,
	disc_type: DiscountType.PERCENTAGE,
	disc_value: 10,
	allocation: AllocationType.BILL,
	conditions: [],
	created_at: '',
	updated_at: '',
};

const voucher: Voucher = {
	code: 'WEEKEND10',
	description: 'Weekend offer',
	is_disabled: true,
	starts_at: null,
	ends_at: null,
	usage_limit: 20,
	usage_count: 3,
	usage_per_customer: null,
	created_at: '',
	updated_at: '',
	discount,
};

function listingResponse(item: Voucher): BaseODataResp<Voucher> {
	return { 'data': [item], 'value': [item], 'count': 1, '@odata.count': 1 };
}

const panelStubs = {
	ZPagePanel: { template: '<main><slot name="toolbar" /><slot /></main>' },
	ZTableToolbar: true,
};

afterEach(() => {
	vi.restoreAllMocks();
	useDiscountStore().$reset();
	useVoucherStore().$reset();
});

describe('Mobile voucher listing', () => {
	it.each([
		{ kind: 'shop', title: 'Shop vouchers', allocation: AllocationType.BILL },
		{ kind: 'product', title: 'Product vouchers', allocation: AllocationType.ITEM },
	] as const)('opens records and searches within the $kind allocation', async ({ kind, title, allocation }) => {
		const load = vi.spyOn(useNuxtApp().$api.voucher, 'getMany').mockResolvedValue(
			listingResponse({ ...voucher, discount: { ...discount, allocation } }),
		);
		const wrapper = await mountSuspended(VoucherListing, {
			props: { kind },
			global: { stubs: panelStubs },
		});
		try {
			await flushPromises();
			const mobile = wrapper.get(`section[aria-label="${title}"]`);
			const record = mobile.get('a[href="/marketing/vouchers/WEEKEND10"]');
			expect(record.text()).toContain('SAVE10');
			expect(record.text()).toContain('Inactive');
			expect(record.text()).toContain('3 / 20');

			const store = useVoucherStore();
			store.filter.current_page = 3;
			const input = wrapper.get('input[inputmode="search"]');
			await input.setValue('weekend');
			await input.trigger('keydown', { key: 'Enter' });
			await flushPromises();

			expect(load).toHaveBeenLastCalledWith(expect.objectContaining({
				$filter: `discount.allocation eq '${allocation}'`,
				$search: 'weekend',
				$skip: 0,
			}));
			expect(wrapper.get('button[aria-label="Status"]').text()).toBe('All');

			const statusSelect = wrapper.findAllComponents({ name: 'USelect' }).find((select) => {
				const items = select.props('items') as { value: string }[] | undefined;
				return items?.some((item) => item.value === 'inactive');
			});
			await statusSelect!.vm.$emit('update:modelValue', 'inactive');
			await flushPromises();
			expect(load).toHaveBeenLastCalledWith(expect.objectContaining({
				$filter: `discount.allocation eq '${allocation}' and is_disabled eq true`,
				$search: 'weekend',
			}));
			expect(wrapper.get('button[aria-label="Status"]').text()).toBe('Inactive');

			await statusSelect!.vm.$emit('update:modelValue', 'all');
			await flushPromises();
			expect(load).toHaveBeenLastCalledWith(expect.objectContaining({
				$filter: `discount.allocation eq '${allocation}'`,
			}));

			await store.updatePageSize(20);
			expect(load).toHaveBeenLastCalledWith(expect.objectContaining({ $top: 20, $skip: 0 }));
		} finally {
			wrapper.unmount();
		}
	});

	it('keeps results from the latest allocation when earlier requests finish late', async () => {
		const store = useVoucherStore();
		let finishShopRequest: (response: BaseODataResp<Voucher>) => void = () => {};
		const shopResponse = new Promise<BaseODataResp<Voucher>>((resolve) => {
			finishShopRequest = resolve;
		});
		vi.spyOn(useNuxtApp().$api.voucher, 'getMany')
			.mockReturnValueOnce(shopResponse)
			.mockResolvedValueOnce(listingResponse({ ...voucher, code: 'PRODUCT10' }));

		store.setListingAllocationFilter(AllocationType.BILL);
		const pendingShop = store.getVouchers();
		store.setListingAllocationFilter(AllocationType.ITEM);
		await store.getVouchers();
		finishShopRequest(listingResponse(voucher));
		await pendingShop;

		expect(store.vouchers.map(({ code }) => code)).toEqual(['PRODUCT10']);
	});
});

describe('Mobile discount listing', () => {
	it('shows the discount value and applies search with the selected status', async () => {
		const load = vi.spyOn(useNuxtApp().$api.discount, 'getMany').mockResolvedValue({
			'data': [discount],
			'value': [discount],
			'count': 1,
			'@odata.count': 1,
		});
		const store = useDiscountStore();
		store.filter.status = 'active';
		const wrapper = await mountSuspended(DiscountsPage, { global: { stubs: panelStubs } });
		try {
			await flushPromises();
			const record = wrapper.get('section[aria-label="Discounts"] a[href="/marketing/discounts/SAVE10"]');
			expect(record.text()).toContain('10%');
			expect(wrapper.get('button[aria-label="Status"]').text()).toBe('Active');

			store.filter.current_page = 3;
			const input = wrapper.get('input[inputmode="search"]');
			await input.setValue('save10');
			await input.trigger('keydown', { key: 'Enter' });
			await flushPromises();
			expect(load).toHaveBeenLastCalledWith(expect.objectContaining({
				$filter: 'is_disabled eq false',
				$search: 'save10',
				$skip: 0,
			}));
		} finally {
			wrapper.unmount();
		}
	});
});
