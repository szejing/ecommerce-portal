import { AdminReceiveEmailUpdate } from 'yeppi-common';

export const adminReceiveEmailUpdateItems = [
	{ value: AdminReceiveEmailUpdate.NEW_ORDER, label: 'New order' },
	{
		value: AdminReceiveEmailUpdate.CUSTOMER_REQUIRES_ACTION,
		label: 'Customer cancellation / refund request',
	},
	{
		value: AdminReceiveEmailUpdate.APPOINTMENT_RESCHEDULE,
		label: 'Appointment reschedule request',
	},
] as const;

export const adminReceiveEmailUpdateDataSource = 'AdminReceiveEmailUpdate';

export const getAdminReceiveEmailUpdateItems = (dataSource: string) => {
	if (dataSource === adminReceiveEmailUpdateDataSource) {
		return adminReceiveEmailUpdateItems;
	}

	return [];
};
