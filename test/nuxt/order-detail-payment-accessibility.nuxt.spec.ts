import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { OrderStatus, PaymentStatus } from 'yeppi-common';
import OrderDetailPayment from '~/components/Z/Section/Order/Detail/Payment.vue';
import type { OrderHistory } from '~/utils/types/order-history';

const order = {
	order_no: 'ORD-1',
	status: OrderStatus.PROCESSING,
	payment_status: PaymentStatus.PAID,
	payments: [
		{
			payment_line: 1,
			payment_date_time: new Date('2026-08-30T10:00:00.000Z'),
			payment_type_code: 'CARD',
			payment_type_desc: 'Card',
			ref_no1: 'REF-1',
			ref_no2: '',
			payment_amt: 25,
			local_amt: 25,
			currency_code: 'MYR',
			external_intg_type: 0,
			metadata: {},
		},
	],
} as unknown as OrderHistory;

describe('OrderDetailPayment accessibility', () => {
	it('renders each payment as a named native button', async () => {
		const wrapper = await mountSuspended(OrderDetailPayment, { props: { order } });
		const payment = wrapper.get('[data-testid="payment-item"]');

		expect(payment.element.tagName).toBe('BUTTON');
		expect(payment.attributes('type')).toBe('button');
		expect(payment.attributes('aria-label')).toContain('Card');
		expect(payment.attributes('aria-label')).toContain('MYR');
	});
});
