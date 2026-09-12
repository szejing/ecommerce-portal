import { z } from 'zod';
import { CreateVoucherValidation } from '../Create/CreateVoucherValidation';

type TranslateFn = (key: string) => string;

/** Voucher edit: voucher fields plus which Discount the code points at (retarget allowed). */
export function UpdateVoucherFormValidation(t: TranslateFn) {
	return z.object({
		voucher: CreateVoucherValidation(t),
	});
}
