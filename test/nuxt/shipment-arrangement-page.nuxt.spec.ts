import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import ShipmentArrangementPage from '~/pages/orders/shipment-arrangement.vue';
import { useShipmentArrangementStore } from '~/stores/ShipmentArrangement/ShipmentArrangement';
import { useShippingMethodStore } from '~/stores/ShippingMethod/ShippingMethod';
import { useAppUiStore } from '~/stores/AppUi/AppUi';
import type { ShipmentArrangementListRow } from '~/utils/types/shipment-arrangement';

const pendingRow: ShipmentArrangementListRow = {
	fulfillment_id: '11111111-1111-4111-8111-111111111111',
	source_updated_at: '2026-07-18T01:00:00.000Z',
	order_no: 'WM-100',
	batch_no: 1,
	ordered_at: '2026-07-17T01:00:00.000Z',
	recipient: 'Alice',
	destination: 'Selangor',
	shipping_method: 'Standard',
};

const mountPage = () =>
	mountSuspended(ShipmentArrangementPage, {
		global: {
			stubs: {
				ZPagePanel: { template: '<main><slot name="navbar-right"/><slot/></main>' },
			},
		},
	});

const mockPendingResponse = (rows: ShipmentArrangementListRow[] = [], total = rows.length) =>
	vi.spyOn(useNuxtApp().$api.fulfillment, 'getShipmentArrangement').mockResolvedValue({ data: rows, total });

describe('ShipmentArrangementPage', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		useShipmentArrangementStore().$reset();
		useShippingMethodStore().$reset();
		useAppUiStore().$reset();
		mockPendingResponse();
		vi.spyOn(useShippingMethodStore(), 'fetchActiveShippingMethodOptions').mockResolvedValue([]);
	});

	it('initializes once and sends filter intent to Pinia', async () => {
		const store = useShipmentArrangementStore();
		const initialize = vi.spyOn(store, 'initialize').mockResolvedValue();
		const setSearch = vi.spyOn(store, 'setSearch');
		const wrapper = await mountPage();

		expect(initialize).toHaveBeenCalledTimes(1);
		await wrapper.get('input[placeholder="Search order, batch or recipient"]').setValue('WM-100');
		expect(setSearch).toHaveBeenCalledWith('WM-100');
		wrapper.unmount();
	});

	it('sends workflow control intent to Pinia', async () => {
		mockPendingResponse([pendingRow]);
		const store = useShipmentArrangementStore();
		const setShippingMethod = vi.spyOn(store, 'setShippingMethod');
		const setDateRange = vi.spyOn(store, 'setDateRange');
		const setPage = vi.spyOn(store, 'setPage').mockResolvedValue({ status: 'completed' });
		const setPageSize = vi.spyOn(store, 'setPageSize').mockResolvedValue({ status: 'completed' });
		const clearFilters = vi.spyOn(store, 'clearFilters').mockResolvedValue({ status: 'completed' });
		const exportPending = vi.spyOn(store, 'exportPending').mockResolvedValue({ status: 'completed' });
		const dateRange = { start: new Date('2026-07-01'), end: new Date('2026-07-18') };
		const wrapper = await mountPage();

		wrapper.findComponent({ name: 'USelectMenu' }).vm.$emit('update:modelValue', 7);
		expect(setShippingMethod).toHaveBeenCalledWith(7);
		wrapper.findComponent({ name: 'ZDateRange' }).vm.$emit('update:modelValue', dateRange);
		expect(setDateRange).toHaveBeenCalledWith(dateRange);
		wrapper.findComponent({ name: 'UPagination' }).vm.$emit('update:page', 2);
		expect(setPage).toHaveBeenCalledWith(2);
		wrapper.findComponent({ name: 'ZTableToolbar' }).vm.$emit('update:modelValue', 25);
		expect(setPageSize).toHaveBeenCalledWith(25);
		await wrapper.get('[data-testid="clear-filters"]').trigger('click');
		expect(clearFilters).toHaveBeenCalledTimes(1);
		await wrapper.get('[data-testid="workflow-export"]').trigger('click');
		expect(exportPending).toHaveBeenCalledTimes(1);
		wrapper.unmount();
	});

	it('sends refresh intent from the empty state to Pinia', async () => {
		const store = useShipmentArrangementStore();
		const refreshPending = vi.spyOn(store, 'refreshPending').mockResolvedValue({ status: 'completed' });
		const wrapper = await mountPage();

		await wrapper.get('[data-testid="refresh-pending"]').trigger('click');

		expect(refreshPending).toHaveBeenCalledTimes(1);
		wrapper.unmount();
	});

	it('keeps the table usable and presents option-load failure', async () => {
		vi.spyOn(useShippingMethodStore(), 'fetchActiveShippingMethodOptions').mockRejectedValue(new Error('Options unavailable'));
		const wrapper = await mountPage();
		await flushPromises();

		expect(wrapper.find('[data-testid="pending-empty"]').exists()).toBe(true);
		expect(useAppUiStore().toastNotification).toMatchObject({ color: 'error', description: 'Options unavailable' });
		wrapper.unmount();
	});

	it('previews a selected workbook and opens the preview', async () => {
		const store = useShipmentArrangementStore();
		const previewWorkbook = vi.spyOn(store, 'previewWorkbook').mockResolvedValue({
			status: 'completed',
			preview: { total: 0, valid: 0, warnings: 0, errors: 0, rows: [] },
		});
		const wrapper = await mountPage();
		const file = new File(['xlsx'], 'shipments.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
		const input = wrapper.get('input[type="file"]');
		Object.defineProperty(input.element, 'files', { value: [file], configurable: true });

		await input.trigger('change');

		expect(previewWorkbook).toHaveBeenCalledWith(file);
		expect(wrapper.findComponent({ name: 'ShipmentArrangementImportPreviewModal' }).props('modelValue')).toBe(true);
		wrapper.unmount();
	});

	it('presents workbook and export failures', async () => {
		mockPendingResponse([pendingRow]);
		const store = useShipmentArrangementStore();
		vi.spyOn(store, 'previewWorkbook').mockResolvedValue({
			status: 'failed',
			failure: { kind: 'request_failed', message: 'Workbook parsing failed' },
		});
		const exportPending = vi.spyOn(store, 'exportPending')
			.mockResolvedValueOnce({ status: 'completed' })
			.mockResolvedValueOnce({ status: 'failed', failure: { kind: 'request_failed', message: 'Export blocked' } });
		const wrapper = await mountPage();
		const file = new File(['numbers'], 'shipments.numbers', { type: 'application/vnd.apple.numbers' });
		const input = wrapper.get('input[type="file"]');
		Object.defineProperty(input.element, 'files', { value: [file], configurable: true });

		await input.trigger('change');
		expect(useAppUiStore().toastNotification).toMatchObject({ color: 'error', description: 'Workbook parsing failed' });
		await wrapper.get('[data-testid="workflow-export"]').trigger('click');
		expect(useAppUiStore().toastNotification).toMatchObject({ color: 'success', description: 'Pending shipment batches exported' });
		await wrapper.get('[data-testid="workflow-export"]').trigger('click');
		expect(useAppUiStore().toastNotification).toMatchObject({ color: 'error', description: 'Export blocked' });
		expect(exportPending).toHaveBeenCalledTimes(2);
		wrapper.unmount();
	});

	it('applies the preview and presents partial counts', async () => {
		const store = useShipmentArrangementStore();
		const applyPreview = vi.spyOn(store, 'applyPreview').mockResolvedValue({
			status: 'completed',
			result: {
				total: 2,
				updated: 1,
				failed: 1,
				errors: [{ fulfillment_id: 'f-2', order_no: 'WM-102', batch_no: 2, message: 'Shipment changed after export' }],
			},
		});
		const wrapper = await mountPage();

		wrapper.findComponent({ name: 'ShipmentArrangementImportPreviewModal' }).vm.$emit('apply');
		await flushPromises();

		expect(applyPreview).toHaveBeenCalledTimes(1);
		expect(useAppUiStore().toastNotification).toMatchObject({ color: 'error', description: '1 shipments updated; 1 failed' });
		wrapper.unmount();
	});

	it('disposes the workflow when leaving the page', async () => {
		const store = useShipmentArrangementStore();
		const dispose = vi.spyOn(store, 'dispose');
		const wrapper = await mountPage();

		wrapper.unmount();

		expect(dispose).toHaveBeenCalledTimes(1);
	});
});
