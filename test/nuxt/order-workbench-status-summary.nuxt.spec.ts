import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { OrderStatus, OrderType, PaymentStatus } from 'yeppi-common';
import OrderWorkbenchStatusSummary from '~/components/Order/Workbench/StatusSummary.vue';
import type { FulfillmentBatch } from '~/utils/types/order-fulfillment-shipping';
import type { OrderHistory } from '~/utils/types/order-history';

const fulfillment = (status: FulfillmentBatch['status'], shipmentStatus: FulfillmentBatch['shipment_status'], id = 'batch-1'): FulfillmentBatch => ({
	id,
	order_no: 'ORD-1',
	inv_no: 'ORD-1',
	batch_no: 1,
	status,
	shipment_status: shipmentStatus,
	shipping_method: null,
	shipping_zone_id: null,
	shipping_fee: 0,
	courier_id: null,
	courier_name: null,
	tracking_no: null,
	packed_at: null,
	shipped_at: null,
	delivered_at: null,
	created_at: '2026-08-30T00:00:00.000Z',
	updated_at: '2026-08-30T00:00:00.000Z',
});

const order = (override: Partial<OrderHistory>): OrderHistory => ({
	order_no: 'ORD-1',
	inv_no: 'ORD-1',
	type: 'order',
	status: OrderStatus.CONFIRMED,
	payment_status: PaymentStatus.PENDING,
	order_type: OrderType.DELIVERY,
	fulfillments: [fulfillment('packed', 'pending')],
	...override,
} as unknown as OrderHistory);

describe('OrderWorkbenchStatusSummary', () => {
	it('shows independent order, payment, and fulfillment states', async () => {
		const wrapper = await mountSuspended(OrderWorkbenchStatusSummary, { props: { order: order({}) } });

		expect(wrapper.get('[data-testid="workbench-order-status"]').text()).toContain('Confirmed');
		expect(wrapper.get('[data-testid="workbench-payment-status"]').text()).toContain('Pending');
		expect(wrapper.get('[data-testid="workbench-fulfillment-status"]').text()).toContain('Pending');
	});

	it('represents pickup without inventing a shipment state', async () => {
		const wrapper = await mountSuspended(OrderWorkbenchStatusSummary, {
			props: {
				order: order({ status: OrderStatus.READY_FOR_PICKUP, order_type: OrderType.PICKUP, fulfillments: [] }),
			},
		});

		expect(wrapper.get('[data-testid="workbench-order-status"]').text()).toContain('Ready for Pickup');
		expect(wrapper.get('[data-testid="workbench-fulfillment-status"]').text()).toContain('Pickup');
		expect(wrapper.findComponent({ name: 'ZSelectMenuShipmentStatus' }).exists()).toBe(false);
	});

	it('renders one labelled group instead of stacked status cards', async () => {
		const wrapper = await mountSuspended(OrderWorkbenchStatusSummary, { props: { order: order({}) } });

		expect(wrapper.element.tagName).toBe('DL');
		expect(wrapper.findAll('.state-summary-item')).toHaveLength(3);
		expect(wrapper.findAll('.state-summary-item dt')).toHaveLength(3);
	});

	it('advances to the next status and can jump to completed', async () => {
		const wrapper = await mountSuspended(OrderWorkbenchStatusSummary, {
			props: { order: order({ status: OrderStatus.CONFIRMED, order_type: OrderType.DELIVERY }) },
		});

		await wrapper.get('[data-testid="workbench-order-status-next"]').trigger('click');
		expect(wrapper.emitted('update:status')?.[0]).toEqual([OrderStatus.PAID]);

		await wrapper.get('[data-testid="workbench-order-status-complete"]').trigger('click');
		expect(wrapper.emitted('update:status')?.[1]).toEqual([OrderStatus.COMPLETED]);
	});

	it('hides next and complete shortcuts on a completed order', async () => {
		const wrapper = await mountSuspended(OrderWorkbenchStatusSummary, {
			props: { order: order({ status: OrderStatus.COMPLETED }) },
		});

		expect(wrapper.find('[data-testid="workbench-order-status-next"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="workbench-order-status-complete"]').exists()).toBe(false);
		expect(wrapper.get('[data-testid="workbench-order-status"]').text()).toContain('Completed');
	});

	it('emits payment status changes from the payment select', async () => {
		const wrapper = await mountSuspended(OrderWorkbenchStatusSummary, { props: { order: order({}) } });

		const paymentSelect = wrapper.findComponent({ name: 'ZSelectMenuPaymentStatus' });
		expect(paymentSelect.exists()).toBe(true);
		await paymentSelect.vm.$emit('update:paymentStatus', PaymentStatus.PAID);

		expect(wrapper.emitted('update:paymentStatus')?.[0]).toEqual([PaymentStatus.PAID]);
	});

	it('advances payment status with next and complete shortcuts', async () => {
		const wrapper = await mountSuspended(OrderWorkbenchStatusSummary, {
			props: { order: order({ payment_status: PaymentStatus.PENDING }) },
		});

		await wrapper.get('[data-testid="workbench-payment-status-next"]').trigger('click');
		expect(wrapper.emitted('update:paymentStatus')?.[0]).toEqual([PaymentStatus.PARTIALLY_PAID]);

		await wrapper.get('[data-testid="workbench-payment-status-complete"]').trigger('click');
		expect(wrapper.emitted('update:paymentStatus')?.[1]).toEqual([PaymentStatus.PAID]);
	});

	it('emits shipment status changes when batches share one shipment status', async () => {
		const wrapper = await mountSuspended(OrderWorkbenchStatusSummary, {
			props: { order: order({ fulfillments: [fulfillment('packed', 'pending')] }) },
		});

		const shipmentSelect = wrapper.findComponent({ name: 'ZSelectMenuShipmentStatus' });
		expect(shipmentSelect.exists()).toBe(true);
		await shipmentSelect.vm.$emit('update:shipmentStatus', 'shipped');

		expect(wrapper.emitted('update:shipmentStatus')?.[0]).toEqual(['shipped']);
	});

	it('advances shipment status with next and complete shortcuts', async () => {
		const wrapper = await mountSuspended(OrderWorkbenchStatusSummary, {
			props: { order: order({ fulfillments: [fulfillment('packed', 'pending')] }) },
		});

		await wrapper.get('[data-testid="workbench-shipment-status-next"]').trigger('click');
		expect(wrapper.emitted('update:shipmentStatus')?.[0]).toEqual(['shipped']);

		await wrapper.get('[data-testid="workbench-shipment-status-complete"]').trigger('click');
		expect(wrapper.emitted('update:shipmentStatus')?.[1]).toEqual(['delivered']);
	});

	it('keeps a read-only fulfillment badge when shipment statuses differ', async () => {
		const wrapper = await mountSuspended(OrderWorkbenchStatusSummary, {
			props: {
				order: order({
					fulfillments: [
						fulfillment('packed', 'pending', 'batch-1'),
						fulfillment('fulfilled', 'shipped', 'batch-2'),
					],
				}),
			},
		});

		expect(wrapper.findComponent({ name: 'ZSelectMenuShipmentStatus' }).exists()).toBe(false);
		expect(wrapper.get('[data-testid="workbench-fulfillment-status"]').text()).toContain('Processing');
	});
});
