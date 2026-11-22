import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import ZCreateButton from '~/components/Z/CreateButton.vue';
import { ICONS } from '~/utils/icons';

describe('ZCreateButton', () => {
	it('uses the product and service icons instead of the plus icon', async () => {
		const product = await mountSuspended(ZCreateButton, {
			props: { label: 'Add product', icon: ICONS.CUBE },
		});
		const service = await mountSuspended(ZCreateButton, {
			props: { label: 'Add service', icon: ICONS.SERVICE },
		});

		expect(product.getComponent({ name: 'UIcon' }).props('name')).toBe(ICONS.CUBE);
		expect(service.getComponent({ name: 'UIcon' }).props('name')).toBe(ICONS.SERVICE);
		expect(product.html()).not.toContain(ICONS.ADD_OUTLINE);
		expect(service.html()).not.toContain(ICONS.ADD_OUTLINE);
	});

	it('keeps the plus icon when no icon is passed', async () => {
		const wrapper = await mountSuspended(ZCreateButton, { props: { label: 'Add category' } });

		expect(wrapper.getComponent({ name: 'UIcon' }).props('name')).toBe(ICONS.ADD_OUTLINE);
	});
});
