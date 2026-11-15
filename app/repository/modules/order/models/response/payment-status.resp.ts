import type { PaymentStatus } from 'yeppi-common';

export type PaymentStatusResp = {
	outstanding_amt: number;
	payment_status: PaymentStatus;
};
