import { AppointmentStatus } from 'yeppi-common';
import { addMinutes, differenceInMinutes, isSameDay, setHours, setMinutes, setSeconds, startOfDay } from 'date-fns';
import type { Appointment } from '~/utils/types/appointment';

export type AppointmentStatusCounts = {
	all: number;
	pending: number;
	confirmed: number;
	completed: number;
	cancelled: number;
};

export type OpenGap = {
	start: Date;
	end: Date;
	durationMinutes: number;
};

export type AttentionRailItem =
	| {
			kind: 'needs_confirm';
			appointment: Appointment;
			start: Date;
	  }
	| {
			kind: 'next_up';
			appointment: Appointment;
			start: Date;
	  }
	| {
			kind: 'open_gap';
			appointment?: undefined;
			start: Date;
			end: Date;
			durationMinutes: number;
	  };

const toDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

const isCancelledBucket = (status: AppointmentStatus): boolean =>
	status === AppointmentStatus.CANCELLED || status === AppointmentStatus.VOIDED;

const appointmentEnd = (appointment: Appointment): Date => {
	if (appointment.end_date_time) return toDate(appointment.end_date_time);
	const start = toDate(appointment.start_date_time);
	const minutes = appointment.duration && appointment.duration > 0 ? appointment.duration : 60;
	return addMinutes(start, minutes);
};

/** True when the appointment slot has already ended (end time, else start + duration). */
export const isAppointmentPast = (appointment: Appointment, now: Date = new Date()): boolean =>
	appointmentEnd(appointment).getTime() < now.getTime();

/**
 * Listing order: bookings whose start is still ahead, soonest first,
 * then bookings that have already started, closest to now first.
 */
export const sortAppointmentsForListing = (appointments: Appointment[], now: Date = new Date()): Appointment[] => {
	const nowMs = now.getTime();
	const startMs = (appointment: Appointment) => toDate(appointment.start_date_time).getTime();
	return [...appointments].sort((a, b) => {
		const aStarted = startMs(a) < nowMs;
		const bStarted = startMs(b) < nowMs;
		if (aStarted !== bStarted) return aStarted ? 1 : -1;
		const aStart = startMs(a);
		const bStart = startMs(b);
		return aStarted ? bStart - aStart : aStart - bStart;
	});
};

export const countAppointmentsByStatus = (appointments: Appointment[]): AppointmentStatusCounts => {
	const counts: AppointmentStatusCounts = {
		all: appointments.length,
		pending: 0,
		confirmed: 0,
		completed: 0,
		cancelled: 0,
	};
	for (const appointment of appointments) {
		if (appointment.status === AppointmentStatus.PENDING) counts.pending += 1;
		else if (appointment.status === AppointmentStatus.CONFIRMED) counts.confirmed += 1;
		else if (appointment.status === AppointmentStatus.COMPLETED) counts.completed += 1;
		else if (isCancelledBucket(appointment.status)) counts.cancelled += 1;
	}
	return counts;
};

export const findNextPendingAppointment = (appointments: Appointment[]): Appointment | null => {
	const pending = appointments
		.filter((a) => a.status === AppointmentStatus.PENDING)
		.sort((a, b) => toDate(a.start_date_time).getTime() - toDate(b.start_date_time).getTime());
	return pending[0] ?? null;
};

export const findNextUpAppointment = (appointments: Appointment[], now: Date): Appointment | null => {
	const upcoming = appointments
		.filter((a) => !isCancelledBucket(a.status) && a.status !== AppointmentStatus.COMPLETED)
		.filter((a) => toDate(a.start_date_time).getTime() >= now.getTime())
		.sort((a, b) => toDate(a.start_date_time).getTime() - toDate(b.start_date_time).getTime());
	return upcoming[0] ?? null;
};

export const findOpenGapsOnDay = (
	appointments: Appointment[],
	day: Date,
	options: { minMinutes?: number; dayStartHour?: number; dayEndHour?: number } = {},
): OpenGap[] => {
	const minMinutes = options.minMinutes ?? 30;
	const dayStartHour = options.dayStartHour ?? 9;
	const dayEndHour = options.dayEndHour ?? 18;

	const dayStart = setSeconds(setMinutes(setHours(startOfDay(day), dayStartHour), 0), 0);
	const dayEnd = setSeconds(setMinutes(setHours(startOfDay(day), dayEndHour), 0), 0);

	const onDay = appointments
		.filter((a) => !isCancelledBucket(a.status))
		.filter((a) => isSameDay(toDate(a.start_date_time), day))
		.map((a) => ({ start: toDate(a.start_date_time), end: appointmentEnd(a) }))
		.filter((a) => a.end.getTime() > dayStart.getTime() && a.start.getTime() < dayEnd.getTime())
		.sort((a, b) => a.start.getTime() - b.start.getTime());

	const gaps: OpenGap[] = [];
	let cursor = dayStart;

	for (const block of onDay) {
		const blockStart = block.start < dayStart ? dayStart : block.start;
		if (blockStart.getTime() > cursor.getTime()) {
			const durationMinutes = differenceInMinutes(blockStart, cursor);
			if (durationMinutes >= minMinutes) {
				gaps.push({ start: cursor, end: blockStart, durationMinutes });
			}
		}
		if (block.end.getTime() > cursor.getTime()) cursor = block.end;
	}

	if (dayEnd.getTime() > cursor.getTime()) {
		const durationMinutes = differenceInMinutes(dayEnd, cursor);
		if (durationMinutes >= minMinutes) {
			gaps.push({ start: cursor, end: dayEnd, durationMinutes });
		}
	}

	return gaps;
};

export const buildAttentionRailItems = (
	appointments: Appointment[],
	options: {
		now: Date;
		day: Date;
		maxPending?: number;
		minGapMinutes?: number;
	},
): AttentionRailItem[] => {
	const maxPending = options.maxPending ?? 2;
	const items: AttentionRailItem[] = [];

	const pendingSorted = appointments
		.filter((a) => a.status === AppointmentStatus.PENDING)
		.filter((a) => !isAppointmentPast(a, options.now))
		.sort((a, b) => toDate(a.start_date_time).getTime() - toDate(b.start_date_time).getTime());
	const pending = pendingSorted.slice(0, maxPending);

	for (const appointment of pending) {
		items.push({
			kind: 'needs_confirm',
			appointment,
			start: toDate(appointment.start_date_time),
		});
	}

	const pendingCodes = new Set(pending.map((p) => p.code));
	const nextUp = findNextUpAppointment(
		appointments.filter((a) => !pendingCodes.has(a.code)),
		options.now,
	);

	if (nextUp && !isAppointmentPast(nextUp, options.now)) {
		items.push({
			kind: 'next_up',
			appointment: nextUp,
			start: toDate(nextUp.start_date_time),
		});
	}

	const gap = findOpenGapsOnDay(appointments, options.day, { minMinutes: options.minGapMinutes ?? 30 }).find(
		(g) => g.end.getTime() > options.now.getTime(),
	);
	if (gap) {
		const start = gap.start.getTime() < options.now.getTime() ? options.now : gap.start;
		const durationMinutes = Math.max(0, differenceInMinutes(gap.end, start));
		if (durationMinutes >= (options.minGapMinutes ?? 30)) {
			items.push({
				kind: 'open_gap',
				start,
				end: gap.end,
				durationMinutes,
			});
		}
	}

	return items;
};

/** Appointments whose start falls on the given local calendar day. */
export const appointmentsOnDay = (appointments: Appointment[], day: Date): Appointment[] =>
	appointments.filter((a) => isSameDay(toDate(a.start_date_time), day));
