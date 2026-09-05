import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import AnalyticsIndexPage from '~/pages/analytics/index.vue';

describe('AnalyticsIndexPage', () => {
	it('shows order and sales analytics without a Google Analytics settings card', async () => {
		const wrapper = await mountSuspended(AnalyticsIndexPage, {
			global: {
				stubs: {
					ZPagePanel: { template: '<main><slot /></main>' },
				},
			},
		});

		const html = wrapper.html();
		expect(html).toContain('/analytics/orders/summary');
		expect(html).toContain('/analytics/sales/summary');
		expect(html).toContain('/analytics/sales/shipping');
		expect(html).toContain('/analytics/sales/shipping-details');
		expect(html).not.toContain('/analytics/google-analytics');
		expect(html).not.toContain('Manage Google Analytics');
	});
});
