import { describe, expect, it } from 'vitest';
import { validateStoreHandle } from 'yeppi-common';
import { sanitizeStoreHandleInput } from '../../app/utils/store-handle-form';

describe('Store Handle form sanitization', () => {
	it('keeps lowercase kebab characters and does not invent a fallback handle', () => {
		expect(sanitizeStoreHandleInput(' Acme Tyres! ')).toBe('acme-tyres');
		expect(sanitizeStoreHandleInput('')).toBe('');
		expect(sanitizeStoreHandleInput('Y00001')).toBe('y00001');
	});

	it('blocks invalid submit the same way Store Profile save does', () => {
		expect(validateStoreHandle(sanitizeStoreHandleInput('')).ok).toBe(false);
		expect(validateStoreHandle(sanitizeStoreHandleInput('Y00001')).ok).toBe(false);
		expect(validateStoreHandle(sanitizeStoreHandleInput('acme-tyres')).ok).toBe(true);
	});
});
