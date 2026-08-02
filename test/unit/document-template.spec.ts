import { describe, expect, it } from 'vitest';
import {
	getRevisionActivationStatus,
	insertTemplateToken,
	normalizeTemplateToken,
	planPlainTextTokenChipify,
	removeTemplateTokenAt,
	resolveFieldValue,
	splitTemplateTokenSegments,
	templateTokenBoundsForDelete,
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

	it('normalizes bare names and braced tokens to {{name}}', () => {
		expect(normalizeTemplateToken('customer.name')).toBe('{{customer.name}}');
		expect(normalizeTemplateToken('{{customer.name}}')).toBe('{{customer.name}}');
	});

	it('plans Quill plain-text chipify only for allowlisted complete tokens', () => {
		expect(planPlainTextTokenChipify(
			[{ insert: 'Hi {{customer.name}} and {{unknown}}!\n' }],
			['{{customer.name}}'],
		)).toEqual([
			{ index: 3, length: 17, token: '{{customer.name}}' },
		]);
		expect(planPlainTextTokenChipify(
			[
				{ insert: 'Hi ' },
				{ insert: { templateToken: '{{customer.name}}' } },
				{ insert: ' and {{customer.name}}!\n' },
			],
			['{{customer.name}}'],
		)).toEqual([
			{ index: 9, length: 17, token: '{{customer.name}}' },
		]);
		expect(planPlainTextTokenChipify(
			[{ insert: 'Hello {{\n' }],
			['{{customer.name}}'],
		)).toEqual([]);
	});

	it('splits only allowlisted well-formed tokens into chip segments', () => {
		expect(splitTemplateTokenSegments('Hi {{customer.name}} and {{unknown}}!', ['{{customer.name}}'])).toEqual([
			{ type: 'text', value: 'Hi ' },
			{ type: 'token', value: '{{customer.name}}', start: 3, end: 20 },
			{ type: 'text', value: ' and {{unknown}}!' },
		]);
	});

	it('ignores nested or incomplete braces', () => {
		expect(splitTemplateTokenSegments('a {{b {{c}} d', ['{{c}}'])).toEqual([
			{ type: 'text', value: 'a {{b ' },
			{ type: 'token', value: '{{c}}', start: 6, end: 11 },
			{ type: 'text', value: ' d' },
		]);
		expect(splitTemplateTokenSegments('Hello {{', ['{{customer.name}}'])).toEqual([
			{ type: 'text', value: 'Hello {{' },
		]);
	});

	it('removes one token occurrence by range and places the cursor at the cut', () => {
		expect(removeTemplateTokenAt('Hi {{customer.name}}!', 3, 20)).toEqual({
			value: 'Hi !',
			cursor: 3,
		});
	});

	it('expands Backspace/Delete against an adjacent allowlisted token to the full chip range', () => {
		const value = 'Hi {{customer.name}}!';
		const allowed = ['{{customer.name}}'];
		expect(templateTokenBoundsForDelete(value, 20, 'Backspace', allowed)).toEqual({ start: 3, end: 20 });
		expect(templateTokenBoundsForDelete(value, 3, 'Delete', allowed)).toEqual({ start: 3, end: 20 });
		expect(templateTokenBoundsForDelete(value, 2, 'Backspace', allowed)).toBeNull();
		expect(templateTokenBoundsForDelete(value, 21, 'Delete', allowed)).toBeNull();
	});
});
