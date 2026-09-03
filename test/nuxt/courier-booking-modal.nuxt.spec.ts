import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { startOfDay } from 'date-fns';
import { getFormattedDate } from 'yeppi-common';
import CourierBookingModal from '~/components/Fulfillment/CourierBookingModal.vue';
import { COURIER_BOOKING_LAST_SERVICE_STORAGE_KEY } from '~/utils/courier-booking-last-service';
import type { CourierBookingContext, CourierBookingQuote } from '~/utils/types/courier-booking';

const UModalStub = defineComponent({
	name: 'UModal',
	template: '<section><slot name="body" /><slot name="footer" /></section>',
});

const UPopoverStub = defineComponent({
	name: 'UPopover',
	template: '<div><slot /><slot name="content" /></div>',
});

const context = (): CourierBookingContext => ({
	connected: true,
	handover: 'PICKUP',
	dropoff_point_id: null,
	collection_date: '2099-01-01',
	sender: {
		name: 'Shop',
		phone: '0123456789',
		address1: '1 Street',
		postcode: '50000',
		city: 'Kuala Lumpur',
		state: 'KUL',
		country: 'MY',
	},
});

const quotes = (): CourierBookingQuote[] => [
	{ service_id: 'svc-1', service_name: 'Pos Laju' },
	{ service_id: 'svc-2', service_name: 'J&T' },
];

const setupState = (wrapper: Awaited<ReturnType<typeof mountSuspended>>) =>
	(wrapper.vm.$ as unknown as {
		setupState: {
			collectionDate: Date;
			parcel: { weight_kg: string; width_cm: string; height_cm: string; length_cm: string };
			selectedServiceId: string | undefined;
			fetchQuotes: () => Promise<void>;
			rememberServiceId: (serviceId?: string) => void;
		};
	}).setupState;

const mountModal = async () => {
	vi.spyOn(useNuxtApp().$api.fulfillment, 'getCourierBookingContext').mockResolvedValue(context());
	vi.spyOn(useNuxtApp().$api.fulfillment, 'quoteCourierBooking').mockResolvedValue({
		quotes: quotes(),
		wallet: { balance: 10, currency: 'MYR' },
	});

	const wrapper = await mountSuspended(CourierBookingModal, {
		props: {
			open: false,
			targets: [{ fulfillmentId: 'f1', orderNo: 'ORD-1', batchNo: 1 }],
		},
		global: {
			stubs: {
				UModal: UModalStub,
				UPopover: UPopoverStub,
			},
		},
	});

	await wrapper.setProps({ open: true });
	await flushPromises();
	await nextTick();
	return wrapper;
};

describe('CourierBookingModal', () => {
	beforeEach(() => {
		localStorage.removeItem(COURIER_BOOKING_LAST_SERVICE_STORAGE_KEY);
	});

	it('uses ZDatePicker for collection date and defaults to today', async () => {
		const wrapper = await mountModal();

		const today = startOfDay(new Date());
		expect(setupState(wrapper).collectionDate.getTime()).toBe(today.getTime());
		expect(wrapper.find('[data-testid="courier-booking-collection-date"]').text()).toContain(getFormattedDate(today, 'dd-MM-yyyy'));
		expect(wrapper.find('input[type="date"]').exists()).toBe(false);

		const picker = wrapper.findComponent({ name: 'ZDatePicker' });
		expect(picker.exists()).toBe(true);
		expect(startOfDay(picker.props('minDate') as Date).getTime()).toBe(today.getTime());
	});

	it('restores the last selected courier service when it is still quoted', async () => {
		localStorage.setItem(COURIER_BOOKING_LAST_SERVICE_STORAGE_KEY, 'svc-2');
		const wrapper = await mountModal();
		const state = setupState(wrapper);
		state.parcel.weight_kg = '1';
		state.parcel.width_cm = '10';
		state.parcel.height_cm = '10';
		state.parcel.length_cm = '10';

		await state.fetchQuotes();
		await flushPromises();

		expect(state.selectedServiceId).toBe('svc-2');
	});

	it('persists the selected courier service id', async () => {
		const wrapper = await mountModal();
		const state = setupState(wrapper);

		state.rememberServiceId('svc-2');
		await nextTick();

		expect(localStorage.getItem(COURIER_BOOKING_LAST_SERVICE_STORAGE_KEY)).toBe('svc-2');
	});

	it('keeps the remembered service when the current quotes do not include it', async () => {
		localStorage.setItem(COURIER_BOOKING_LAST_SERVICE_STORAGE_KEY, 'svc-gone');
		const wrapper = await mountModal();
		const state = setupState(wrapper);
		state.parcel.weight_kg = '1';
		state.parcel.width_cm = '10';
		state.parcel.height_cm = '10';
		state.parcel.length_cm = '10';

		await state.fetchQuotes();
		await flushPromises();

		expect(state.selectedServiceId).toBe('svc-1');
		expect(localStorage.getItem(COURIER_BOOKING_LAST_SERVICE_STORAGE_KEY)).toBe('svc-gone');
	});
});
