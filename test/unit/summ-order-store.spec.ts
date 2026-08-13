import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { OrderStatus } from 'yeppi-common';
import { useSummOrderStore } from '../../app/stores/SummOrder/SummOrder';

const { successNotification, failedNotification } = vi.hoisted(() => ({
	successNotification: vi.fn(),
	failedNotification: vi.fn(),
}));

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	successNotification,
	failedNotification,
}));

const getSummOrders = vi.fn();
const exportSummOrders = vi.fn();
const createObjectURL = vi.fn(() => 'blob:summ-orders');
const revokeObjectURL = vi.fn();
const click = vi.fn();

describe('useSummOrderStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		getSummOrders.mockReset();
		exportSummOrders.mockReset();
		successNotification.mockClear();
		failedNotification.mockClear();
		createObjectURL.mockClear();
		revokeObjectURL.mockClear();
		click.mockClear();
		getSummOrders.mockResolvedValue({ data: [{ biz_date: '2026-07-01' }], '@odata.count': 1 });
		exportSummOrders.mockResolvedValue(new Blob(['csv']));
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({
			$api: { summOrder: { getSummOrders, exportSummOrders } },
		});
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
		(globalThis as unknown as { document: unknown }).document = {
			createElement: () => ({ href: '', download: '', click }),
			body: { appendChild: vi.fn(), removeChild: vi.fn() },
		};
	});

	it('hydrates from query and keeps OData construction inside refreshListing', async () => {
		const store = useSummOrderStore();
		store.hydrateFromQuery({ start_date: '2026-07-01', end_date: '2026-07-18', status: OrderStatus.PROCESSING });
		await store.refreshListing();
		expect(store.filters.status).toBe(OrderStatus.PROCESSING);
		expect(getSummOrders.mock.calls[0]?.[0].$filter).toContain(`status eq '${OrderStatus.PROCESSING}'`);
		expect(getSummOrders.mock.calls[0]?.[0].$filter).toContain('biz_date between');
		expect(failedNotification).not.toHaveBeenCalled();
	});

	it('does not treat mutations of returned filter snapshots as workflow intent', async () => {
		const store = useSummOrderStore();
		const snapshot = store.filters as { status: OrderStatus | undefined };
		snapshot.status = OrderStatus.CANCELLED;
		await store.setStatus(OrderStatus.PROCESSING);
		expect(store.filters.status).toBe(OrderStatus.PROCESSING);
		expect(getSummOrders.mock.calls.at(-1)?.[0].$filter).toContain(`status eq '${OrderStatus.PROCESSING}'`);
		expect(getSummOrders.mock.calls.at(-1)?.[0].$filter).not.toContain(`status eq '${OrderStatus.CANCELLED}'`);
	});

	it('exports through outcomes and always revokes the object URL', async () => {
		const store = useSummOrderStore();
		const outcome = await store.exportSummary();
		expect(outcome).toEqual({ status: 'completed' });
		expect(createObjectURL).toHaveBeenCalled();
		expect(click).toHaveBeenCalledTimes(1);
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:summ-orders');
		expect(successNotification).not.toHaveBeenCalled();
	});
});
