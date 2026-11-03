import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { AccountStatus, Package, SubsDuration } from 'yeppi-common';
import PlatformMerchantModule from './platform-merchant';
import MerchantRoutes from '~/repository/routes.client';

describe('PlatformMerchantModule', () => {
	const call = mock(() => Promise.resolve({ merchants: [], count: 0 }));

	beforeEach(() => {
		call.mockReset();
		call.mockResolvedValue({ merchants: [], count: 0 });
	});

	it('lists with optional search query', async () => {
		const mod = new PlatformMerchantModule();
		(mod as unknown as { call: typeof call }).call = call;

		await mod.list('M00001');

		expect(call).toHaveBeenCalledWith({
			method: 'GET',
			url: MerchantRoutes.PlatformMerchants.Many(),
			query: { q: 'M00001' },
		});
	});

	it('creates and updates merchants', async () => {
		const mod = new PlatformMerchantModule();
		(mod as unknown as { call: typeof call }).call = call;
		call.mockResolvedValue({ merchant: { merchant_id: 'M00002' } });

		await mod.create({
			name: 'Store',
			package: Package.ECOMMERCE,
			duration: SubsDuration.ONE_YEAR,
			joined_date: '2026-01-01',
			account: AccountStatus.NEW,
			company_name: 'Co',
			company_ssm: '123',
			company_email: 'a@b.com',
			company_contact_person: 'A',
			company_phone_no: '123',
			company_dial_code: '60',
			company_address1: '1 St',
			company_city: 'KL',
			company_state: 'Kuala Lumpur',
			company_country: 'MY',
			company_postal_code: '50000',
		});

		expect(call).toHaveBeenCalledWith(
			expect.objectContaining({
				method: 'POST',
				url: MerchantRoutes.PlatformMerchants.Many(),
			}),
		);

		await mod.update('M00002', { hide_store: false, package: Package.FULL });

		expect(call).toHaveBeenLastCalledWith({
			method: 'PATCH',
			url: MerchantRoutes.PlatformMerchants.Single('M00002'),
			body: { hide_store: false, package: Package.FULL },
		});
	});
});
