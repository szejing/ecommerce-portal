/** Order-level discount line (aligned with backend OrderDiscountDto). */
export type OrderDiscountModel = {
	disc_line: number;
	disc_code: string;
	disc_desc: string;
	disc_method: string;
	disc_rate: number;
	base_amt: number;
	disc_amt: number;
	adj_amt: number;
	max_disc_amt: number;
	metadata?: Record<string, unknown>;
};
