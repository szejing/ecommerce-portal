/** Portal Payment QR wait — poll cadence and stop rules. */
export const PAYMENT_QR_POLL_MS = 5_000;
export const PAYMENT_QR_MAX_WAIT_MS = 10 * 60 * 1_000;
export const PAYMENT_QR_PAID_CLOSE_DELAY_MS = 1_500;

export type PaymentQrWaitTick =
	| { kind: 'paid' }
	| { kind: 'continue' }
	| { kind: 'timeout' };

/** Paid when Outstanding Balance is cleared (agreed QR wait rule). */
export function isPaymentQrWaitPaid(outstandingAmt: number | null | undefined): boolean {
	const outstanding = Number(outstandingAmt ?? 0);
	return Number.isFinite(outstanding) && outstanding <= 0;
}

export function resolvePaymentQrWaitTick(input: {
	outstandingAmt: number | null | undefined;
	elapsedMs: number;
	maxWaitMs?: number;
}): PaymentQrWaitTick {
	if (isPaymentQrWaitPaid(input.outstandingAmt)) {
		return { kind: 'paid' };
	}
	const maxWaitMs = input.maxWaitMs ?? PAYMENT_QR_MAX_WAIT_MS;
	if (input.elapsedMs >= maxWaitMs) {
		return { kind: 'timeout' };
	}
	return { kind: 'continue' };
}
