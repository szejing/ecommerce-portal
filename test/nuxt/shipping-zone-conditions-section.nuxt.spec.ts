import { describe, expect, it } from 'vitest';
import { reactive, nextTick } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { FilterOperator, ShippingZoneConditionField } from 'yeppi-common';
import ZInputShippingZoneConditionsSection from '~/components/Z/Input/ShippingZone/ConditionsSection.vue';
import { defaultShippingZoneConditions } from '~/utils/shipping-zone-conditions';
import type { ShippingZoneFormFields } from '~/utils/types/form/shipping-zone-form';

function baseState(conditions?: ShippingZoneFormFields['conditions']): Pick<ShippingZoneFormFields, 'conditions'> {
	return {
		conditions: conditions ?? defaultShippingZoneConditions(),
	};
}

const mountOptions = {
	global: {
		stubs: {
			ZSelectMenuCountry: {
				name: 'ZSelectMenuCountry',
				props: ['iso2Codes', 'multiple', 'placeholder'],
				template: '<div class="country-select-stub">{{ (iso2Codes || []).join(",") }}</div>',
			},
			ZSelectMenuState: {
				name: 'ZSelectMenuState',
				props: ['stateNames', 'multiple', 'placeholder'],
				template: '<div class="state-select-stub">{{ (stateNames || []).join(",") }}</div>',
			},
		},
	},
};

describe('ZInputShippingZoneConditionsSection', () => {
	it('renders prefilled include country through the country select', async () => {
		const state = reactive(baseState());

		const wrapper = await mountSuspended(ZInputShippingZoneConditionsSection, {
			props: { state },
			...mountOptions,
		});

		expect(wrapper.text()).toContain('Conditions');
		expect(wrapper.find('.country-select-stub').exists()).toBe(true);
		expect(wrapper.find('.country-select-stub').text()).toContain('MY');
		expect(wrapper.find('input.uppercase[maxlength="64"]').exists()).toBe(false);
	});

	it('warns when there is no include country', async () => {
		const state = reactive(baseState([]));

		const wrapper = await mountSuspended(ZInputShippingZoneConditionsSection, {
			props: { state },
			...mountOptions,
		});

		expect(wrapper.text()).toContain('No include country');
	});

	it('uses input tags for postcode conditions', async () => {
		const state = reactive(
			baseState([
				{
					filter_operator: FilterOperator.INCLUDE,
					field: ShippingZoneConditionField.POSTCODE,
					values: ['09000'],
				},
			]),
		);

		const wrapper = await mountSuspended(ZInputShippingZoneConditionsSection, {
			props: { state },
			...mountOptions,
		});

		expect(wrapper.find('textarea').exists()).toBe(false);
		const tags = wrapper.findComponent({ name: 'UInputTags' });
		expect(tags.exists()).toBe(true);
		expect(tags.props('modelValue')).toEqual(['09000']);

		await tags.vm.$emit('update:modelValue', ['09000', '47*', '  47500  ']);
		await nextTick();
		expect(state.conditions[0]?.values).toEqual(['09000', '47*', '47500']);
	});

	it('uses the state select for state conditions', async () => {
		const state = reactive(
			baseState([
				{
					filter_operator: FilterOperator.INCLUDE,
					field: ShippingZoneConditionField.STATE,
					values: ['Johor'],
				},
			]),
		);

		const wrapper = await mountSuspended(ZInputShippingZoneConditionsSection, {
			props: { state },
			...mountOptions,
		});

		expect(wrapper.find('.state-select-stub').exists()).toBe(true);
		expect(wrapper.find('.state-select-stub').text()).toContain('Johor');
		expect(wrapper.find('.country-select-stub').exists()).toBe(false);
	});

	it('adds and removes a condition row', async () => {
		const state = reactive(baseState());

		const wrapper = await mountSuspended(ZInputShippingZoneConditionsSection, {
			props: { state },
			...mountOptions,
		});

		expect(state.conditions).toHaveLength(1);

		const addButton = wrapper.findAll('button').find((b) => b.text().includes('Add condition'));
		expect(addButton).toBeDefined();
		await addButton!.trigger('click');
		expect(state.conditions).toHaveLength(2);

		const deleteButton = wrapper.findAll('button').find((b) => b.text().includes('Delete'));
		expect(deleteButton).toBeDefined();
		await deleteButton!.trigger('click');
		expect(state.conditions).toHaveLength(1);
	});
});
