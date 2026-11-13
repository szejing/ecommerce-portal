export type GeneratePaymentCheckout = {
	payment_request_id?: string;
	payment_url?: string | null;
	checkout_url?: string | null;
	purpose?: 'full' | 'deposit' | 'balance' | string;
	currency_code?: string;
	amount?: number;
	expires_at?: string | Date;
	status?: string;
	[key: string]: unknown;
};

export type GeneratePaymentResp = {
	checkout: GeneratePaymentCheckout | null;
};
