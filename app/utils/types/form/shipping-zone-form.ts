import type { FilterOperator, ShippingZoneConditionField } from 'yeppi-common';
import type { ShippingZoneConditionForm } from '~/utils/shipping-zone-conditions';

export type ShippingZoneFormFields = {
	code: string;
	description: string;
	rule: number;
	is_active: boolean;
	conditions: ShippingZoneConditionForm[];
	shipping_method_ids: string[];
	method_pricing: Record<
		string,
		{
			fee: number;
			estimated_days: number | undefined;
			order_cutoff_time: string | undefined;
		}
	>;
};

export type { ShippingZoneConditionForm, FilterOperator, ShippingZoneConditionField };
