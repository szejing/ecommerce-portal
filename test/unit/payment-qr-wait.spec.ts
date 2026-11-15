import { describe, expect, it } from 'vitest';
import {
	PAYMENT_QR_MAX_WAIT_MS,
	isPaymentQrWaitPaid,
	resolvePaymentQrWaitTick,
} from '~/utils/payment-qr-wait';

describe('payment-qr-wait', () => {
	it('treats outstanding <= 0 as paid', () => {
		expect(isPaymentQrWaitPaid(0)).toBe(true);
		expect(isPaymentQrWaitPaid(-0.01)).toBe(true);
		expect(isPaymentQrWaitPaid(0.01)).toBe(false);
	});

	it('resolves paid before timeout', () => {
		expect(
			resolvePaymentQrWaitTick({ outstandingAmt: 0, elapsedMs: 1_000 }),
		).toEqual({ kind: 'paid' });
	});

	it('continues while outstanding remains and under max wait', () => {
		expect(
			resolvePaymentQrWaitTick({
				outstandingAmt: 140,
				elapsedMs: PAYMENT_QR_MAX_WAIT_MS - 1,
			}),
		).toEqual({ kind: 'continue' });
	});

	it('times out when max wait is reached while still outstanding', () => {
		expect(
			resolvePaymentQrWaitTick({
				outstandingAmt: 140,
				elapsedMs: PAYMENT_QR_MAX_WAIT_MS,
			}),
		).toEqual({ kind: 'timeout' });
	});
});
