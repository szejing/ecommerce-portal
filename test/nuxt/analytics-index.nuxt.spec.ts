import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import AnalyticsIndexPage from '~/pages/analytics/index.vue';

describe('AnalyticsIndexPage', () => {
	it('links to the Google Analytics configuration page', async () => {
		const wrapper = await mountSuspended(AnalyticsIndexPage, {
			global: {
				stubs: {
					ZPagePanel: { template: '<main><slot /></main>' },
				},
			},
		});

		expect(wrapper.html()).toContain('/analytics/google-analytics');
	});
});
