import { describe, expect, it } from 'vitest';
import { AccountStatus, Package, SubsDuration } from 'yeppi-common';
import { buildPlatformMerchantUpdateBody } from '~/utils/platform-merchant-update';

describe('buildPlatformMerchantUpdateBody', () => {
	const base = {
		package: Package.ECOMMERCE,
		account: AccountStatus.ACTIVE,
		hide_store: true,
		expiry_date: '2027-06-01',
		extend_duration: '' as const,
	};

	it('sends absolute expiry when no extend is selected', () => {
		expect(buildPlatformMerchantUpdateBody(base)).toEqual({
			package: Package.ECOMMERCE,
			account: AccountStatus.ACTIVE,
			hide_store: true,
			expiry_date: '2027-06-01',
		});
	});

	it('sends extend only when both expiry and extend are filled', () => {
		expect(
			buildPlatformMerchantUpdateBody({
				...base,
				extend_duration: SubsDuration.ONE_MONTH,
			}),
		).toEqual({
			package: Package.ECOMMERCE,
			account: AccountStatus.ACTIVE,
			hide_store: true,
			extend_duration: SubsDuration.ONE_MONTH,
		});
	});

	it('omits expiry fields when extend is empty and date is blank', () => {
		expect(
			buildPlatformMerchantUpdateBody({
				...base,
				expiry_date: '',
			}),
		).toEqual({
			package: Package.ECOMMERCE,
			account: AccountStatus.ACTIVE,
			hide_store: true,
		});
	});
});
