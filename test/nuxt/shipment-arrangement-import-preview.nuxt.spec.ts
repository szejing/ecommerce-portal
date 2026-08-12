import { describe, expect, it } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import ImportPreviewModal from '~/components/ShipmentArrangement/ImportPreviewModal.vue';
import type { ShipmentArrangementApplyResponse, ShipmentArrangementPreviewResponse } from '~/utils/types/shipment-arrangement';

const previewRow = {
	fulfillment_id: 'fulfillment-1',
	source_updated_at: '2026-07-18T00:00:00.000Z',
	order_no: 'WM-1001',
	batch_no: 1,
	ordered_at: '2026-07-18T00:00:00.000Z',
	recipient: 'Ahmad Azman',
	destination: 'Cheras, Selangor',
	shipping_method: 'J&T Express',
	row_number: 2,
	courier: '',
	tracking_no: '',
} as const;

const UModalStub = defineComponent({
	name: 'UModal',
	props: {
		open: {
			type: Boolean,
			default: false,
		},
	},
	template: '<section><slot name="body"/><slot name="footer"/></section>',
});

const mountModal = (props: {
	modelValue?: boolean;
	preview?: ShipmentArrangementPreviewResponse;
	eligibleCount?: number;
	applyResult?: ShipmentArrangementApplyResponse;
	applying?: boolean;
	error?: string;
} = {}) =>
	mountSuspended(ImportPreviewModal, {
		props: { modelValue: true, eligibleCount: 0, ...props },
		global: { stubs: { UModal: UModalStub } },
	});

describe('ShipmentArrangementImportPreviewModal', () => {
	it('disables apply when preview has no eligible rows and exposes row messages', async () => {
		const wrapper = await mountModal({
			preview: {
				total: 1,
				valid: 0,
				warnings: 0,
				errors: 1,
				rows: [{ ...previewRow, status: 'error', messages: ['Tracking number is required'] }],
			},
		});

		expect(wrapper.get('[data-testid="apply-shipments"]').attributes('disabled')).toBeDefined();
		expect(wrapper.text()).toContain('Tracking number is required');
		expect(wrapper.text()).toContain('Errors');
	});

	it('counts valid and warning rows as eligible and keeps warnings visible', async () => {
		const preview: ShipmentArrangementPreviewResponse = {
			total: 2,
			valid: 1,
			warnings: 1,
			errors: 0,
			rows: [
				{ ...previewRow, status: 'valid', messages: [], courier: 'J&T', tracking_no: 'JT-1' },
				{ ...previewRow, fulfillment_id: 'fulfillment-2', row_number: 3, status: 'warning', messages: ['Courier name will be saved as entered'], courier: 'J and T', tracking_no: 'JT-2' },
			],
		};
		const wrapper = await mountModal({ preview, eligibleCount: 2 });

		expect(wrapper.get('[data-testid="apply-shipments"]').text()).toContain('Update 2 shipments');
		expect(wrapper.text()).toContain('Courier name will be saved as entered');
		expect(wrapper.text()).toContain('Warnings');
	});

	it('shows partial apply results and failed row reasons', async () => {
		const wrapper = await mountModal({
			applyResult: {
				total: 2,
				updated: 1,
				failed: 1,
				errors: [{ fulfillment_id: 'fulfillment-2', order_no: 'WM-1002', batch_no: 2, message: 'Shipment changed after export' }],
			},
		});

		expect(wrapper.text()).toContain('1 shipment updated');
		expect(wrapper.text()).toContain('1 failed');
		expect(wrapper.text()).toContain('Shipment changed after export');
	});

	it('emits apply intent without reaching into Pinia', async () => {
		const preview: ShipmentArrangementPreviewResponse = {
			total: 2,
			valid: 1,
			warnings: 1,
			errors: 0,
			rows: [
				{ ...previewRow, status: 'valid', messages: [], courier: 'J&T', tracking_no: 'JT-1' },
				{ ...previewRow, fulfillment_id: 'fulfillment-2', row_number: 3, status: 'warning', messages: ['Courier name will be saved as entered'], courier: 'J and T', tracking_no: 'JT-2' },
			],
		};
		const wrapper = await mountModal({ preview, eligibleCount: 2 });

		await wrapper.get('[data-testid="apply-shipments"]').trigger('click');

		expect(wrapper.emitted('apply')).toHaveLength(1);
	});

	it('emits dismiss intent when closed', async () => {
		const wrapper = await mountModal();
		const close = wrapper.findAll('button').find((button) => button.text().includes('Cancel'));

		expect(close).toBeDefined();
		await close!.trigger('click');

		expect(wrapper.emitted('dismiss')).toHaveLength(1);
	});
});
