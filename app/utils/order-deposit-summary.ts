import type { OrderHistory } from '~/utils/types/order-history';

export type OrderDepositSummary = {
	hasDepositAgreement: boolean;
	payableTotal: number;
	depositRequired: number | null;
	collected: number;
	outstanding: number;
	released: number;
	isClosed: boolean;
	refundStatus: string | null;
	paymentReviewRequired: boolean;
	canAddPayment: boolean;
	canGenerateQr: boolean;
};

/** Derive deposit/balance display fields from an order detail payload. */
export function getOrderDepositSummary(order: OrderHistory | undefined | null): OrderDepositSummary {
	const payableTotal = Number(order?.payable_total ?? 0);
	const depositRequired =
		order?.deposit_required_amt != null && Number.isFinite(Number(order.deposit_required_amt))
			? Number(order.deposit_required_amt)
			: null;
	const collected =
		order?.collected_amt != null && Number.isFinite(Number(order.collected_amt))
			? Number(order.collected_amt)
			: (order?.payments ?? []).reduce((sum, p) => sum + Number(p.payment_amt ?? 0), 0);
	const released =
		order?.released_balance_amt != null && Number.isFinite(Number(order.released_balance_amt))
			? Number(order.released_balance_amt)
			: 0;
	const outstanding =
		order?.outstanding_amt != null && Number.isFinite(Number(order.outstanding_amt))
			? Number(order.outstanding_amt)
			: Math.max(0, payableTotal - collected - released);
	const isClosed = Boolean(order?.closed_at || order?.closure_reason);
	const hasDepositAgreement = depositRequired != null;

	return {
		hasDepositAgreement,
		payableTotal,
		depositRequired,
		collected,
		outstanding,
		released,
		isClosed,
		refundStatus: order?.refund_status ?? null,
		paymentReviewRequired: order?.payment_review_required === true,
		canAddPayment: !isClosed && outstanding > 0,
		canGenerateQr: !isClosed && outstanding > 0 && order?.can_pay_online !== false,
	};
}
