import type { AppointmentStatus } from 'yeppi-common';
import type { AppointmentDepositDisposition } from '~/utils/types/appointment';

export type UpdateAppointmentReq = {
	order_no: string;
	start_date_time: Date;
	end_date_time?: Date;
	ref_no?: string | undefined;
	status?: AppointmentStatus;
	deposit_disposition?: AppointmentDepositDisposition;
};
