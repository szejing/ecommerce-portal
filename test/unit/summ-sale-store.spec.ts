import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { OrderStatus } from 'yeppi-common';
import { useSummSaleStore } from '../../app/stores/SummSale/SummSale';

const { successNotification, failedNotification } = vi.hoisted(() => ({
	successNotification: vi.fn(),
	failedNotification: vi.fn(),
}));

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	successNotification,
	failedNotification,
}));

const getSummSales = vi.fn();
const exportSalesSummary = vi.fn();
const createObjectURL = vi.fn(() => 'blob:summ-sales');
const revokeObjectURL = vi.fn();
const click = vi.fn();

describe('useSummSaleStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		getSummSales.mockReset();
		exportSalesSummary.mockReset();
		successNotification.mockClear();
		failedNotification.mockClear();
		createObjectURL.mockClear();
		revokeObjectURL.mockClear();
		click.mockClear();
		getSummSales.mockResolvedValue({ 'data': [{ biz_date: '2026-07-01' }], '@odata.count': 1 });
		exportSalesSummary.mockResolvedValue(new Blob(['csv']));
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({
			$api: { summSales: { getSummSales, exportSalesSummary } },
		});
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
		(globalThis as unknown as { document: unknown }).document = {
			createElement: () => ({ href: '', download: '', click }),
			body: { appendChild: vi.fn(), removeChild: vi.fn() },
		};
	});

	it('hydrates from query and keeps OData construction inside refreshListing', async () => {
		const store = useSummSaleStore();
		store.hydrateFromQuery({ start_date: '2026-07-01', end_date: '2026-07-18', status: OrderStatus.COMPLETED });
		await store.refreshListing();
		expect(store.filters.status).toBe(OrderStatus.COMPLETED);
		expect(getSummSales.mock.calls[0]?.[0].$filter).toContain(`status eq '${OrderStatus.COMPLETED}'`);
		expect(getSummSales.mock.calls[0]?.[0].$filter).toContain('biz_date between');
		expect(failedNotification).not.toHaveBeenCalled();
	});

	it('uses applied filters without report pagination when exporting matching rows', async () => {
		const store = useSummSaleStore();
		store.hydrateFromQuery({ status: OrderStatus.COMPLETED });
		store.sale_summ.current_page = 3;
		store.sale_summ.page_size = 15;

		expect(await store.exportSummary('matching')).toEqual({ status: 'completed' });
		const query = exportSalesSummary.mock.calls[0]?.[0];
		expect(query.$filter).toContain(`status eq '${OrderStatus.COMPLETED}'`);
		expect(query).not.toHaveProperty('$top');
		expect(query).not.toHaveProperty('$skip');

		await store.exportSummary();
		expect(exportSalesSummary).toHaveBeenLastCalledWith(expect.objectContaining({ $top: 15, $skip: 30 }));
	});

	it('exports through outcomes and always revokes the object URL', async () => {
		const store = useSummSaleStore();
		const outcome = await store.exportSummary();
		expect(outcome).toEqual({ status: 'completed' });
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:summ-sales');
		expect(successNotification).not.toHaveBeenCalled();
	});
});
