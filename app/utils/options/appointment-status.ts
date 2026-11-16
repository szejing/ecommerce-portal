import { AppointmentStatus } from 'yeppi-common';

type TranslateFn = (key: string) => string;
type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral';

export const options_appointment_status = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED];

const APPOINTMENT_STATUS_PROGRESS: AppointmentStatus[] = [
	AppointmentStatus.PENDING,
	AppointmentStatus.CONFIRMED,
	AppointmentStatus.COMPLETED,
];

const STATUS_LABEL_KEYS: Record<string, string> = {
	[AppointmentStatus.PENDING]: 'options.pending',
	[AppointmentStatus.CONFIRMED]: 'options.confirmed',
	[AppointmentStatus.COMPLETED]: 'options.completed',
	[AppointmentStatus.CANCELLED]: 'options.cancelled',
	[AppointmentStatus.NO_SHOW]: 'options.no_show',
	[AppointmentStatus.RESCHEDULED]: 'options.rescheduled',
	[AppointmentStatus.VOIDED]: 'options.voided',
};

export function getAppointmentStatusLabel(t: TranslateFn, status: AppointmentStatus | string | undefined): string {
	if (!status) return '';
	const key = STATUS_LABEL_KEYS[status];
	return key ? t(key) : status;
}

export function getAppointmentStatusOptions(t: TranslateFn) {
	return [
		{ value: AppointmentStatus.PENDING, label: t('options.pending') },
		{ value: AppointmentStatus.CONFIRMED, label: t('options.confirmed') },
		{ value: AppointmentStatus.CANCELLED, label: t('options.cancelled') },
		{ value: AppointmentStatus.COMPLETED, label: t('options.completed') },
	];
}

export function getAppointmentStatusUpdateOptions(t: TranslateFn, options?: { includeNoShow?: boolean }) {
	const items = getAppointmentStatusOptions(t);
	if (options?.includeNoShow) {
		items.push({ value: AppointmentStatus.NO_SHOW, label: t('options.no_show') });
	}
	return items;
}

export function getNextAppointmentStatus(current: AppointmentStatus | string | undefined): AppointmentStatus | undefined {
	const index = APPOINTMENT_STATUS_PROGRESS.indexOf(current as AppointmentStatus);
	if (index < 0 || index >= APPOINTMENT_STATUS_PROGRESS.length - 1) {
		return undefined;
	}
	return APPOINTMENT_STATUS_PROGRESS[index + 1];
}

export function canCompleteAppointmentStatus(current: AppointmentStatus | string | undefined): boolean {
	if (!current) return false;
	return (
		current !== AppointmentStatus.COMPLETED
		&& current !== AppointmentStatus.CANCELLED
		&& current !== AppointmentStatus.VOIDED
		&& current !== AppointmentStatus.NO_SHOW
	);
}

export const getAppointmentStatusColor = (status: AppointmentStatus): BadgeColor => {
	switch (status) {
		case AppointmentStatus.PENDING:
			return 'warning';
		case AppointmentStatus.CONFIRMED:
		case AppointmentStatus.RESCHEDULED:
			return 'info';
		case AppointmentStatus.COMPLETED:
			return 'success';
		case AppointmentStatus.CANCELLED:
		case AppointmentStatus.NO_SHOW:
			return 'error';
		default:
			return 'neutral';
	}
};
