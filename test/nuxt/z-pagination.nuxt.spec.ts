import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it } from 'vitest';
import ZPagination from '~/components/Z/Pagination.vue';

describe('Portal pagination', () => {
	it('offers Previous and Next with the current and total page count on mobile', async () => {
		const wrapper = await mountSuspended(ZPagination, {
			props: { page: 2, itemsPerPage: 15, total: 42 },
		});
		const mobile = wrapper.get('nav[aria-label="Result pages"]');
		expect(mobile.text()).toContain('Page 2 of 3');
		await mobile.get('button:last-child').trigger('click');
		expect(wrapper.emitted('update:page')).toEqual([[3]]);

		await wrapper.setProps({ page: 3 });
		expect(mobile.get('button:last-child').attributes('disabled')).toBeDefined();
		await mobile.get('button:first-child').trigger('click');
		expect(wrapper.emitted('update:page')).toEqual([[3], [2]]);
	});
});
