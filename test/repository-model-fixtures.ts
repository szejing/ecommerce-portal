import { UserRoles } from 'yeppi-common';
import type { BaseODataReq } from '~/repository/base/base.req';
import type { LoginReq } from '~/repository/modules/auth/models/request/login.req';
import type { PasswordResetReq } from '~/repository/modules/auth/models/request/password-reset.req';
import type { CreateCrmUserReq } from '~/repository/modules/crm-user/request/create-crm-user.req';
import type { ChangePasswordReq } from '~/repository/modules/crm-user/request/change-password.req';
import type { ResetPasswordReq } from '~/repository/modules/crm-user/request/reset-password.req';
import type { UpdateCrmUserReq } from '~/repository/modules/crm-user/request/update-crm-user.req';
import type { CreateAppointmentReq } from '~/repository/modules/appointment/models/request/create-appointment.req';
import type { UpdateAppointmentReq } from '~/repository/modules/appointment/models/request/update-appointment.req';
import type { CreateAffiliateReq } from '~/repository/modules/affiliate/request/create-affiliate.req';
import type { CreateAffiliateTierReq } from '~/repository/modules/affiliate/request/create-tier.req';
import type { PatchAffiliateTierReq } from '~/repository/modules/affiliate/request/patch-tier.req';
import type { DeleteAffiliateTierReq } from '~/repository/modules/affiliate/request/delete-tier.req';
import type { UpdateSettingReq } from '~/repository/modules/setting/models/request/update-setting.req';
import type { UpdateMerchantInfoReq } from '~/repository/modules/merchant-info/request/update-info.req';
import type { UpdatePaymentMethodBody } from '~/repository/modules/payment-method/models/request/update-payment-method.req';
import { MerchantInfo } from '~/utils/types/merchant-info';

/** Typical OData query sent by list views (shape checked against `BaseODataReq`). */
export const fullODataQuery = {
	$top: 25,
	$skip: 50,
	$count: true,
	$orderby: 'created_at desc',
	$filter: "status eq 'open'",
	$search: 'invoice',
	$select: 'id,code,status',
	$expand: 'customer',
} as const satisfies BaseODataReq;

export const loginPayload = {
	merchant_id: 'merchant-uuid-1',
	email_address: 'ops@example.com',
	password: 'hunter2',
} as const satisfies LoginReq;

export const passwordResetPayload = {
	merchant_id: 'merchant-uuid-1',
	email_address: 'user@example.com',
} as const satisfies PasswordResetReq;

export const createCrmUserPayload = {
	name: 'Alex',
	email_address: 'alex@example.com',
	dial_code: '60',
	phone_no: '123456789',
	role: UserRoles.MERCHANT_STAFF,
	is_active: true,
} as const satisfies CreateCrmUserReq;

export const updateCrmUserPayload = {
	name: 'Alex Updated',
	email_address: 'alex.new@example.com',
	role: UserRoles.MERCHANT_ADMIN,
	is_active: false,
} as const satisfies UpdateCrmUserReq;

export const changePasswordPayload = {
	old_password: 'old-secret',
	new_password: 'new-secret-9',
	confirm_password: 'new-secret-9',
} as const satisfies ChangePasswordReq;

export const resetPasswordPayload = {
	staff_id: 'staff-uuid-7',
	new_password: 'reset-1',
	confirm_password: 'reset-1',
} as const satisfies ResetPasswordReq;

export const updateSettingsPayload = {
	settings: [
		{ group_code: 'general', set_code: 'timezone', set_value: 'Asia/Kuala_Lumpur' },
		{ group_code: 'general', set_code: 'locale', set_value: 'en' },
	],
} as const satisfies UpdateSettingReq;

const merchantRow = new MerchantInfo({
	group_code: 'biz',
	set_code: 'name',
	set_value: 'ACME',
});

export const updateMerchantInfoPayload: UpdateMerchantInfoReq = {
	merchant_info: [merchantRow],
};

export const createAppointmentPayload = {
	code: 'APT-1001',
	customer_id: 42,
	service_id: 3,
	staff_id: 5,
	date: '2025-03-24',
	time: '14:30',
	duration: 60,
	price: 120.5,
	payment_status: 'pending',
} as const satisfies CreateAppointmentReq;

export const updateAppointmentPayload: UpdateAppointmentReq = {
	order_no: 'ORD-9',
	start_date_time: new Date('2025-03-24T06:30:00.000Z'),
	end_date_time: new Date('2025-03-24T07:30:00.000Z'),
	ref_no: 'REF-1',
};

export const createAffiliatePayload = {
	user_id: 'usr_abc',
	tier_id: 2,
	slug: 'partner-one',
	merchant_id: 'm-1',
} as const satisfies CreateAffiliateReq;

export const createAffiliateTierPayload = {
	name: 'Gold',
	min_referrals: 10,
	default_commission_percentage: 12.5,
	merchant_id: 'm-1',
} as const satisfies CreateAffiliateTierReq;

export const patchAffiliateTierPayload = {
	name: 'Gold Plus',
	min_referrals: 20,
	default_commission_percentage: 15,
} as const satisfies PatchAffiliateTierReq;

export const deleteAffiliateTierPayload = {
	merchant_id: 'm-1',
	user: { id: 'usr_z' },
} as const satisfies DeleteAffiliateTierReq;

export const paymentMethodPatchPayload = {
	desc: 'Cash at counter',
	is_active: true,
	is_sandbox: false,
	metadata: { terminal_id: 'T-88' },
} as const satisfies UpdatePaymentMethodBody;
