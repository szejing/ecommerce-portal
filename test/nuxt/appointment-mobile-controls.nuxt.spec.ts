import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import AppointmentsFilter from '~/components/Z/Section/Filter/Appointments.vue';
import DailySlots from '~/components/Z/Calendar/DailySlots.vue';
import MonthlyGrid from '~/components/Z/Calendar/MonthlyGrid.vue';
import WeeklySlots from '~/components/Z/Calendar/WeeklySlots.vue';
import { AppointmentStatus } from 'yeppi-common';
import { useAppointmentStore } from '~/stores/Appointment/Appointment';

const date = new Date(2026, 10, 22, 9);
const booking = {
	code: 'AP-1',
	start_date_time: date,
	item_line: 1,
	customer_name: 'Aisha Tan',
	customer_phone: '',
	appt_desc: 'Ceramic coating',
	status: AppointmentStatus.CONFIRMED,
};

describe('Appointment mobile controls', () => {
	it('offers a touch-sized search field and a filter sheet', async () => {
		const wrapper = await mountSuspended(AppointmentsFilter);
		expect(wrapper.get('input[type="search"]').attributes('aria-label')).toBeTruthy();
		expect(wrapper.findAll('button').some(button => button.text() === 'Filters')).toBe(true);
	});

	it('switches a phone search to List and marks results busy immediately', async () => {
		const viewport = vi.spyOn(window, 'matchMedia');
		viewport.mockImplementation(query => ({
			matches: false,
			media: query,
			onchange: null,
			addListener() {},
			removeListener() {},
			addEventListener() {},
			removeEventListener() {},
			dispatchEvent: () => true,
		}));
		try {
			const wrapper = await mountSuspended(AppointmentsFilter);
			vi.useFakeTimers();
			const store = useAppointmentStore();
			store.filter.view = 'daily';
			store.filter.query = '';
			await wrapper.get('input[type="search"]').setValue('Aisha');
			expect(store.filter.view).toBe('listing');
			expect(store.filter.query).toBe('Aisha');
			expect(store.loading).toBe(true);
		} finally {
			vi.clearAllTimers();
			vi.useRealTimers();
			viewport.mockRestore();
		}
	});

	it('omits duration when the appointment has no end or duration', async () => {
		const wrapper = await mountSuspended(DailySlots, { props: { date, appointments: [booking] } });
		expect(wrapper.get('button').text()).toContain('Ceramic coating');
		expect(wrapper.get('button').text()).not.toContain('NaN');
	});

	it('opens a booking from the monthly day agenda', async () => {
		const wrapper = await mountSuspended(MonthlyGrid, {
			props: {
				month: new Date(2026, 10, 1),
				selectedDay: date,
				appointments: [booking],
				getStatusColor: () => 'success',
			},
		});
		const agenda = wrapper.getComponent(DailySlots);
		await agenda.get('button').trigger('click');
		expect(wrapper.emitted('selectAppointment')).toEqual([[booking]]);
	});

	it('can open a weekly booking without an end time from its mobile row', async () => {
		const wrapper = await mountSuspended(WeeklySlots, {
			props: { weekStart: new Date(2026, 10, 16), appointments: [booking] },
		});
		const row = wrapper.findAll('button').find(button => button.text().includes('Aisha Tan'));
		expect(row).toBeDefined();
		expect(row?.text()).not.toContain('Invalid');
		await row?.trigger('click');
		expect(wrapper.emitted('select')).toEqual([[booking]]);
	});
});
