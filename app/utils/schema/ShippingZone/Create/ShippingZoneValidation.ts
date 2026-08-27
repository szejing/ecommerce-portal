import { z } from 'zod';
import { FilterOperator, ShippingZoneConditionField } from 'yeppi-common';

type TranslateFn = (key: string) => string;

const optionalNonNegativeInt = z.preprocess((v) => {
	if (v === undefined || v === null || v === '') {
		return undefined;
	}
	if (typeof v === 'number' && Number.isNaN(v)) {
		return undefined;
	}
	return v;
}, z.number().int().nonnegative().optional());

const optionalOrderCutoffTime = z.preprocess(
	(v) => {
		if (v === undefined || v === null || v === '') {
			return undefined;
		}
		return v;
	},
	z
		.string()
		.regex(/^([01]\d|2[0-3]):[0-5]\d$/)
		.optional(),
);

const methodPricingRow = z.object({
	fee: z.coerce.number().nonnegative(),
	estimated_days: optionalNonNegativeInt,
	order_cutoff_time: optionalOrderCutoffTime,
});

const conditionRow = (t: TranslateFn) =>
	z.object({
		filter_operator: z.nativeEnum(FilterOperator),
		field: z.nativeEnum(ShippingZoneConditionField),
		values: z.array(z.string().trim().min(1)).min(1, t('validation.shippingZone.conditionValuesRequired')),
	});

const shippingZoneFormSchema = (t: TranslateFn) => {
	return z
		.object({
			code: z.string().trim().min(1, t('validation.shippingZone.codeRequired')).max(32, t('validation.shippingZone.codeMax32')),
			description: z.string().trim().optional().default(''),
			rule: z.coerce.number().int().min(0).max(999_999).default(0),
			is_active: z.boolean(),
			conditions: z.array(conditionRow(t)).default([]),
			shipping_method_ids: z.array(z.string()).min(1, t('validation.shippingZone.methodsRequired')),
			method_pricing: z.record(z.string(), methodPricingRow),
		})
		.superRefine((val, ctx) => {
			const seen = new Set<string>();
			val.conditions.forEach((row, index) => {
				const key = `${row.filter_operator}:${row.field}`;
				if (seen.has(key)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: t('validation.shippingZone.conditionDuplicate'),
						path: ['conditions', index, 'field'],
					});
				}
				seen.add(key);
				if (row.field === ShippingZoneConditionField.COUNTRY) {
					row.values.forEach((code, vi) => {
						if (code.trim().length !== 2) {
							ctx.addIssue({
								code: z.ZodIssueCode.custom,
								message: t('validation.shippingZone.countryInvalid'),
								path: ['conditions', index, 'values', vi],
							});
						}
					});
				}
			});
			for (const id of val.shipping_method_ids) {
				const row = val.method_pricing[id];
				if (!row) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: t('validation.shippingZone.methodsRequired'),
						path: ['method_pricing', id],
					});
				}
			}
		});
};

export const CreateShippingZoneValidation = (t: TranslateFn) => shippingZoneFormSchema(t);

export const UpdateShippingZoneValidation = (t: TranslateFn) => shippingZoneFormSchema(t);
