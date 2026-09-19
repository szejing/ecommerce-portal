import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import ZDropzone from '~/components/Z/Dropzone/index.vue';

describe('ZDropzone', () => {
	it('shows upload affordance after deleting the only existing image', async () => {
		const wrapper = await mountSuspended(ZDropzone, {
			props: {
				multiple: false,
				existingImages: ['https://cdn.example.com/thumbnail.webp'],
			},
		});

		expect(wrapper.find('.preview-item').exists()).toBe(true);

		await wrapper.find('button.delete-button').trigger('click');
		await nextTick();

		expect(wrapper.find('.preview-item').exists()).toBe(false);
		expect(wrapper.text()).toContain('Drop a file here or click to upload');
		expect(wrapper.emitted('delete-image')).toBeTruthy();
	});

	it('shows upload affordance when existingImages is cleared by the parent', async () => {
		const wrapper = await mountSuspended(ZDropzone, {
			props: {
				multiple: false,
				existingImages: ['https://cdn.example.com/thumbnail.webp'],
			},
		});

		await wrapper.setProps({ existingImages: [] });
		await nextTick();

		expect(wrapper.find('.preview-item').exists()).toBe(false);
		expect(wrapper.text()).toContain('Drop a file here or click to upload');
	});
});
