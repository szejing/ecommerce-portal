import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { OrderResendEmailAction, OrderStatus } from 'yeppi-common';
import { ORDER_HISTORY_FILTER_DEBOUNCE_MS, useOrderStore } from '../../app/stores/Order/Order';
import { ORDERS_SELECTED_STATUSES_STORAGE_KEY } from '../../app/utils/orders-selected-statuses-storage';
import type { OrderHistory } from '../../app/utils/types/order-history';

const { successNotification, failedNotification } = vi.hoisted(() => ({
	successNotification: vi.fn(),
	failedNotification: vi.fn(),
}));

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	successNotification,
	failedNotification,
}));

const getOrders = vi.fn();
const exportOrders = vi.fn();
const getOrderByOrderNo = vi.fn();
const updateStatus = vi.fn();
const updatePayments = vi.fn();
const updateCustomer = vi.fn();
const updateItems = vi.fn();
const resendOrderEmail = vi.fn();
const getBillDetailsByOrderNo = vi.fn();
const updateSaleStatus = vi.fn();
const resendSaleEmail = vi.fn();
const createObjectURL = vi.fn(() => 'blob:orders');
const revokeObjectURL = vi.fn();
const click = vi.fn();

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

const order = (orderNo: string): OrderHistory =>
	({
		order_no: orderNo,
		customer: { customer_no: 'C1' },
		status: OrderStatus.PROCESSING,
		type: 'order',
	}) as OrderHistory;

describe('useOrderStore', () => {
	afterEach(() => vi.useRealTimers());

	beforeEach(() => {
		setActivePinia(createPinia());
		const memory = new Map<string, string>();
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => memory.get(key) ?? null,
			setItem: (key: string, value: string) => memory.set(key, value),
			removeItem: (key: string) => memory.delete(key),
			clear: () => memory.clear(),
		});
		getOrders.mockReset();
		exportOrders.mockReset();
		getOrderByOrderNo.mockReset();
		updateStatus.mockReset();
		updatePayments.mockReset();
		updateCustomer.mockReset();
		updateItems.mockReset();
		resendOrderEmail.mockReset();
		getBillDetailsByOrderNo.mockReset();
		updateSaleStatus.mockReset();
		resendSaleEmail.mockReset();
		createObjectURL.mockClear();
		revokeObjectURL.mockClear();
		click.mockClear();
		successNotification.mockClear();
		failedNotification.mockClear();
		getOrders.mockResolvedValue({ data: [order('WM-100')], '@odata.count': 1 });
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({
			$api: {
				order: {
					getOrders,
					exportOrders,
					getOrderByOrderNo,
					updateStatus,
					updatePayments,
					updateCustomer,
					updateItems,
					resendCurrentStatusEmail: resendOrderEmail,
				},
				sale: {
					getBillDetailsByOrderNo,
					updateStatus: updateSaleStatus,
					resendCurrentStatusEmail: resendSaleEmail,
				},
			},
		});
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
		(globalThis as unknown as { document: unknown }).document = {
			createElement: () => ({ href: '', download: '', click }),
		};
	});

	it('debounces search intent for 500 ms and refreshes page one once', async () => {
		vi.useFakeTimers();
		const store = useOrderStore();
		await store.setPage(3);
		getOrders.mockClear();
		store.setSearch(' WM-100 ');
		await vi.advanceTimersByTimeAsync(ORDER_HISTORY_FILTER_DEBOUNCE_MS - 1);
		expect(getOrders).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		await vi.runAllTicks();
		expect(store.page).toBe(1);
		expect(getOrders).toHaveBeenCalledTimes(1);
		expect(getOrders.mock.calls[0]?.[0].$search).toBe('WM-100');
	});

	it('does not treat mutations of returned filter snapshots as workflow intent', async () => {
		vi.useFakeTimers();
		const store = useOrderStore();
		const snapshot = store.filters as { search: string };
		snapshot.search = 'direct mutation';
		store.setStatuses([OrderStatus.PROCESSING]);
		await vi.runAllTicks();
		expect(getOrders.mock.calls.at(-1)?.[0].$filter).toContain(`status eq '${OrderStatus.PROCESSING}'`);
		expect(store.filters.search).toBe('');
	});

	it('lets URL status win over stored statuses and persists the result', async () => {
		localStorage.setItem(ORDERS_SELECTED_STATUSES_STORAGE_KEY, JSON.stringify([OrderStatus.CANCELLED]));
		const store = useOrderStore();
		store.hydrateFromQuery({ status: OrderStatus.PROCESSING, start_date: '2026-07-01', end_date: '2026-07-18' });
		await store.refreshListing();
		expect(store.filters.statuses).toEqual([OrderStatus.PROCESSING]);
		expect(JSON.parse(localStorage.getItem(ORDERS_SELECTED_STATUSES_STORAGE_KEY) ?? '[]')).toEqual([OrderStatus.PROCESSING]);
		expect(getOrders.mock.calls[0]?.[0].$filter).toContain(`status eq '${OrderStatus.PROCESSING}'`);
		expect(getOrders.mock.calls[0]?.[0].$filter).toContain('biz_date between');
	});

	it('does not let an older listing request replace rows', async () => {
		const first = deferred<{ data: OrderHistory[]; '@odata.count': number }>();
		const second = deferred<{ data: OrderHistory[]; '@odata.count': number }>();
		getOrders.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		const store = useOrderStore();
		const oldRequest = store.refreshListing();
		const newRequest = store.setPage(2);
		second.resolve({ data: [order('WM-101')], '@odata.count': 2 });
		await newRequest;
		first.resolve({ data: [order('WM-100')], '@odata.count': 1 });
		expect(await oldRequest).toEqual({ status: 'stale' });
		expect(store.orders.map((row) => row.order_no)).toEqual(['WM-101']);
	});

	it('loadDashboard writes a separate snapshot and does not clobber listing rows', async () => {
		const store = useOrderStore();
		await store.refreshListing();
		getOrders.mockResolvedValueOnce({ data: [order('DASH-1')], '@odata.count': 1 });
		await store.loadDashboard({
			range: { start: new Date('2026-07-01'), end: new Date('2026-07-18') },
			hideCompleted: true,
		});
		expect(store.orders.map((row) => row.order_no)).toEqual(['WM-100']);
		expect(store.dashboardOrders.map((row) => row.order_no)).toEqual(['DASH-1']);
		expect(getOrders.mock.calls.at(-1)?.[0].$filter).toContain(`status ne '${OrderStatus.COMPLETED}'`);
		expect(failedNotification).not.toHaveBeenCalled();
	});

	it('exports through outcomes and always revokes the object URL', async () => {
		exportOrders.mockResolvedValue(new Blob(['csv']));
		const store = useOrderStore();
		const outcome = await store.exportOrders({
			date_range: { start: new Date('2026-07-01'), end: new Date('2026-07-18') },
			statuses: [],
			sort: 'biz_date_desc',
			include_item_details: false,
		});
		expect(outcome).toEqual({ status: 'completed' });
		expect(createObjectURL).toHaveBeenCalled();
		expect(click).toHaveBeenCalledTimes(1);
		expect(revokeObjectURL).toHaveBeenCalledWith('blob:orders');
		expect(successNotification).not.toHaveBeenCalled();
	});

	it('opens order vs sale through the matching adapter', async () => {
		getOrderByOrderNo.mockResolvedValue({ order: order('WM-100') });
		getBillDetailsByOrderNo.mockResolvedValue({ bill: { ...order('WM-200'), type: 'sale' } });
		const store = useOrderStore();
		await store.open('WM-100', 'order');
		expect(getOrderByOrderNo).toHaveBeenCalledWith('WM-100');
		expect(store.current?.order_no).toBe('WM-100');
		await store.open('WM-200', 'sale');
		expect(getBillDetailsByOrderNo).toHaveBeenCalledWith('WM-200');
		expect(store.owner).toBe('sale');
		expect(store.current?.order_no).toBe('WM-200');
	});

	it('resends through the session owner adapter and returns outcomes', async () => {
		getBillDetailsByOrderNo.mockResolvedValue({ bill: order('WM-200') });
		resendSaleEmail.mockResolvedValue({ status: true });
		const store = useOrderStore();
		await store.open('WM-200', 'sale');
		expect(await store.resendCurrentStatusEmail(OrderResendEmailAction.SHIPPED)).toEqual({ status: 'completed' });
		expect(resendSaleEmail).toHaveBeenCalledWith('WM-200', OrderResendEmailAction.SHIPPED);
		expect(resendOrderEmail).not.toHaveBeenCalled();
		expect(successNotification).not.toHaveBeenCalled();
	});

	it('rejects refresh during cooldown', async () => {
		vi.useFakeTimers();
		getOrderByOrderNo.mockResolvedValue({ order: order('WM-100') });
		const store = useOrderStore();
		await store.open('WM-100', 'order');
		expect(await store.refreshCurrent()).toEqual({ status: 'completed' });
		expect(store.refreshCooldown).toBe(5);
		expect(await store.refreshCurrent()).toEqual({ status: 'rejected', failure: { kind: 'cooldown' } });
		expect(getOrderByOrderNo).toHaveBeenCalledTimes(2);
	});

	it('updates status in place without toggling session loading', async () => {
		getOrderByOrderNo.mockResolvedValue({ order: order('WM-100') });
		const store = useOrderStore();
		await store.open('WM-100', 'order');
		expect(store.sessionLoading).toBe(false);

		updateStatus.mockResolvedValue({ status: true });
		const refetch = deferred<{ order: OrderHistory }>();
		getOrderByOrderNo.mockReturnValueOnce(refetch.promise);

		const pending = store.updateStatus(OrderStatus.SHIPPED);
		await Promise.resolve();
		expect(updateStatus).toHaveBeenCalledWith('WM-100', 'C1', OrderStatus.SHIPPED);
		expect(store.updating).toBe(true);
		expect(store.sessionLoading).toBe(false);
		expect(store.current?.status).toBe(OrderStatus.SHIPPED);
		expect(store.current?.order_no).toBe('WM-100');

		refetch.resolve({
			order: { ...order('WM-100'), status: OrderStatus.SHIPPED, last_updated: '2026-09-02 23:00:00' } as OrderHistory,
		});
		await pending;

		expect(store.updating).toBe(false);
		expect(store.sessionLoading).toBe(false);
		expect(store.current?.status).toBe(OrderStatus.SHIPPED);
		expect(store.current?.last_updated).toBe('2026-09-02 23:00:00');
		expect(getOrderByOrderNo).toHaveBeenCalledTimes(2);
	});

	it('keeps the current order when a silent status reload fails', async () => {
		getOrderByOrderNo.mockResolvedValue({ order: order('WM-100') });
		const store = useOrderStore();
		await store.open('WM-100', 'order');

		updateStatus.mockResolvedValue({ status: true });
		getOrderByOrderNo.mockRejectedValueOnce(new Error('network down'));

		const outcome = await store.updateStatus(OrderStatus.SHIPPED);

		expect(outcome).toEqual({ status: 'completed', stayOnPage: true });
		expect(store.notFound).toBe(false);
		expect(store.sessionLoading).toBe(false);
		expect(store.current?.order_no).toBe('WM-100');
		expect(store.current?.status).toBe(OrderStatus.SHIPPED);
	});

	it('does not refetch after completing an order', async () => {
		getOrderByOrderNo.mockResolvedValue({ order: order('WM-100') });
		updateStatus.mockResolvedValue({ status: true });
		const store = useOrderStore();
		await store.open('WM-100', 'order');
		getOrderByOrderNo.mockClear();

		const outcome = await store.updateStatus(OrderStatus.COMPLETED);

		expect(outcome).toEqual({ status: 'completed', stayOnPage: false });
		expect(getOrderByOrderNo).not.toHaveBeenCalled();
		expect(store.current?.status).toBe(OrderStatus.PROCESSING);
	});
});
