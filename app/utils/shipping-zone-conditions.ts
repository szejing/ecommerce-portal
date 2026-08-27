import { FilterOperator, ShippingZoneConditionField } from 'yeppi-common';

export type ShippingZoneConditionForm = {
	filter_operator: FilterOperator;
	field: ShippingZoneConditionField;
	values: string[];
};

export function defaultShippingZoneConditions(): ShippingZoneConditionForm[] {
	return [
		{
			filter_operator: FilterOperator.INCLUDE,
			field: ShippingZoneConditionField.COUNTRY,
			values: ['MY'],
		},
	];
}

export function hasIncludeCountry(conditions: ShippingZoneConditionForm[]): boolean {
	return conditions.some(
		(c) => c.filter_operator === FilterOperator.INCLUDE && c.field === ShippingZoneConditionField.COUNTRY && c.values.some((v) => v.trim()),
	);
}

export function conditionPairKey(operator: FilterOperator, field: ShippingZoneConditionField): string {
	return `${operator}:${field}`;
}

export function isConditionPairTaken(
	conditions: ShippingZoneConditionForm[],
	operator: FilterOperator,
	field: ShippingZoneConditionField,
	exceptIndex?: number,
): boolean {
	const key = conditionPairKey(operator, field);
	return conditions.some((c, i) => i !== exceptIndex && conditionPairKey(c.filter_operator, c.field) === key);
}

export function nextAvailableCondition(conditions: ShippingZoneConditionForm[]): ShippingZoneConditionForm | null {
	for (const filter_operator of Object.values(FilterOperator)) {
		for (const field of Object.values(ShippingZoneConditionField)) {
			if (!isConditionPairTaken(conditions, filter_operator, field)) {
				return { filter_operator, field, values: [] };
			}
		}
	}
	return null;
}

export function formatConditionValues(values: string[]): string {
	return values.map((v) => v.trim()).filter(Boolean).join(', ');
}

export function splitPostcodeText(text: string): string[] {
	return text
		.split(/[\n,]+/)
		.map((v) => v.trim().toUpperCase())
		.filter(Boolean);
}

export function zoneRegionSummary(conditions: ShippingZoneConditionForm[] | undefined): { country: string; details: string } {
	const rows = conditions ?? [];
	const includeCountry = rows.find((c) => c.filter_operator === FilterOperator.INCLUDE && c.field === ShippingZoneConditionField.COUNTRY);
	const country = formatConditionValues(includeCountry?.values ?? []);
	const details = rows
		.filter((c) => !(c.filter_operator === FilterOperator.INCLUDE && c.field === ShippingZoneConditionField.COUNTRY))
		.map((c) => `${c.filter_operator} ${c.field}: ${formatConditionValues(c.values)}`)
		.join(' · ');
	return { country, details };
}
