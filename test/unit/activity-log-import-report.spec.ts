import { describe, expect, it } from 'vitest';
import {
	formatImportReportFailedUnitsForClipboard,
	isImportReportMetadata,
	parseImportReport,
} from '~/utils/activity-log-import-report';

describe('activity-log-import-report', () => {
	it('detects product and customer import metadata only', () => {
		expect(isImportReportMetadata({ import_type: 'product' })).toBe(true);
		expect(isImportReportMetadata({ import_type: 'customer' })).toBe(true);
		expect(isImportReportMetadata({ import_type: 'shipment' })).toBe(false);
		expect(isImportReportMetadata({ total: 3 })).toBe(false);
		expect(isImportReportMetadata(null)).toBe(false);
	});

	it('parses Import Report counts and failed Import Units', () => {
		expect(
			parseImportReport({
				import_type: 'product',
				file_name: 'sitegiant.xlsx',
				total: 442,
				created: 3,
				updated: 0,
				failed: 439,
				errors: [
					{ row: 6, code: '1729', message: 'Failing row contains (null product_code)' },
					{ row: 280, code: '1837', message: 'Key (sku)=(1837) already exists.' },
					{ row: 'bad' },
				],
			}),
		).toEqual({
			import_type: 'product',
			file_name: 'sitegiant.xlsx',
			total: 442,
			created: 3,
			updated: 0,
			failed: 439,
			errors: [
				{ row: 6, code: '1729', message: 'Failing row contains (null product_code)' },
				{ row: 280, code: '1837', message: 'Key (sku)=(1837) already exists.' },
			],
		});
	});

	it('maps customer_no to Import Unit code for Customer Import', () => {
		expect(
			parseImportReport({
				import_type: 'customer',
				file_name: 'customers.xlsx',
				total: 2,
				created: 1,
				updated: 0,
				failed: 1,
				errors: [{ row: 4, customer_no: 'AB12CD34', message: 'duplicate email' }],
			}),
		).toEqual({
			import_type: 'customer',
			file_name: 'customers.xlsx',
			total: 2,
			created: 1,
			updated: 0,
			failed: 1,
			errors: [{ row: 4, code: 'AB12CD34', message: 'duplicate email' }],
		});
	});

	it('returns null when metadata is not an Import Report', () => {
		expect(parseImportReport({ courier_service: 'ABC' })).toBeNull();
	});

	it('formats failed Import Units for clipboard copy', () => {
		expect(
			formatImportReportFailedUnitsForClipboard([
				{ row: 6, code: '1729', message: 'null product_code' },
				{ row: 280, message: 'duplicate sku' },
			]),
		).toBe('row\tcode\tmessage\n6\t1729\tnull product_code\n280\t\tduplicate sku');
	});
});
