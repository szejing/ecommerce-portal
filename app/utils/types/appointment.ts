import type { AppointmentStatus } from 'yeppi-common';

export type AppointmentInput = {
	code: string;
};

export type AppointmentDepositDisposition = 'retain' | 'refund';

export type Appointment = {
	code: string;
	start_date_time: Date;
	end_date_time?: Date;
	item_line: number;
	appt_desc?: string;
	order_no?: string;
	duration?: number;
	customer_name: string;
	customer_phone: string;
	ref_no?: string;
	status: AppointmentStatus;
	deposit_disposition?: AppointmentDepositDisposition | null;
};
