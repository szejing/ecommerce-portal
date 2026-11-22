import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import ZPagePanel from '~/components/Z/PagePanel.vue';

describe('Portal mobile page panel', () => {
	it('keeps Back in the compact navbar and moves the toolbar into the content scroll area', async () => {
		vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener() {},
			removeListener() {},
			addEventListener() {},
			removeEventListener() {},
			dispatchEvent: () => true,
		}));
		try {
			const wrapper = await mountSuspended(ZPagePanel, {
				props: { id: 'test-mobile', title: 'Orders', description: 'Manage orders', backTo: '/' },
				slots: {
					'toolbar': '<input aria-label="Order search">',
					'navbar-right': '<button>Export</button>',
					'default': 'Results',
				},
			});
			expect(wrapper.get('input[aria-label="Order search"]').element.closest('[data-slot="body"]')).toBeTruthy();
			expect(wrapper.get('h1').text()).toBe('Orders');
			expect(wrapper.find('button[aria-label="Page actions"]').exists()).toBe(true);
			expect(wrapper.text()).not.toContain('Export');
			expect(wrapper.get('h1').element.closest('[data-slot=left]')?.querySelector('button[aria-label]')).toBeTruthy();
		} finally {
			vi.restoreAllMocks();
		}
	});
});
