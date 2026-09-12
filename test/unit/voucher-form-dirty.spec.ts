import { describe, expect, it } from 'vitest';
import { AllocationType, DiscountType } from 'yeppi-common';
import { emptyDiscountFormEditableState } from '../../app/utils/types/form/discount-creation';
import type { Discount } from '../../app/utils/types/discount';
import type { Voucher } from '../../app/utils/types/voucher';
import { isVoucherCreateDraftDirty, isVoucherEditFormDirty, voucherToEditFormState } from '../../app/utils/voucher/form-dirty';

const emptyVoucherDraft = {
	code: '',
	description: '',
	is_disabled: false,
	discount_code: '',
	starts_at: undefined,
	ends_at: undefined,
};

const makeDiscount = (overrides: Partial<Discount> = {}): Discount => ({
	code: 'SAVE10',
	description: 'Save 10',
	is_disabled: false,
	starts_at: null,
	ends_at: null,
	usage_limit: null,
	usage_count: 0,
	disc_type: DiscountType.PERCENTAGE,
	disc_value: 10,
	allocation: AllocationType.BILL,
	conditions: [],
	created_at: '2026-01-01T00:00:00.000Z',
	updated_at: '2026-01-01T00:00:00.000Z',
	...overrides,
});

const makeVoucher = (overrides: Partial<Voucher> = {}): Voucher => ({
	code: 'SAVE10',
	description: 'Save 10',
	is_disabled: false,
	starts_at: null,
	ends_at: null,
	usage_limit: null,
	usage_count: 0,
	usage_per_customer: null,
	created_at: '2026-01-01T00:00:00.000Z',
	updated_at: '2026-01-01T00:00:00.000Z',
	discount: makeDiscount(),
	...overrides,
});

describe('isVoucherCreateDraftDirty', () => {
	it('is clean for an empty voucher and default discount', () => {
		expect(isVoucherCreateDraftDirty(emptyVoucherDraft, emptyDiscountFormEditableState())).toBe(false);
	});

	it('is dirty when an existing discount is picked', () => {
		expect(isVoucherCreateDraftDirty({ ...emptyVoucherDraft, discount_code: 'SUMMER10' }, emptyDiscountFormEditableState())).toBe(true);
	});

	it('is dirty when the discount value changes from the default', () => {
		const discount = emptyDiscountFormEditableState();
		discount.disc_value = 15;
		expect(isVoucherCreateDraftDirty(emptyVoucherDraft, discount)).toBe(true);
	});

	it('is dirty when a condition is added', () => {
		const discount = emptyDiscountFormEditableState();
		discount.conditions = [{ filter_value: 'SKU1' }];
		expect(isVoucherCreateDraftDirty(emptyVoucherDraft, discount)).toBe(true);
	});

	it('ignores page-owned allocation on product create', () => {
		const discount = emptyDiscountFormEditableState();
		discount.allocation = AllocationType.ITEM;
		expect(isVoucherCreateDraftDirty(emptyVoucherDraft, discount)).toBe(false);
	});
});

describe('isVoucherEditFormDirty', () => {
	it('treats a hydrated voucher as clean', () => {
		const voucher = makeVoucher();
		expect(isVoucherEditFormDirty(voucherToEditFormState(voucher), voucher)).toBe(false);
	});

	it('is dirty when voucher description changes', () => {
		const voucher = makeVoucher();
		const model = voucherToEditFormState(voucher);
		model.description = 'Updated';
		expect(isVoucherEditFormDirty(model, voucher)).toBe(true);
	});

	it('is dirty when validity dates change', () => {
		const voucher = makeVoucher();
		const model = voucherToEditFormState(voucher);
		model.starts_at = '2026-04-14T00:00:00.000Z';
		expect(isVoucherEditFormDirty(model, voucher)).toBe(true);
	});

	it('ignores linked discount rule edits on the voucher form', () => {
		const voucher = makeVoucher();
		const model = voucherToEditFormState(voucher);
		voucher.discount.disc_value = 50;
		expect(isVoucherEditFormDirty(model, voucher)).toBe(false);
	});

	it('is dirty when the linked discount is retargeted', () => {
		const voucher = makeVoucher();
		const model = voucherToEditFormState(voucher);
		model.discount_code = 'WELCOME20';
		expect(isVoucherEditFormDirty(model, voucher)).toBe(true);
	});
});
