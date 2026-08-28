import { describe, expect, it } from 'vitest';
import { reactive } from 'vue';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { PRODUCT_SHORT_DESC_MAX } from 'yeppi-common';
import ZInputProductBasicInfoSection from '~/components/Z/Input/Product/BasicInfoSection.vue';
import type { ProductBasicInfoState } from '~/components/Z/Input/Product/BasicInfoSection.vue';

function baseState(overrides: Partial<ProductBasicInfoState> = {}): ProductBasicInfoState {
	return {
		is_active: true,
		type_id: 1,
		code: 'SKU1',
		name: 'Cotton Tee',
		short_desc: 'Soft cotton tee',
		long_desc: '<p>Details</p>',
		...overrides,
	};
}

const mountOptions = {
	global: {
		stubs: {
			UTooltip: { template: '<span><slot /></span>' },
			ZInputProductLongDescriptionEditor: { template: '<div class="long-desc-editor-stub" />' },
			ZDropzone: true,
			ZSelectMenuProductType: true,
			ZSelectMenuProductStatus: true,
		},
	},
};

describe('ZInputProductBasicInfoSection descriptions', () => {
	it('shows the Product Short Description counter and maxlength', async () => {
		const state = reactive<ProductBasicInfoState>(baseState());

		const wrapper = await mountSuspended(ZInputProductBasicInfoSection, {
			props: { state, showLongDescription: false },
			...mountOptions,
		});

		const textarea = wrapper.find('textarea');
		expect(textarea.exists()).toBe(true);
		expect(textarea.attributes('maxlength')).toBe(String(PRODUCT_SHORT_DESC_MAX));
		expect(wrapper.text()).toContain(`${state.short_desc?.length} / ${PRODUCT_SHORT_DESC_MAX}`);
	});

	it('shows Product Long Description when Hide Long Description is off', async () => {
		const state = reactive<ProductBasicInfoState>(baseState());

		const wrapper = await mountSuspended(ZInputProductBasicInfoSection, {
			props: { state, showLongDescription: true },
			...mountOptions,
		});

		expect(wrapper.text()).toContain('Long Description');
		expect(wrapper.find('.long-desc-editor-stub').exists()).toBe(true);
	});

	it('hides Product Long Description when Hide Long Description is on', async () => {
		const state = reactive<ProductBasicInfoState>(baseState());

		const wrapper = await mountSuspended(ZInputProductBasicInfoSection, {
			props: { state, showLongDescription: false },
			...mountOptions,
		});

		expect(wrapper.text()).not.toContain('Long Description');
		expect(wrapper.find('.long-desc-editor-stub').exists()).toBe(false);
	});
});
