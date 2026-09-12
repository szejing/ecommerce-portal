import { DiscountType } from 'yeppi-common';
import type { DiscountCreate } from '~/utils/types/form/discount-creation';
import type { VoucherFormState } from '~/utils/types/form/voucher-creation';
import type { Voucher } from '~/utils/types/voucher';
import { voucherDateToFormIso } from './date';

/** Create-page dirty check against empty voucher + default discount (10% off). Allocation is page-owned. */
export function isVoucherCreateDraftDirty(voucher: Partial<VoucherFormState>, discount: DiscountCreate): boolean {
	const voucherDirty = !!(
		voucher.code?.trim() ||
		voucher.description?.trim() ||
		voucher.starts_at ||
		voucher.ends_at ||
		voucher.is_disabled === true ||
		!!voucher.discount_code?.trim() ||
		(voucher.usage_limit != null && voucher.usage_limit > 0)
	);
	const discountDirty = !!(
		discount.disc_type !== DiscountType.PERCENTAGE ||
		discount.disc_value !== 10 ||
		discount.usage_limit != null ||
		discount.min_order_amt != null ||
		discount.max_disc_amt != null ||
		(discount.conditions?.length ?? 0) > 0 ||
		discount.starts_at != null ||
		discount.ends_at != null
	);
	return voucherDirty || discountDirty;
}

function snapshotVoucherEditFields(voucher: Partial<VoucherFormState>): string {
	return JSON.stringify({
		code: voucher.code?.trim() ?? '',
		description: voucher.description?.trim() ?? '',
		is_disabled: !!voucher.is_disabled,
		discount_code: voucher.discount_code?.trim() ?? '',
		starts_at: voucher.starts_at ?? null,
		ends_at: voucher.ends_at ?? null,
		usage_limit: voucher.usage_limit ?? null,
	});
}

export function voucherToEditFormState(voucher: Voucher): VoucherFormState {
	const nameFromApi = (voucher as Voucher & { name?: string }).name?.trim();
	return {
		code: voucher.code,
		name: nameFromApi || voucher.description?.trim() || voucher.code,
		description: voucher.description || '',
		is_disabled: voucher.is_disabled ?? false,
		discount_code: voucher.discount?.code || '',
		starts_at: voucherDateToFormIso(voucher.starts_at),
		ends_at: voucherDateToFormIso(voucher.ends_at),
		usage_limit: voucher.usage_limit != null && voucher.usage_limit > 0 ? voucher.usage_limit : undefined,
	};
}

export function isVoucherEditFormDirty(current: VoucherFormState, original: Voucher): boolean {
	return snapshotVoucherEditFields(current) !== snapshotVoucherEditFields(voucherToEditFormState(original));
}
