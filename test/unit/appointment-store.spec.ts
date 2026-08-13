import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AppointmentStatus } from 'yeppi-common';
import { APPOINTMENT_FILTER_DEBOUNCE_MS, useAppointmentStore } from '../../app/stores/Appointment/Appointment';
import type { Appointment } from '../../app/utils/types/appointment';

const { failedNotification } = vi.hoisted(() => ({
	failedNotification: vi.fn(),
}));

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	failedNotification,
	successNotification: vi.fn(),
}));

const getMany = vi.fn();

describe('useAppointmentStore', () => {
	afterEach(() => vi.useRealTimers());

	beforeEach(() => {
		setActivePinia(createPinia());
		getMany.mockReset();
		failedNotification.mockClear();
		getMany.mockResolvedValue({ data: [{ code: 'A-1' } as Appointment], '@odata.count': 1 });
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({
			$api: { appointment: { getMany } },
		});
	});

	it('debounces search and maps cancelled status to the cancelled/voided bucket internally', async () => {
		vi.useFakeTimers();
		const store = useAppointmentStore();
		store.setStatus('cancelled');
		await vi.runAllTicks();
		getMany.mockClear();
		store.setSearch('  alice  ');
		await vi.advanceTimersByTimeAsync(APPOINTMENT_FILTER_DEBOUNCE_MS);
		await vi.runAllTicks();
		expect(getMany.mock.calls[0]?.[0].$search).toBe('alice');
		expect(getMany.mock.calls[0]?.[0].$filter).toContain(`status in ('${AppointmentStatus.CANCELLED}', '${AppointmentStatus.VOIDED}')`);
		expect(failedNotification).not.toHaveBeenCalled();
	});

	it('does not treat mutations of returned filter snapshots as workflow intent', async () => {
		const store = useAppointmentStore();
		const snapshot = store.filters as { query: string };
		snapshot.query = 'direct mutation';
		await store.setStatus(AppointmentStatus.CONFIRMED);
		expect(store.filters.query).toBe('');
		expect(getMany.mock.calls.at(-1)?.[0].$filter).toContain(`status eq '${AppointmentStatus.CONFIRMED}'`);
	});
});
