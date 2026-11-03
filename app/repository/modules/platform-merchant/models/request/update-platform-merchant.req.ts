import type { AccountStatus, Package, SubsDuration } from 'yeppi-common';

/** Matches ecommerce-backend `PlatformUpdateMerchantDto`. */
export type UpdatePlatformMerchantReq = {
	package?: Package;
	account?: AccountStatus;
	hide_store?: boolean;
	expiry_date?: string;
	extend_duration?: SubsDuration;
};
