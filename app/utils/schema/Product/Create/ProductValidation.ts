import { z } from 'zod';
import { PRODUCT_SHORT_DESC_MAX } from 'yeppi-common';
import { duplicateVariantSkuIndexes } from '~/utils/product-variant-list';

const Price = z.object({
	currency_code: z.string({ message: 'Currency code is required' }),
	orig_sell_price: z.number().min(0, { message: 'Original sell price is required' }),
	cost_price: z.number().optional().nullable(),
	sale_price: z.number().optional().nullable(),
});

const Category = z.object({ code: z.string().optional(), name: z.string().optional() });

const Tag = z.object({ id: z.number().optional(), value: z.string().optional() });

const Option = z.object({ id: z.number().optional(), variation_id: z.number().optional(), value: z.string().optional() });

const Variation = z.object({ id: z.number().optional(), name: z.string().optional(), options: z.array(Option).optional() });

// Relaxed price for variants: input may be string (e.g. empty) before coercion; validation in superRefine
const VariantPrice = z.object({
	currency_code: z.string().optional(),
	orig_sell_price: z.union([z.number(), z.string()]).optional(),
	cost_price: z.number().optional().nullable(),
	sale_price: z.number().optional().nullable(),
});

const Variant = z.object({
	variant_code: z.string().optional(),
	product_code: z.string().optional(),
	name: z.string().optional(),
	sku: z.string().optional(),
	ean: z.string().optional(),
	upc: z.string().optional(),
	barcode: z.string().optional(),
	hs_code: z.string().optional(),
	inventory_quantity: z.number().optional(),
	allow_backorder: z.boolean().optional(),
	manage_inventory: z.boolean().optional(),
	weight: z.number().optional(),
	length: z.number().optional(),
	height: z.number().optional(),
	width: z.number().optional(),
	origin_country: z.string().optional(),
	material: z.string().optional(),
	price_types: z.array(VariantPrice).optional(),
	variations: z.array(Variation).optional(),
});

const createProductBase = z.object({
	code: z.string().optional(),
	name: z.string({ message: 'Name is required' }).min(1, 'Name is required'),
	short_desc: z
		.string({ message: 'Short description is required' })
		.min(1, 'Short description is required')
		.max(PRODUCT_SHORT_DESC_MAX, 'Short description must be at most 250 characters'),
	long_desc: z.string().optional(),
	is_active: z.boolean().default(true),

	status: z.string({ message: 'Status is required' }),
	// categories
	categories: z.array(Category).optional(),
	// tags
	tags: z.array(Tag).optional(),
	// prices
	price_types: z.array(Price).min(1, 'At least one price is required'),
	// variations
	variations: z.array(Variation).optional(),
	// variants
	variants: z.array(Variant).optional(),
	// FK to merchant product_types (BasicInfo uses type_id)
	type_id: z.number().default(1),
});

const VARIANT_PRICE_REQUIRED_MSG = 'Price is required for this variant';
const VARIANT_SKU_DUPLICATE_MSG = 'This SKU is already used by another variant';

export const CreateProductValidation = createProductBase.superRefine((data, ctx) => {
	const variants = data.variants ?? [];
	for (let i = 0; i < variants.length; i++) {
		const pt = variants[i]?.price_types?.[0];
		const raw = pt?.orig_sell_price;
		const price = typeof raw === 'string' ? Number.parseFloat(raw) : raw;
		if (
			pt == null ||
			typeof price !== 'number' ||
			Number.isNaN(price) ||
			price < 0
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: VARIANT_PRICE_REQUIRED_MSG,
				path: ['variants', i, 'price_types', 0, 'orig_sell_price'],
			});
		}
	}
	for (const index of duplicateVariantSkuIndexes(variants)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: VARIANT_SKU_DUPLICATE_MSG,
			path: ['variants', index, 'sku'],
		});
	}
});
