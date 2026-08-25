import { describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import ZImportActions from '~/components/Z/ImportActions.vue';

const UModalStub = defineComponent({
	name: 'UModal',
	props: {
		open: {
			type: Boolean,
			default: false,
		},
		title: {
			type: String,
			default: undefined,
		},
		ui: {
			type: Object,
			default: undefined,
		},
	},
	template: '<section v-if="open"><slot name="body" /></section>',
});

const mountImportActions = (
	options: Parameters<typeof mountSuspended<typeof ZImportActions>>[1] = {},
) =>
	mountSuspended(ZImportActions, {
		...options,
		global: {
			...options.global,
			stubs: {
				...options.global?.stubs,
				UModal: UModalStub,
			},
		},
	});

describe('ZImportActions', () => {
	it('emits downloadTemplate when template button is clicked', async () => {
		const onDownloadTemplate = vi.fn();

		const wrapper = await mountImportActions({
			props: {
				accept: '.xlsx,.xls',
				onDownloadTemplate,
			},
		});

		const buttons = wrapper.findAll('button');
		await buttons[0]?.trigger('click');

		expect(onDownloadTemplate).toHaveBeenCalledTimes(1);
	});

	it('emits import with a valid selected file', async () => {
		const onImport = vi.fn();
		const file = new File(['test'], 'products.xlsx', {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		});

		const wrapper = await mountImportActions({
			props: {
				accept: '.xlsx,.xls',
				isAllowedFile: () => true,
				onImport,
			},
		});

		const input = wrapper.find('input[type="file"]');
		Object.defineProperty(input.element, 'files', {
			value: [file],
			configurable: true,
		});

		await input.trigger('change');

		expect(onImport).toHaveBeenCalledWith(file, undefined);
	});

	it('lets admin choose an import source before selecting a file', async () => {
		const onImport = vi.fn();
		const file = new File(['test'], 'products.xlsx', {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		});

		const wrapper = await mountImportActions({
			props: {
				accept: '.xlsx,.xls',
				isAllowedFile: () => true,
				importSources: [
					{ label: 'Our template', value: 'wemotoo' },
					{ label: 'Sitegiant', value: 'sitegiant' },
				],
				onImport,
			},
		});

		const buttons = wrapper.findAll('button');
		await buttons[1]?.trigger('click');
		await wrapper
			.findAll('button')
			.find((button) => button.text().includes('Sitegiant'))
			?.trigger('click');

		const input = wrapper.find('input[type="file"]');
		Object.defineProperty(input.element, 'files', {
			value: [file],
			configurable: true,
		});

		await input.trigger('change');

		expect(onImport).toHaveBeenCalledWith(file, 'sitegiant');
	});

	it('renders logoSrc image and icon mark for import sources', async () => {
		const wrapper = await mountImportActions({
			props: {
				accept: '.xlsx,.xls',
				importSources: [
					{ label: 'Our template', value: 'wemotoo', logoSrc: '/logo/logo.png' },
					{ label: 'Sitegiant', value: 'sitegiant', logoSrc: '/logo/sitegiant.png' },
					{ label: 'TikTok Shop', value: 'tiktok', icon: 'i-simple-icons-tiktok' },
					{ label: 'Plain', value: 'plain' },
				],
			},
		});

		const buttons = wrapper.findAll('button');
		await buttons[1]?.trigger('click');

		const images = wrapper.findAll('img');
		expect(images.some((img) => img.attributes('src') === '/logo/logo.png')).toBe(true);
		expect(images.some((img) => img.attributes('src') === '/logo/sitegiant.png')).toBe(true);

		expect(
			wrapper.findAllComponents({ name: 'UIcon' }).some((icon) => icon.props('name') === 'i-simple-icons-tiktok'),
		).toBe(true);
		expect(wrapper.findAll('button').find((button) => button.text().includes('Plain'))).toBeTruthy();
	});
});
