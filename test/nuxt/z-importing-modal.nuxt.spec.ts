import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import ZModalImporting from '~/components/Z/Modal/Importing.vue';

const UModalStub = defineComponent({
	name: 'UModal',
	props: {
		close: {
			type: Boolean,
			default: true,
		},
		dismissible: {
			type: Boolean,
			default: true,
		},
		ui: {
			type: Object,
			default: undefined,
		},
	},
	template: '<section><slot name="body" /></section>',
});

const UProgressStub = defineComponent({
	name: 'UProgress',
	props: {
		modelValue: {
			type: Number,
			default: null,
		},
		max: {
			type: Number,
			default: undefined,
		},
		status: {
			type: Boolean,
			default: false,
		},
	},
	template: '<div data-testid="progress-stub" />',
});

const mountImportingModal = (props: Record<string, unknown> = {}) =>
	mountSuspended(ZModalImporting, {
		props,
		global: {
			stubs: {
				UModal: UModalStub,
				UProgress: UProgressStub,
			},
		},
	});

describe('ZModalImporting', () => {
	it('locks the modal and uses a visible processing animation', async () => {
		const wrapper = await mountImportingModal();
		const modal = wrapper.findComponent(UModalStub);

		expect(modal.props('close')).toBe(false);
		expect(modal.props('dismissible')).toBe(false);
		expect(wrapper.find('[data-slot="header"]').exists()).toBe(false);
		expect(wrapper.html()).not.toContain('animate-pulse');
		expect(wrapper.find('[data-testid="importing-icon-ring"]').classes()).toContain('motion-safe:animate-spin');
	});

	it('stays indeterminate while the Import Unit total is unknown', async () => {
		const wrapper = await mountImportingModal({ processed: 4, total: null, elapsedSeconds: 12 });
		const progress = wrapper.findComponent(UProgressStub);

		expect(progress.props('modelValue')).toBeNull();
		expect(progress.props('status')).toBe(false);
		expect(wrapper.find('[data-testid="importing-progress-status"]').text()).toContain('12s');
		expect(wrapper.find('[data-testid="importing-progress-status"]').text()).not.toContain('4 of');
	});

	it('shows determinate Import Progress once the total is known', async () => {
		const wrapper = await mountImportingModal({ processed: 12, total: 40, elapsedSeconds: 125 });
		const progress = wrapper.findComponent(UProgressStub);
		const status = wrapper.find('[data-testid="importing-progress-status"]');

		expect(progress.props('modelValue')).toBe(12);
		expect(progress.props('max')).toBe(40);
		expect(status.attributes('role')).toBe('status');
		expect(status.attributes('aria-live')).toBe('polite');
		expect(status.attributes('aria-atomic')).toBe('true');
		expect(status.text()).toContain('12');
		expect(status.text()).toContain('40');
		expect(status.text()).toContain('2:05');
	});

	it('hides the stop control unless the caller can stop the import', async () => {
		const wrapper = await mountImportingModal();

		expect(wrapper.find('[data-testid="importing-stop"]').exists()).toBe(false);
	});

	it('emits stop when staff stop the import', async () => {
		const wrapper = await mountImportingModal({ showStop: true, processed: 3, total: 40 });
		const stop = wrapper.find('[data-testid="importing-stop"]');

		expect(stop.exists()).toBe(true);
		await stop.trigger('click');
		expect(wrapper.emitted('stop')).toHaveLength(1);
	});
});
