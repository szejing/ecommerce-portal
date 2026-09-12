import { describe, expect, it } from 'vitest';
import { CreatePickedVoucherFormValidation } from '../../app/utils/schema/Voucher/Create/CreatePickedVoucherFormValidation';
import { CreateVoucherValidation } from '../../app/utils/schema/Voucher/Create/CreateVoucherValidation';

const t = (key: string) => key;

describe('CreateVoucherValidation', () => {
	it('accepts minimal valid payload', () => {
		const schema = CreateVoucherValidation(t);
		const parsed = schema.parse({
			code: 'V1',
			name: 'Test',
			is_disabled: false,
			discount_code: 'D1',
		});
		expect(parsed.code).toBe('V1');
	});

	it('normalizes code to uppercase', () => {
		const schema = CreateVoucherValidation(t);
		const parsed = schema.parse({
			code: 'v1',
			name: 'Test',
			is_disabled: false,
			discount_code: 'D1',
		});
		expect(parsed.code).toBe('V1');
	});

	it('rejects empty code', () => {
		const schema = CreateVoucherValidation(t);
		expect(() =>
			schema.parse({
				code: '',
				name: 'Test',
				is_disabled: false,
				discount_code: 'D1',
			}),
		).toThrow();
	});

	it('rejects end before start', () => {
		const schema = CreateVoucherValidation(t);
		expect(() =>
			schema.parse({
				code: 'V1',
				name: 'Test',
				is_disabled: false,
				discount_code: 'D1',
				starts_at: '2026-02-01T00:00:00.000Z',
				ends_at: '2026-01-01T00:00:00.000Z',
			}),
		).toThrow();
	});

	it('accepts optional positive usage_limit', () => {
		const schema = CreateVoucherValidation(t);
		const parsed = schema.parse({
			code: 'V1',
			name: 'Test',
			is_disabled: false,
			discount_code: 'D1',
			usage_limit: 100,
		});
		expect(parsed.usage_limit).toBe(100);
	});

	it('rejects empty discount_code when picking an existing discount', () => {
		const schema = CreateVoucherValidation(t);
		expect(() =>
			schema.parse({
				code: 'V1',
				is_disabled: false,
				discount_code: '',
			}),
		).toThrow();
	});
});

describe('CreatePickedVoucherFormValidation', () => {
	it('accepts a voucher that points at an existing discount', () => {
		const schema = CreatePickedVoucherFormValidation(t);
		const parsed = schema.parse({
			voucher: {
				code: 'V1',
				is_disabled: false,
				discount_code: 'SUMMER10',
			},
		});
		expect(parsed.voucher.discount_code).toBe('SUMMER10');
	});

	it('rejects pick-create without a discount_code', () => {
		const schema = CreatePickedVoucherFormValidation(t);
		expect(() =>
			schema.parse({
				voucher: {
					code: 'V1',
					is_disabled: false,
					discount_code: '',
				},
			}),
		).toThrow();
	});
});
