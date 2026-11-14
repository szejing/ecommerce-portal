export type PaymentModel = {
	payment_line: number;
	payment_date_time: Date;
	payment_type_code: string;
	payment_type_desc: string;
	ref_no1: string;
	ref_no2: string;
	payment_amt: number;
	local_amt: number;
	currency_code: string;
	external_intg_type: number;
	payment_purpose?: 'full' | 'deposit' | 'balance' | string;
	payment_request_id?: string | null;
	metadata: Record<string, unknown>;
};
