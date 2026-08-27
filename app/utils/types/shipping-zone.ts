import type { FilterOperator, ShippingZoneConditionField } from 'yeppi-common';

export type ShippingZoneCondition = {
	id?: number;
	filter_operator: FilterOperator;
	field: ShippingZoneConditionField;
	values: string[];
};

/** Mirrors `ShippingMethodBriefDto` in ecommerce-backend shipping-zone response DTO. */
export type ShippingMethodBrief = {
	id: number;
	description: string;
};

/** Mirrors `ShippingMethodZoneWithMethodDto` in ecommerce-backend shipping-zone response DTO. */
export type ShippingMethodZoneWithMethod = {
	id: string;
	fee: number;
	estimated_days?: number;
	order_cutoff_time?: string;
	shipping_method?: ShippingMethodBrief;
};

/** Mirrors `ShippingZoneWithLinksDto` in ecommerce-backend shipping-zone response DTO. */
export type ShippingZone = {
	code: string;
	description?: string;
	rule: number;
	is_active: boolean;
	conditions?: ShippingZoneCondition[];
	methods?: ShippingMethodZoneWithMethod[];
};

/** Mirrors `GetShippingZoneResponseDto` in ecommerce-backend shipping-zone response DTO. */
export type GetShippingZoneResponse = {
	shipping_zone: ShippingZone;
};

/** Mirrors `GetShippingZonesResponseDto` in ecommerce-backend shipping-zone response DTO. */
export type GetShippingZonesResponse = {
	shipping_zones: ShippingZone[];
	total: number;
};
