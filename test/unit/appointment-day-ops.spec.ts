import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from 'yeppi-common';
import type { Appointment } from '../../app/utils/types/appointment';
import {
	appointmentsOnDay,
	buildAttentionRailItems,
	countAppointmentsByStatus,
	findOpenGapsOnDay,
	findNextPendingAppointment,
	findNextUpAppointment,
	isAppointmentPast,
} from '../../app/utils/appointment-day-ops';

const appt = (partial: Partial<Appointment> & Pick<Appointment, 'code' | 'start_date_time' | 'status'>): Appointment => ({
	item_line: 1,
	customer_name: partial.customer_name ?? partial.code,
	customer_phone: '012',
	appt_desc: partial.appt_desc ?? 'Service',
	end_date_time: partial.end_date_time,
	duration: partial.duration,
	...partial,
});

describe('countAppointmentsByStatus', () => {
	it('counts pending confirmed completed and cancelled buckets', () => {
		const list = [
			appt({ code: '1', start_date_time: new Date('2026-11-15T01:00:00Z'), status: AppointmentStatus.PENDING }),
			appt({ code: '2', start_date_time: new Date('2026-11-15T02:00:00Z'), status: AppointmentStatus.PENDING }),
			appt({ code: '3', start_date_time: new Date('2026-11-15T03:00:00Z'), status: AppointmentStatus.CONFIRMED }),
			appt({ code: '4', start_date_time: new Date('2026-11-15T04:00:00Z'), status: AppointmentStatus.COMPLETED }),
			appt({ code: '5', start_date_time: new Date('2026-11-15T05:00:00Z'), status: AppointmentStatus.CANCELLED }),
			appt({ code: '6', start_date_time: new Date('2026-11-15T06:00:00Z'), status: AppointmentStatus.VOIDED }),
		];
		expect(countAppointmentsByStatus(list)).toEqual({
			all: 6,
			pending: 2,
			confirmed: 1,
			completed: 1,
			cancelled: 2,
		});
	});
});

describe('findNextPendingAppointment', () => {
	it('returns earliest pending by start time', () => {
		const list = [
			appt({ code: 'late', start_date_time: new Date('2026-11-15T14:00:00Z'), status: AppointmentStatus.PENDING }),
			appt({ code: 'early', start_date_time: new Date('2026-11-15T10:00:00Z'), status: AppointmentStatus.PENDING }),
			appt({ code: 'ok', start_date_time: new Date('2026-11-15T09:00:00Z'), status: AppointmentStatus.CONFIRMED }),
		];
		expect(findNextPendingAppointment(list)?.code).toBe('early');
	});

	it('returns null when none pending', () => {
		expect(findNextPendingAppointment([appt({ code: 'c', start_date_time: new Date(), status: AppointmentStatus.CONFIRMED })])).toBeNull();
	});
});

describe('findNextUpAppointment', () => {
	it('returns the next non-cancelled appointment at or after now', () => {
		const now = new Date('2026-11-15T11:00:00Z');
		const list = [
			appt({ code: 'past', start_date_time: new Date('2026-11-15T09:00:00Z'), status: AppointmentStatus.CONFIRMED }),
			appt({ code: 'next', start_date_time: new Date('2026-11-15T11:30:00Z'), status: AppointmentStatus.CONFIRMED }),
			appt({ code: 'later', start_date_time: new Date('2026-11-15T15:00:00Z'), status: AppointmentStatus.PENDING }),
		];
		expect(findNextUpAppointment(list, now)?.code).toBe('next');
	});
});

describe('findOpenGapsOnDay', () => {
	it('finds gaps of at least minMinutes between sorted appointments on the day', () => {
		const day = new Date('2026-11-15T00:00:00');
		const list = [
			appt({
				code: 'a',
				start_date_time: new Date('2026-11-15T10:00:00'),
				end_date_time: new Date('2026-11-15T11:00:00'),
				status: AppointmentStatus.CONFIRMED,
			}),
			appt({
				code: 'b',
				start_date_time: new Date('2026-11-15T13:00:00'),
				end_date_time: new Date('2026-11-15T14:00:00'),
				status: AppointmentStatus.CONFIRMED,
			}),
		];
		const gaps = findOpenGapsOnDay(list, day, { minMinutes: 30, dayStartHour: 9, dayEndHour: 18 });
		expect(gaps.length).toBeGreaterThanOrEqual(1);
		const lunch = gaps.find((g) => g.start.getHours() === 11);
		expect(lunch?.durationMinutes).toBe(120);
	});
});

describe('isAppointmentPast', () => {
	it('uses end time when present', () => {
		const now = new Date('2026-11-15T12:00:00');
		expect(
			isAppointmentPast(
				appt({
					code: 'past',
					start_date_time: new Date('2026-11-15T10:00:00'),
					end_date_time: new Date('2026-11-15T11:00:00'),
					status: AppointmentStatus.CONFIRMED,
				}),
				now,
			),
		).toBe(true);
		expect(
			isAppointmentPast(
				appt({
					code: 'live',
					start_date_time: new Date('2026-11-15T11:30:00'),
					end_date_time: new Date('2026-11-15T12:30:00'),
					status: AppointmentStatus.CONFIRMED,
				}),
				now,
			),
		).toBe(false);
	});

	it('falls back to start + duration', () => {
		const now = new Date('2026-11-15T11:00:00');
		expect(
			isAppointmentPast(
				appt({
					code: 'dur',
					start_date_time: new Date('2026-11-15T10:00:00'),
					duration: 30,
					status: AppointmentStatus.CONFIRMED,
				}),
				now,
			),
		).toBe(true);
	});
});

describe('appointmentsOnDay', () => {
	it('keeps only appointments starting on the local day', () => {
		const day = new Date('2026-11-15T12:00:00');
		const list = [
			appt({ code: 'in', start_date_time: new Date('2026-11-15T10:00:00'), status: AppointmentStatus.CONFIRMED }),
			appt({ code: 'out', start_date_time: new Date('2026-11-16T10:00:00'), status: AppointmentStatus.CONFIRMED }),
		];
		expect(appointmentsOnDay(list, day).map((a) => a.code)).toEqual(['in']);
	});
});

describe('buildAttentionRailItems', () => {
	it('builds needs-confirm next-up and open-gap cards', () => {
		const now = new Date('2026-11-15T09:30:00');
		const day = new Date('2026-11-15T00:00:00');
		const list = [
			appt({
				code: 'p1',
				customer_name: 'Amira',
				appt_desc: 'Facial',
				start_date_time: new Date('2026-11-15T10:00:00'),
				end_date_time: new Date('2026-11-15T11:00:00'),
				status: AppointmentStatus.PENDING,
			}),
			appt({
				code: 'c1',
				customer_name: 'Sofia',
				appt_desc: 'Nails',
				start_date_time: new Date('2026-11-15T11:30:00'),
				end_date_time: new Date('2026-11-15T12:15:00'),
				status: AppointmentStatus.CONFIRMED,
			}),
		];
		const items = buildAttentionRailItems(list, { now, day, maxPending: 2, minGapMinutes: 30 });
		expect(items.some((i) => i.kind === 'needs_confirm' && i.appointment?.code === 'p1')).toBe(true);
		expect(items.some((i) => i.kind === 'next_up' && i.appointment?.code === 'c1')).toBe(true);
		expect(items.some((i) => i.kind === 'open_gap')).toBe(true);
	});

	it('hides past pending appointments from the rail', () => {
		const now = new Date('2026-11-15T12:00:00');
		const day = new Date('2026-11-15T00:00:00');
		const list = [
			appt({
				code: 'past-pending',
				customer_name: 'Old',
				start_date_time: new Date('2026-11-15T09:00:00'),
				end_date_time: new Date('2026-11-15T10:00:00'),
				status: AppointmentStatus.PENDING,
			}),
			appt({
				code: 'future-pending',
				customer_name: 'New',
				start_date_time: new Date('2026-11-15T14:00:00'),
				end_date_time: new Date('2026-11-15T15:00:00'),
				status: AppointmentStatus.PENDING,
			}),
		];
		const items = buildAttentionRailItems(list, { now, day, maxPending: 2, minGapMinutes: 30 });
		expect(items.filter((i) => i.kind === 'needs_confirm').map((i) => i.appointment?.code)).toEqual(['future-pending']);
	});
});
