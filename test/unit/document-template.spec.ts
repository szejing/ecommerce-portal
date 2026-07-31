import { describe, expect, it } from 'vitest';
import {
	getRevisionActivationStatus,
	insertTemplateToken,
	resolveFieldValue,
	toUtcIsoOrNull,
} from '../../app/utils/document-template';

describe('document template helpers', () => {
	it('uses a property check to distinguish inherited, overridden, and catalog-approved blank values', () => {
		expect(resolveFieldValue(undefined, 'Aster Home', 'Wemotoo')).toEqual({
			value: 'Aster Home',
			source: 'store-profile',
		});
		expect(resolveFieldValue('', 'Aster Home', 'Wemotoo')).toEqual({
			value: '',
			source: 'override',
		});
		expect(resolveFieldValue(undefined, undefined, 'Wemotoo')).toEqual({
			value: 'Wemotoo',
			source: 'default',
		});
	});

	it.each([
		{ start: null, end: null, now: '2026-07-31T04:00:00.000Z', selected: true, expected: 'active' },
		{ start: '2026-08-01T00:00:00.000Z', end: null, now: '2026-07-31T04:00:00.000Z', selected: false, expected: 'scheduled' },
		{ start: null, end: '2026-07-31T04:00:00.000Z', now: '2026-07-31T04:00:00.000Z', selected: false, expected: 'expired' },
	])('derives $expected using inclusive start and exclusive end', row => {
		expect(getRevisionActivationStatus(row.start, row.end, new Date(row.now), row.selected)).toBe(row.expected);
	});

	it('labels an older eligible published revision as a fallback', () => {
		expect(getRevisionActivationStatus(null, null, new Date('2026-07-31T04:00:00.000Z'), false)).toBe('published-fallback');
	});

	it('serializes selected browser-local schedule dates exactly once and preserves open bounds', () => {
		expect(toUtcIsoOrNull(new Date('2026-07-31T04:00:00.000Z'))).toBe('2026-07-31T04:00:00.000Z');
		expect(toUtcIsoOrNull(null)).toBeNull();
	});

	it('inserts only catalog-approved tokens and reports the cursor after the inserted token', () => {
		expect(insertTemplateToken('Hello {{customer.name}}!', 6, 23, '{{merchant.name}}', ['{{merchant.name}}'])).toEqual({
			value: 'Hello {{merchant.name}}!',
			cursor: 23,
		});
		expect(insertTemplateToken('Hello', 5, 5, '{{unknown}}', ['{{merchant.name}}'])).toEqual({
			value: 'Hello',
			cursor: 5,
		});
	});
});
