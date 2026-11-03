import type { AccountStatus, Package, SubsDuration } from 'yeppi-common';

/** Matches ecommerce-backend `PlatformCreateMerchantDto`. */
export type CreatePlatformMerchantReq = {
	name: string;
	package: Package;
	duration: SubsDuration;
	joined_date: string | Date;
	account: AccountStatus;
	industry?: string;
	company_name: string;
	company_ssm: string;
	company_email: string;
	company_contact_person: string;
	company_phone_no: string;
	company_dial_code: string;
	company_address1: string;
	company_address2?: string | null;
	company_address3?: string | null;
	company_city: string;
	company_state: string;
	company_country: string;
	company_postal_code: string;
};
