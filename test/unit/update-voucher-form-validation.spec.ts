import { describe, expect, it } from 'vitest';
import { UpdateVoucherFormValidation } from '../../app/utils/schema/Voucher/Update/UpdateVoucherFormValidation';

const t = (key: string) => key;

describe('UpdateVoucherFormValidation', () => {
	it('accepts voucher fields with a linked discount code', () => {
		const schema = UpdateVoucherFormValidation(t);
		const parsed = schema.parse({
			voucher: {
				code: 'V1',
				name: 'Test',
				is_disabled: false,
				description: 'Keep the linked discount',
				discount_code: 'SAVE10',
			},
		});
		expect(parsed.voucher.code).toBe('V1');
		expect(parsed.voucher.discount_code).toBe('SAVE10');
	});

	it('rejects update without a discount_code', () => {
		const schema = UpdateVoucherFormValidation(t);
		expect(() =>
			schema.parse({
				voucher: {
					code: 'V1',
					name: 'Test',
					is_disabled: false,
					discount_code: '',
				},
			}),
		).toThrow();
	});

	it('rejects voucher end before start', () => {
		const schema = UpdateVoucherFormValidation(t);
		expect(() =>
			schema.parse({
				voucher: {
					code: 'V1',
					name: 'Test',
					is_disabled: false,
					starts_at: '2026-02-01T00:00:00.000Z',
					ends_at: '2026-01-01T00:00:00.000Z',
				},
			}),
		).toThrow();
	});
});
