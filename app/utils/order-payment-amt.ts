/** Default payment amount for a new order payment: outstanding balance, else payable total. */
export function getDefaultOrderPaymentAmt(order: {
	outstanding_amt?: number | null;
	payable_total?: number | null;
	net_total?: number | null;
	net_amt?: number | null;
	shipping_fee?: number | null;
}): number {
	if (order.outstanding_amt != null && Number.isFinite(Number(order.outstanding_amt)) && Number(order.outstanding_amt) > 0) {
		return Number(order.outstanding_amt);
	}

	if (order.payable_total != null && Number.isFinite(Number(order.payable_total))) {
		return Number(order.payable_total);
	}

	const net = Number(order.net_total ?? order.net_amt ?? 0);
	const shipping = Number(order.shipping_fee ?? 0);
	return (Number.isFinite(net) ? net : 0) + (Number.isFinite(shipping) ? shipping : 0);
}
