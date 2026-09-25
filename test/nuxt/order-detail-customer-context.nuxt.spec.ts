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

describe('OrderDetailCustomer context', () => {
	it('labels pickup as Customer and delivery as Ship to', async () => {
		const pickup = await mountSuspended(OrderDetailCustomer, { props: { customer, showAddresses: false, orderNo: 'O1' } });
		const delivery = await mountSuspended(OrderDetailCustomer, { props: { customer, showAddresses: true, orderNo: 'O1' } });

		expect(pickup.get('h2').text()).toContain('Customer');
		expect(delivery.get('h2').text()).toContain('Ship to');
		expect(pickup.text()).toContain('+60 123456789');
		expect(pickup.find('[aria-label="Edit customer"]').exists()).toBe(true);
	});

	it('shows contact and addresses without a collapse toggle', async () => {
		const wrapper = await mountSuspended(OrderDetailCustomer, { props: { customer, showAddresses: true, orderNo: 'O1' } });

		expect(wrapper.find('[aria-label="Show or hide customer details"]').exists()).toBe(false);
		expect(wrapper.text()).toContain('C0001');
		expect(wrapper.text()).toContain('aisyah@example.com');
		expect(wrapper.text()).toContain('12 Jalan Merdeka');
		expect(wrapper.find('[aria-label="Copy address"]').exists()).toBe(true);
		expect(wrapper.find('[aria-label="Copy billing address"]').exists()).toBe(true);
	});

	it('keeps address actions out of pickup customer context', async () => {
		const wrapper = await mountSuspended(OrderDetailCustomer, { props: { customer, showAddresses: false, orderNo: 'O1' } });

		expect(wrapper.text()).toContain('Aisyah');
		expect(wrapper.text()).not.toContain('12 Jalan Merdeka');
		expect(wrapper.find('[aria-label="Copy address"]').exists()).toBe(false);
	});

	it('marks missing contact so staff can see what to correct', async () => {
		const incomplete: CustomerModel = {
			...customer,
			email_address: '',
			phone_no: '',
		};
		const wrapper = await mountSuspended(OrderDetailCustomer, { props: { customer: incomplete, showAddresses: false, orderNo: 'O1' } });

		expect(wrapper.text()).toContain('Not set');
		expect(wrapper.find('[aria-label="Edit customer"]').exists()).toBe(true);
	});
});
