import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AppointmentStatus } from 'yeppi-common';
import { useAppointmentStore } from '../../app/stores/Appointment/Appointment';
import type { Appointment } from '../../app/utils/types/appointment';

const { successNotification, failedNotification } = vi.hoisted(() => ({
	successNotification: vi.fn(),
	failedNotification: vi.fn(),
}));

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	successNotification,
	failedNotification,
}));

describe('useAppointmentStore', () => {
	const apiMock = {
		appointment: {
			getSingle: vi.fn(),
		},
	};

	const appointmentRow = (overrides: Partial<Appointment> = {}): Appointment => ({
		code: 'APT-1001',
		start_date_time: new Date('2026-07-24T10:00:00.000Z'),
		end_date_time: new Date('2026-07-24T11:00:00.000Z'),
		item_line: 1,
		customer_name: 'Jane Customer',
		customer_phone: '60123456789',
		status: AppointmentStatus.CONFIRMED,
		...overrides,
	});

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({ $api: apiMock }) as unknown;
	});

	it('loads a single appointment by code', async () => {
		const appointment = appointmentRow();
		apiMock.appointment.getSingle.mockResolvedValue({ appointment });

		const store = useAppointmentStore();
		const result = await store.getAppointmentByCode('APT-1001');

		expect(apiMock.appointment.getSingle).toHaveBeenCalledWith('APT-1001');
		expect(result).toBe(appointment);
	});

	it('returns null when loading by code fails', async () => {
		apiMock.appointment.getSingle.mockRejectedValue(new Error('not found'));

		const store = useAppointmentStore();
		await expect(store.getAppointmentByCode('missing')).resolves.toBeNull();
	});
});
