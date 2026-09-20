import { isSameDate, getFormattedDate } from 'yeppi-common';
import type { CRMUser } from './types/crm-user';

export const fractionDigits = 2;

/**
 * Checks if the input is numeric.
 * @param value The value to check.
 * @returns True if the input is numeric, false otherwise.
 */
export function isNumeric(value: any): boolean {
	if (typeof value === 'number') return true;
	if (typeof value !== 'string') return false;

	return !isNaN(parseFloat(value)) && isFinite(value as any);
}

export const capitalizeFirstLetter = (value: string | any) => {
	if (value === undefined) return undefined;

	if (value.includes('_')) {
		return value
			.split('_')
			.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	return value.charAt(0).toUpperCase() + value.slice(1);
};

export const removeNullValues = (obj: any): any => {
	return JSON.parse(JSON.stringify(obj, (_, value) => (value === null ? undefined : value)));
};

// Format appointment date range. API dates are UTC (ISO with Z); getFormattedDate uses local time for display.
export const formatAppointmentDateRange = (startDate: string | Date, endDate: string | Date | undefined): string => {
	const start = new Date(startDate);
	if (endDate === undefined) {
		return getFormattedDate(start, 'dd MMM yyyy, hh:mm aa');
	}

	const end = new Date(endDate);

	if (isSameDate(start, end)) {
		// Same day: show date once, then both times
		return `${getFormattedDate(start, 'dd MMM yyyy, hh:mm aa')} - ${getFormattedDate(end, 'hh:mm aa')}`;
	} else {
		// Different days: show full date-time for both
		return `${getFormattedDate(start, 'dd MMM yyyy, hh:mm aa')} - ${getFormattedDate(end, 'dd MMM yyyy, hh:mm aa')}`;
	}
};

/** Format phone for display: "(dial_code) number" or "—" when missing. */
export const formatCrmUserPhone = (user: CRMUser): string => {
	const phone = user.phone_no?.trim() || '—';
	const dial = user.dial_code?.trim();
	if (!dial) return phone;
	const displayDial = dial.startsWith('+') ? dial : `+${dial}`;
	return `(${displayDial}) ${phone}`;
};
