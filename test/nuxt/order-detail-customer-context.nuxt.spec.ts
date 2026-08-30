import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import OrderDetailCustomer from '~/components/Z/Section/Order/Detail/Customer.vue';
import type { CustomerModel } from '~/utils/models/customer.model';

const customer: CustomerModel = {
	name: 'Aisyah',
	customer_no: 'C0001',
	email_address: 'aisyah@example.com',
	dial_code: '+60',
	phone_no: '123456789',
	shipping_address: {
		address1: '12 Jalan Merdeka',
		city: 'Kuala Lumpur',
		postal_code: '50000',
		state: 'Kuala Lumpur',
		country_code: 'MY',
	},
	billing_address: {
		address1: '12 Jalan Merdeka',
		city: 'Kuala Lumpur',
		postal_code: '50000',
		state: 'Kuala Lumpur',
		country_code: 'MY',
	},
};

const toggleSelector = '[aria-label="Show or hide customer details"]';

describe('OrderDetailCustomer context', () => {
	it('labels pickup as Customer and delivery as Ship to', async () => {
		const pickup = await mountSuspended(OrderDetailCustomer, { props: { customer, showAddresses: false } });
		const delivery = await mountSuspended(OrderDetailCustomer, { props: { customer, showAddresses: true } });

		expect(pickup.get('h2').text()).toContain('Customer');
		expect(delivery.get('h2').text()).toContain('Ship to');
		expect(pickup.text()).toContain('Aisyah · 123456789');
	});

	it('keeps details collapsed until the header toggle is opened', async () => {
		const wrapper = await mountSuspended(OrderDetailCustomer, { props: { customer, showAddresses: true } });

		expect(wrapper.text()).not.toContain('C0001');
		expect(wrapper.text()).not.toContain('12 Jalan Merdeka');

		await wrapper.get(toggleSelector).trigger('click');

		expect(wrapper.text()).toContain('C0001');
		expect(wrapper.text()).toContain('12 Jalan Merdeka');
		expect(wrapper.find('[aria-label="Copy address"]').exists()).toBe(true);
	});

	it('keeps address actions out of pickup customer context', async () => {
		const wrapper = await mountSuspended(OrderDetailCustomer, { props: { customer, showAddresses: false } });

		await wrapper.get(toggleSelector).trigger('click');

		expect(wrapper.text()).toContain('Aisyah');
		expect(wrapper.text()).not.toContain('12 Jalan Merdeka');
		expect(wrapper.find('[aria-label="Copy address"]').exists()).toBe(false);
	});
});
