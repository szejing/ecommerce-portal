import { Time } from '@internationalized/date';
import { describe, expect, it } from 'vitest';
import { reactive } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import ZInputShippingZoneDetailsSection from '~/components/Z/Input/ShippingZone/DetailsSection.vue';
import { defaultShippingZoneConditions } from '~/utils/shipping-zone-conditions';
import type { ShippingZoneFormFields } from '~/utils/types/form/shipping-zone-form';

function baseState(overrides: Partial<ShippingZoneFormFields> = {}): ShippingZoneFormFields {
	return {
		code: '',
		description: '',
		rule: 0,
		is_active: true,
		conditions: defaultShippingZoneConditions(),
		shipping_method_ids: [],
		method_pricing: {},
		...overrides,
	};
}

const mountOptions = {
	global: {
		stubs: {
			ZInputShippingZoneConditionsSection: {
				name: 'ZInputShippingZoneConditionsSection',
				template: '<div class="conditions-section-stub" />',
			},
		},
	},
};

describe('ZInputShippingZoneDetailsSection', () => {
	it('renders zone details section and conditions child', async () => {
		const state = reactive<ShippingZoneFormFields>(baseState());

		const wrapper = await mountSuspended(ZInputShippingZoneDetailsSection, {
			props: {
				state,
				methodOptions: [
					{ label: 'Standard', value: 'sm_1' },
					{ label: 'Express', value: 'sm_2' },
				],
			},
			...mountOptions,
		});

		expect(wrapper.find('#section-shipping-zone-details').exists()).toBe(true);
		expect(wrapper.text()).toContain('Stable identifier for this zone');
		expect(wrapper.find('.conditions-section-stub').exists()).toBe(true);
	});

	it('disables code input when codeReadonly is true', async () => {
		const state = reactive<ShippingZoneFormFields>(baseState({ code: 'ZONE_A' }));

		const wrapper = await mountSuspended(ZInputShippingZoneDetailsSection, {
			props: {
				state,
				methodOptions: [],
				codeReadonly: true,
			},
			...mountOptions,
		});

		const codeInput = wrapper.find('input[maxlength="32"]');
		expect(codeInput.exists()).toBe(true);
		expect((codeInput.element as HTMLInputElement).disabled).toBe(true);
	});

	it('uppercases code when codeForceUppercase is true', async () => {
		const state = reactive<ShippingZoneFormFields>(baseState());

		const wrapper = await mountSuspended(ZInputShippingZoneDetailsSection, {
			props: {
				state,
				methodOptions: [],
				codeForceUppercase: true,
			},
			...mountOptions,
		});

		const codeInput = wrapper.get('input[maxlength="32"]');
		await codeInput.setValue('my_zone');
		expect(state.code).toBe('MY_ZONE');
	});

	it('renders order cutoff time for selected shipping methods', async () => {
		const state = reactive<ShippingZoneFormFields>(
			baseState({
				code: 'ZONE_A',
				shipping_method_ids: ['1'],
				method_pricing: {
					'1': { fee: 15, estimated_days: 1, order_cutoff_time: '12:00' },
				},
			}),
		);

		const wrapper = await mountSuspended(ZInputShippingZoneDetailsSection, {
			props: {
				state,
				methodOptions: [{ label: 'Same-Day Delivery', value: '1' }],
			},
			...mountOptions,
		});

		const cutoffInput = wrapper.findComponent({ name: 'UInputTime' });
		expect(cutoffInput.exists()).toBe(true);
		expect(cutoffInput.props('modelValue')).toEqual(new Time(12, 0));
		await cutoffInput.vm.$emit('update:modelValue', new Time(11, 30));
		expect(state.method_pricing['1']?.order_cutoff_time).toBe('11:30');
	});
});
