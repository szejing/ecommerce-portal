import { z } from 'zod';

type TranslateFn = (key: string) => string;

export type CreateVoucherValidationOptions = {
	/** Voucher code doubles as new discount code; discount picker is hidden. */
	linkDiscountToVoucher?: boolean;
};

export function CreateVoucherValidation(t: TranslateFn, opts?: CreateVoucherValidationOptions) {
	return z
		.object({
			code: z
				.string({ message: t('validation.voucher.codeRequired') })
				.min(1, t('validation.voucher.codeRequired'))
				.transform((s) => s.toUpperCase()),
			description: z.string().optional(),
			is_disabled: z.boolean().default(false),
			discount_code: opts?.linkDiscountToVoucher
				? z.string().optional()
				: z.string({ message: t('validation.voucher.discountCodeRequired') }).min(1, t('validation.voucher.discountCodeRequired')),
			starts_at: z.string().optional(),
			ends_at: z.string().optional(),
			usage_limit: z.number().int().positive().optional(),
		})
		.superRefine((data, ctx) => {
			if (data.starts_at && data.ends_at && data.starts_at > data.ends_at) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: t('validation.voucher.endBeforeStart'),
					path: ['ends_at'],
				});
			}
		});
}
