import type { FilterOperator, ShippingZoneConditionField } from 'yeppi-common';

export type CreateShippingZoneReq = {
	merchant_id: string;
	code: string;
	description?: string | null;
	is_active?: boolean;
	conditions?: {
		filter_operator: FilterOperator;
		field: ShippingZoneConditionField;
		values: string[];
	}[];
	rule?: number;
	methods: {
		shipping_method_id: number;
		fee: number;
		estimated_days?: number | null;
		order_cutoff_time?: string | null;
	}[];
};

/** API body without merchant context — the store injects `merchant_id`. */
export type ShippingZoneWriteBody = Omit<CreateShippingZoneReq, 'merchant_id'>;

/** Create flow: API-shaped fields plus UI-only `shipping_method_ids` (stripped before HTTP). */
export type ShippingZoneCreateStorePayload = ShippingZoneWriteBody & {
	shipping_method_ids: string[];
};
