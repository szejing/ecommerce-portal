import { z } from 'zod';

export type TranslateFn = (key: string) => string;

const Price = z.object({
	currency_code: z.string({ message: 'Currency code is required' }),
	orig_sell_price: z.number().min(0, { message: 'Original sell price is required' }),
	cost_price: z.number().optional().nullable(),
	sale_price: z.number().optional().nullable(),
});

// Relaxed price for variants: input may be string (e.g. empty) before coercion; validation in superRefine
const VariantPrice = z.object({
	currency_code: z.string().optional(),
	orig_sell_price: z.union([z.number(), z.string()]).optional(),
	cost_price: z.number().optional().nullable(),
	sale_price: z.number().optional().nullable(),
});

const Category = z.object({ code: z.string().optional(), name: z.string().optional() });

const Tag = z.object({ id: z.number().optional(), value: z.string().optional() });

const Option = z.object({ id: z.number().optional(), variation_id: z.number().optional(), value: z.string().optional() });

const Variation = z.object({ id: z.number().optional(), name: z.string().optional(), options: z.array(Option).optional() });

const buildVariant = (t: TranslateFn) => {
	return z.object({
		variant_code: z.string().optional().nullable(),
		product_code: z.string().optional().nullable(),
		name: z.string().optional().nullable(),
		sku: z.string().optional().nullable(),
		ean: z.string().optional().nullable(),
		upc: z.string().optional().nullable(),
		barcode: z.string().optional().nullable(),
		hs_code: z.string().optional().nullable(),
		inventory_quantity: z.number().optional().nullable(),
		allow_backorder: z.boolean().optional().nullable(),
		manage_inventory: z.boolean().optional().nullable(),
		weight: z.number().optional().nullable(),
		length: z.number().optional().nullable(),
		height: z.number().optional().nullable(),
		width: z.number().optional().nullable(),
		origin_country: z.string().optional().nullable(),
		material: z.string().optional().nullable(),
		price_types: z.array(VariantPrice).optional().nullable(),
		options: z.array(Option).optional().nullable(),
	});
};

export const createUpdateProductValidation = (t: TranslateFn) => {
	const Variant = buildVariant(t);
	const base = z.object({
		code: z
			.string({ message: t('validation.product.codeRequired') })
			.min(1, t('validation.product.codeRequired'))
			.max(16, t('validation.product.codeMax16')),
		name: z.string({ message: t('validation.product.nameRequired') }).min(1, t('validation.product.nameRequired')),
		short_desc: z.string({ message: t('validation.product.shortDescRequired') }).min(1, t('validation.product.shortDescRequired')),
		long_desc: z.string().optional().nullable(),
		is_active: z.boolean().default(true),
		status: z.string({ message: t('validation.product.statusRequired') }),
		categories: z.array(Category).optional().nullable(),
		tags: z.array(Tag).optional().nullable(),
		price_types: z.array(Price).min(1, t('validation.product.priceRequired')),
		variations: z.array(Variation).optional().nullable(),
		variants: z.array(Variant).optional().nullable(),
		type_id: z.number().default(1),
	});
	return base.superRefine((data, ctx) => {
		const variants = data.variants ?? [];
		for (let i = 0; i < variants.length; i++) {
			const pt = variants[i]?.price_types?.[0];
			const raw = pt?.orig_sell_price;
			const price = typeof raw === 'string' ? Number.parseFloat(raw) : raw;
			if (pt == null || typeof price !== 'number' || Number.isNaN(price) || price < 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: t('validation.product.variantPriceRequired'),
					path: ['variants', i, 'price_types', 0, 'orig_sell_price'],
				});
			}
		}
	});
};

const PriceLegacy = z.object({
	id: z.number().optional(),
	currency_code: z.string({ message: 'Currency code is required' }),
	orig_sell_price: z.number({ message: 'Original sell price is required' }),
	cost_price: z.number().optional(),
	sale_price: z.number().optional(),
});

const VariantLegacy = z.object({
	variant_code: z.string().optional().nullable(),
	product_code: z.string().optional().nullable(),
	name: z.string().optional().nullable(),
	sku: z.string().optional().nullable(),
	ean: z.string().optional().nullable(),
	upc: z.string().optional().nullable(),
	barcode: z.string().optional().nullable(),
	hs_code: z.string().optional().nullable(),
	inventory_quantity: z.number().optional().nullable(),
	allow_backorder: z.boolean().optional().nullable(),
	manage_inventory: z.boolean().optional().nullable(),
	weight: z.number().optional().nullable(),
	length: z.number().optional().nullable(),
	height: z.number().optional().nullable(),
	width: z.number().optional().nullable(),
	origin_country: z.string().optional().nullable(),
	material: z.string().optional().nullable(),
	price_types: z.array(PriceLegacy).optional().nullable(),
	options: z.array(Option).optional().nullable(),
});

/** @deprecated Use createUpdateProductValidation(t) for i18n. */
export const UpdateProductValidation = z.object({
	code: z.string({ message: 'Code is required' }).min(1, 'Code is required'),
	name: z.string({ message: 'Name is required' }).min(1, 'Name is required'),
	short_desc: z.string({ message: 'Short description is required' }).min(1, 'Short description is required'),
	long_desc: z.string().optional().nullable(),
	is_active: z.boolean().default(true),
	status: z.string({ message: 'Status is required' }),
	categories: z.array(Category).optional().nullable(),
	tags: z.array(Tag).optional().nullable(),
	price_types: z.array(PriceLegacy).min(1, 'At least one price is required'),
	variations: z.array(Variation).optional().nullable(),
	variants: z.array(VariantLegacy).optional().nullable(),
	type_id: z.number().default(1),
});
