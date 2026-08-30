import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { OrderItemStatus, OrderStatus, OrderType, PaymentStatus } from 'yeppi-common';
import OrderDetailItems from '~/components/Z/Section/Order/Detail/Items.vue';
import type { ItemModel } from '~/utils/models/item.model';
import type { OrderHistory } from '~/utils/types/order-history';

const item = (itemLine: number, status: OrderItemStatus, qty: number): ItemModel => ({
	item_line: itemLine,
	parent_item_line: 0,
	prod_code: `P-${itemLine}`,
	prod_name: `Product ${itemLine}`,
	prod_variant_code: `VAR-${itemLine}`,
	prod_variant_name: `Variant ${itemLine}`,
	currency_code: 'MYR',
	qty,
	unit_sell_price: 10,
	orig_sell_price: 10,
	gross_amt: qty * 10,
	net_amt: qty * 10,
	gross_amt_exc: qty * 10,
	net_amt_exc: qty * 10,
	status,
	taxes: [],
});

const order = (status: OrderStatus): OrderHistory => ({
	order_no: 'ORD-1',
	inv_no: 'ORD-1',
	type: 'order',
	status,
	payment_status: PaymentStatus.PENDING,
	order_type: OrderType.DELIVERY,
	items: [item(1, OrderItemStatus.ACTIVE, 2), item(2, OrderItemStatus.VOIDED, 7), item(3, OrderItemStatus.ACTIVE, 3)],
	fulfillments: [],
	payments: [],
	taxes: [],
	discounts: [],
	currency: { code: 'MYR', name: 'Malaysian ringgit', symbol: 'RM', is_active: true },
	gross_amt: 50,
	payable_total: 50,
} as unknown as OrderHistory);

describe('OrderDetailItems workbench', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('summarizes active fulfillment work and keeps excluded lines visible', async () => {
		const wrapper = await mountSuspended(OrderDetailItems, { props: { order: order(OrderStatus.PENDING_PAYMENT) } });

		expect(wrapper.get('[data-testid="order-item-workload"]').text()).toContain('2');
		expect(wrapper.get('[data-testid="order-item-workload"]').text()).toContain('5');
		expect(wrapper.get('[data-testid="order-item-excluded-count"]').text()).toContain('1');
		expect(wrapper.findAll('[data-testid="order-item-mobile-card"]')).toHaveLength(3);
		expect(wrapper.get('[data-testid="order-item-mobile-list"]').findAll('[data-testid="order-item-edit"]')).toHaveLength(2);
		expect(wrapper.get('[data-testid="order-item-table"]').findAll('[data-testid="order-item-edit"]')).toHaveLength(2);
	});

	it('does not advertise item editing after pending payment', async () => {
		const wrapper = await mountSuspended(OrderDetailItems, { props: { order: order(OrderStatus.COMPLETED) } });

		expect(wrapper.find('[data-testid="order-item-edit"]').exists()).toBe(false);
		expect(wrapper.text()).not.toContain('Editable');
	});

	it('highlights variant line identity as a secondary line', async () => {
		const wrapper = await mountSuspended(OrderDetailItems, { props: { order: order(OrderStatus.PENDING_PAYMENT) } });
		const variantLines = wrapper.findAll('[data-testid="order-item-variant-line"]');

		expect(variantLines.length).toBeGreaterThan(0);
		expect(variantLines[0].text()).toContain('VAR-1');
		expect(variantLines[0].classes()).toContain('order-item-variant-line');
		expect(variantLines[0].classes()).not.toContain('font-semibold');
		expect(variantLines[0].classes()).not.toContain('is-voided');
	});
});
