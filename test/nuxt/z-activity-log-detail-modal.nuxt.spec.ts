import { describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { defineComponent } from 'vue';
import ZModalActivityLogDetail from '~/components/Z/Modal/ActivityLog/Detail.vue';
import type { ActivityLog } from '~/utils/types/activity-log';

vi.mock('~/stores/AppUi/AppUi', () => ({
	successNotification: vi.fn(),
	failedNotification: vi.fn(),
}));

const UModalStub = defineComponent({
	name: 'UModal',
	props: {
		title: { type: String, default: '' },
		scrollable: { type: Boolean, default: false },
		ui: { type: Object, default: undefined },
	},
	template: '<section><slot name="body" /><slot name="footer" /></section>',
});

const UTableStub = defineComponent({
	name: 'UTable',
	props: {
		data: { type: Array, default: () => [] },
		columns: { type: Array, default: () => [] },
		virtualize: { type: [Boolean, Object], default: false },
		ui: { type: Object, default: undefined },
	},
	template: '<div data-testid="failed-units-table" :data-virtualize="String(!!virtualize)" />',
});

const baseLog: ActivityLog = {
	id: 1,
	desc: 'Order updated',
	internal_desc: 'Order #<B>1001</B> updated by staff',
	action: 'updated',
	actor_type: 'admin',
	actor_id: 'admin-1',
	source: 'admin_portal',
	ref_no: 'order:1001',
	created_at: '2026-09-06T12:00:00.000Z',
};

const importLog: ActivityLog = {
	...baseLog,
	id: 2,
	action: 'imported',
	source: 'import',
	internal_desc: 'Product import completed for catalog.xlsx: 10 total rows, 7 created, 0 updated, 3 failed',
	ref_no: 'product-import:2026-09-06',
	ref_no2: 'catalog.xlsx',
	metadata: {
		import_type: 'product',
		file_name: 'catalog.xlsx',
		total: 10,
		created: 7,
		updated: 0,
		failed: 3,
		errors: [
			{ row: 4, code: 'SKU-1', message: 'duplicate sku' },
			{ row: 8, message: 'null product_code' },
		],
	},
};

const mountDetail = (activityLog: ActivityLog) =>
	mountSuspended(ZModalActivityLogDetail, {
		props: {
			activityLog,
		},
		global: {
			stubs: {
				UModal: UModalStub,
				UTable: UTableStub,
				UBadge: true,
				UButton: true,
			},
		},
	});

describe('ZModalActivityLogDetail', () => {
	it('shows header fields without an Import Report for non-import logs', async () => {
		const wrapper = await mountDetail(baseLog);

		expect(wrapper.find('[data-testid="activity-log-detail-description"]').text()).toContain('Order #');
		expect(wrapper.find('[data-testid="activity-log-detail-meta"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="activity-log-import-report"]').exists()).toBe(false);
	});

	it('renders Import Report counts and failed Import Units for product import logs', async () => {
		const wrapper = await mountDetail(importLog);

		expect(wrapper.find('[data-testid="activity-log-import-report"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="activity-log-import-counts"]').text()).toContain('10');
		expect(wrapper.find('[data-testid="activity-log-import-counts"]').text()).toContain('7');
		expect(wrapper.find('[data-testid="activity-log-import-counts"]').text()).toContain('3');
		expect(wrapper.find('[data-testid="failed-units-table"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="activity-log-copy-failed-units"]').exists()).toBe(true);
	});

	it('emits close when Close is clicked', async () => {
		const UButtonStub = defineComponent({
			name: 'UButton',
			props: {
				label: { type: String, default: '' },
				color: { type: String, default: undefined },
				variant: { type: String, default: undefined },
				icon: { type: String, default: undefined },
				size: { type: String, default: undefined },
			},
			emits: ['click'],
			template: '<button type="button" :data-label="label" @click="$emit(\'click\')"><slot /></button>',
		});

		const wrapper = await mountSuspended(ZModalActivityLogDetail, {
			props: { activityLog: baseLog },
			global: {
				stubs: {
					UModal: UModalStub,
					UTable: UTableStub,
					UBadge: true,
					UButton: UButtonStub,
				},
			},
		});

		const closeButton = wrapper.find('button[data-label="Close"]');
		expect(closeButton.exists()).toBe(true);
		await closeButton.trigger('click');
		expect(wrapper.emitted('close')).toBeTruthy();
	});
});
