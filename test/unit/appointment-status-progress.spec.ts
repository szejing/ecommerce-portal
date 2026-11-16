import { describe, expect, it } from 'vitest';
import { AppointmentStatus } from 'yeppi-common';
import { canCompleteAppointmentStatus, getNextAppointmentStatus } from '~/utils/options/appointment-status';

describe('appointment status progress', () => {
	it('advances pending to confirmed, then completed', () => {
		expect(getNextAppointmentStatus(AppointmentStatus.PENDING)).toBe(AppointmentStatus.CONFIRMED);
		expect(getNextAppointmentStatus(AppointmentStatus.CONFIRMED)).toBe(AppointmentStatus.COMPLETED);
	});

	it('has no next status for terminal or off-path values', () => {
		expect(getNextAppointmentStatus(AppointmentStatus.COMPLETED)).toBeUndefined();
		expect(getNextAppointmentStatus(AppointmentStatus.CANCELLED)).toBeUndefined();
		expect(getNextAppointmentStatus(AppointmentStatus.NO_SHOW)).toBeUndefined();
		expect(getNextAppointmentStatus(AppointmentStatus.VOIDED)).toBeUndefined();
		expect(getNextAppointmentStatus(AppointmentStatus.RESCHEDULED)).toBeUndefined();
		expect(getNextAppointmentStatus(undefined)).toBeUndefined();
	});

	it('allows complete except for closed statuses', () => {
		expect(canCompleteAppointmentStatus(AppointmentStatus.PENDING)).toBe(true);
		expect(canCompleteAppointmentStatus(AppointmentStatus.CONFIRMED)).toBe(true);
		expect(canCompleteAppointmentStatus(AppointmentStatus.RESCHEDULED)).toBe(true);
		expect(canCompleteAppointmentStatus(AppointmentStatus.COMPLETED)).toBe(false);
		expect(canCompleteAppointmentStatus(AppointmentStatus.CANCELLED)).toBe(false);
		expect(canCompleteAppointmentStatus(AppointmentStatus.VOIDED)).toBe(false);
		expect(canCompleteAppointmentStatus(AppointmentStatus.NO_SHOW)).toBe(false);
		expect(canCompleteAppointmentStatus(undefined)).toBe(false);
	});
});
