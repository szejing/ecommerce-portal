import { describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { OrderStatus, PaymentStatus } from 'yeppi-common';
import OrderDetailPayment from '~/components/Z/Section/Order/Detail/Payment.vue';
import type { OrderHistory } from '~/utils/types/order-history';

vi.mock('#components', async () => {
	const actual = await vi.importActual<Record<string, unknown>>('#components');
	return {
		...actual,
		ZModalOrderDetailPayment: { name: 'ZModalOrderDetailPayment', template: '<div />' },
		ZModalOrderPaymentQr: { name: 'ZModalOrderPaymentQr', template: '<div />' },
	};
});

const depositOrder = {
	order_no: 'ORD-DEP',
	status: OrderStatus.PROCESSING,
	payment_status: PaymentStatus.PARTIALLY_PAID,
	payable_total: 200,
	deposit_required_amt: 50,
	collected_amt: 50,
	outstanding_amt: 150,
	released_balance_amt: 0,
	can_pay_online: true,
	currency: { code: 'MYR' },
	payments: [
		{
			payment_line: 1,
			payment_date_time: new Date('2026-11-13T10:00:00.000Z'),
			payment_type_code: 'FIUU',
			payment_type_desc: 'Fiuu',
			ref_no1: 'DEP-1',
			ref_no2: '',
			payment_amt: 50,
			local_amt: 50,
			currency_code: 'MYR',
			external_intg_type: 0,
			payment_purpose: 'deposit',
			metadata: {},
		},
	],
} as unknown as OrderHistory;

describe('OrderDetailPayment deposit summary', () => {
	it('shows deposit money rows and both Add payment and Generate QR after a deposit', async () => {
		const wrapper = await mountSuspended(OrderDetailPayment, { props: { order: depositOrder } });

		expect(wrapper.get('[data-testid="deposit-summary"]').text()).toContain('150');
		expect(wrapper.find('[data-testid="add-payment-btn"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="generate-payment-qr-btn"]').exists()).toBe(true);
	});
});
