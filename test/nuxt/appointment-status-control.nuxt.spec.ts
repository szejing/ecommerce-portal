import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { AppointmentStatus } from 'yeppi-common';
import AppointmentStatusControl from '~/components/Appointment/StatusControl.vue';

describe('AppointmentStatusControl', () => {
	it('advances to the next status and can jump to completed', async () => {
		const wrapper = await mountSuspended(AppointmentStatusControl, {
			props: { status: AppointmentStatus.PENDING },
		});

		expect(wrapper.get('[data-testid="appointment-status"]').text()).toContain('Pending');

		await wrapper.get('[data-testid="appointment-status-next"]').trigger('click');
		expect(wrapper.emitted('update:status')?.[0]).toEqual([AppointmentStatus.CONFIRMED]);

		await wrapper.get('[data-testid="appointment-status-complete"]').trigger('click');
		expect(wrapper.emitted('update:status')?.[1]).toEqual([AppointmentStatus.COMPLETED]);
	});

	it('hides next and complete shortcuts on a completed appointment', async () => {
		const wrapper = await mountSuspended(AppointmentStatusControl, {
			props: { status: AppointmentStatus.COMPLETED },
		});

		expect(wrapper.get('[data-testid="appointment-status"]').text()).toContain('Completed');
		expect(wrapper.find('[data-testid="appointment-status-next"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="appointment-status-complete"]').exists()).toBe(false);
	});

	it('hides shortcuts for no-show and does not re-emit the current status', async () => {
		const wrapper = await mountSuspended(AppointmentStatusControl, {
			props: { status: AppointmentStatus.NO_SHOW },
		});

		expect(wrapper.get('[data-testid="appointment-status"]').text()).toContain('No-show');
		expect(wrapper.find('[data-testid="appointment-status-next"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="appointment-status-complete"]').exists()).toBe(false);
	});

	it('does not emit while an update is in progress', async () => {
		const wrapper = await mountSuspended(AppointmentStatusControl, {
			props: { status: AppointmentStatus.CONFIRMED, updating: true },
		});

		await wrapper.get('[data-testid="appointment-status-next"]').trigger('click');
		await wrapper.get('[data-testid="appointment-status-complete"]').trigger('click');
		expect(wrapper.emitted('update:status')).toBeUndefined();
	});
});
