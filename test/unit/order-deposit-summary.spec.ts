import { describe, expect, it } from 'vitest';
import { getOrderDepositSummary } from '~/utils/order-deposit-summary';
import type { OrderHistory } from '~/utils/types/order-history';

describe('getOrderDepositSummary', () => {
	it('shows outstanding balance and enables add payment + QR after a deposit', () => {
		const order = {
			order_no: 'ORD-1',
			payable_total: 200,
			deposit_required_amt: 50,
			collected_amt: 50,
			outstanding_amt: 150,
			released_balance_amt: 0,
			can_pay_online: true,
			payments: [{ payment_amt: 50 }],
		} as unknown as OrderHistory;

		const summary = getOrderDepositSummary(order);

		expect(summary.hasDepositAgreement).toBe(true);
		expect(summary.depositRequired).toBe(50);
		expect(summary.collected).toBe(50);
		expect(summary.outstanding).toBe(150);
		expect(summary.canAddPayment).toBe(true);
		expect(summary.canGenerateQr).toBe(true);
	});

	it('disables payment actions after no-show closure with released balance', () => {
		const order = {
			order_no: 'ORD-2',
			payable_total: 200,
			deposit_required_amt: 50,
			collected_amt: 50,
			outstanding_amt: 0,
			released_balance_amt: 150,
			closed_at: '2026-11-13T10:00:00.000Z',
			closure_reason: 'no_show',
			refund_status: null,
		} as unknown as OrderHistory;

		const summary = getOrderDepositSummary(order);

		expect(summary.isClosed).toBe(true);
		expect(summary.released).toBe(150);
		expect(summary.canAddPayment).toBe(false);
		expect(summary.canGenerateQr).toBe(false);
	});
});
