import type { AccountStatus, Package } from 'yeppi-common';

export type PlatformMerchantRow = {
	merchant_id: string;
	name: string;
	platform?: string;
	package: Package;
	account: AccountStatus;
	hide_store: boolean;
	store_handle?: string | null;
	store_handle_locked?: boolean;
	expiry_date: string | Date;
	joined_date: string | Date;
	company_name?: string;
	company_email?: string;
	company_contact_person?: string;
	company_phone_no?: string;
	company_dial_code?: string;
	industry?: string;
};

export type PlatformMerchantListResp = {
	merchants: PlatformMerchantRow[];
	count: number;
};

export type PlatformMerchantResp = {
	merchant: PlatformMerchantRow;
};
