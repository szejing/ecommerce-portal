import { describe, expect, it } from 'vitest';
import { isMasterLoginId, MASTER_LOGIN_ID } from 'yeppi-common';
import { normalizeMerchantId } from '../../app/utils/auth/merchant-id';

describe('MASTER login sentinel', () => {
	it('normalizes MASTER and detects platform login', () => {
		expect(normalizeMerchantId('master')).toBe(MASTER_LOGIN_ID);
		expect(isMasterLoginId(normalizeMerchantId('master'))).toBe(true);
		expect(isMasterLoginId(normalizeMerchantId('M00001'))).toBe(false);
	});
});
