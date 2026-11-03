import type { AccountStatus, Package, SubsDuration } from 'yeppi-common';
import type { UpdatePlatformMerchantReq } from '~/repository/modules/platform-merchant/models/request/update-platform-merchant.req';

export type PlatformMerchantEditForm = {
	package: Package;
	account: AccountStatus;
	hide_store: boolean;
	expiry_date: string;
	extend_duration: '' | SubsDuration;
};

/**
 * Build PATCH body for Platform Merchant update.
 * Extend and absolute expiry are mutually exclusive — extend wins when selected.
 */
export function buildPlatformMerchantUpdateBody(
	form: PlatformMerchantEditForm,
): UpdatePlatformMerchantReq {
	const body: UpdatePlatformMerchantReq = {
		package: form.package,
		account: form.account,
		hide_store: form.hide_store,
	};

	if (form.extend_duration !== '') {
		body.extend_duration = form.extend_duration;
	} else if (form.expiry_date) {
		body.expiry_date = form.expiry_date;
	}

	return body;
}
