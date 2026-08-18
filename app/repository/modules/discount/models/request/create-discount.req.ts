import type { AllocationType, DiscountType, FilterCondition, FilterOperator } from 'yeppi-common';

/** Matches ecommerce-backend `CreateDiscountConditionDto` (flat filter fields). */
export type CreateDiscountConditionReq = {
	filter_operator?: FilterOperator;
	filter_condition?: FilterCondition;
	filter_value?: string;
};

/** Matches ecommerce-backend `CreateDiscountDto`. */
export type CreateDiscountReq = {
	code?: string;
	description?: string;
	is_disabled?: boolean;
	starts_at?: string;
	ends_at?: string;
	usage_limit?: number;
	disc_type: DiscountType;
	disc_value: number;
	allocation?: AllocationType;
	min_order_amt?: number;
	max_disc_amt?: number;
	conditions?: CreateDiscountConditionReq[];
	metadata?: Record<string, unknown>;
};
