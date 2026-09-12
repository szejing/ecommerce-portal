import { z } from 'zod';
import { CreateVoucherValidation } from './CreateVoucherValidation';

type TranslateFn = (key: string) => string;

/** Voucher create that attaches an existing Discount by code. */
export function CreatePickedVoucherFormValidation(t: TranslateFn) {
	return z.object({
		voucher: CreateVoucherValidation(t),
	});
}
