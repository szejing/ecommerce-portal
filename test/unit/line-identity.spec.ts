import { ProductLineIdentity, VariantLineIdentity } from 'yeppi-common';
import { describe, expect, it } from 'vitest';
import {
	formatProductLineIdentity,
	formatVariantLineIdentity,
} from '../../app/utils/line-identity';

describe('formatProductLineIdentity', () => {
	const item = {
		prod_code: 'TEE',
		prod_name: 'Cotton Tee',
		prod_sku: 'TEE-001',
	};

	it('defaults to product code and name joined with a colon', () => {
		expect(formatProductLineIdentity(item)).toBe('TEE : Cotton Tee');
		expect(formatProductLineIdentity(item, '')).toBe('TEE : Cotton Tee');
		expect(formatProductLineIdentity(item, '   ')).toBe('TEE : Cotton Tee');
	});

	it('uses a fixed token order and skips blank SKU', () => {
		expect(formatProductLineIdentity(item, `${ProductLineIdentity.SKU},${ProductLineIdentity.CODE}`)).toBe(
			'TEE : TEE-001',
		);
		expect(formatProductLineIdentity({ ...item, prod_sku: '  ' }, ProductLineIdentity.SKU)).toBe('');
	});
});

describe('formatVariantLineIdentity', () => {
	const item = {
		prod_variant_code: 'TEE-RED-M',
		prod_variant_name: 'Red / M',
		prod_variant_sku: 'SKU-RED-M',
		prod_variant_barcode: '1234567890123',
	};

	it('is empty when the Order Item has no Variant', () => {
		expect(formatVariantLineIdentity({ prod_variant_name: 'Red / M', prod_variant_sku: 'SKU' })).toBe('');
		expect(formatVariantLineIdentity({ ...item, prod_variant_code: '  ' })).toBe('');
	});

	it('defaults to variant code and name and can include SKU and barcode in fixed order', () => {
		expect(formatVariantLineIdentity(item)).toBe('TEE-RED-M : Red / M');
		expect(
			formatVariantLineIdentity(
				item,
				`${VariantLineIdentity.BARCODE},${VariantLineIdentity.SKU},${VariantLineIdentity.NAME},${VariantLineIdentity.CODE}`,
			),
		).toBe('TEE-RED-M : Red / M : SKU-RED-M : 1234567890123');
	});
});
