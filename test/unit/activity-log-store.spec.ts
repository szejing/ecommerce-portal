import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ACTIVITY_LOG_FILTER_DEBOUNCE_MS, useActivityLogStore } from '../../app/stores/ActivityLog/ActivityLog';
import type { ActivityLog } from '../../app/utils/types/activity-log';

const { failedNotification } = vi.hoisted(() => ({
	failedNotification: vi.fn(),
}));

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	failedNotification,
	successNotification: vi.fn(),
}));

const getMany = vi.fn();

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

describe('useActivityLogStore', () => {
	afterEach(() => vi.useRealTimers());

	beforeEach(() => {
		setActivePinia(createPinia());
		getMany.mockReset();
		failedNotification.mockClear();
		getMany.mockResolvedValue({ data: [{ id: 1 } as ActivityLog], '@odata.count': 1 });
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({
			$api: { activityLog: { getMany } },
		});
	});

	it('debounces search intent and keeps OData filter building inside the store', async () => {
		vi.useFakeTimers();
		const store = useActivityLogStore();
		store.setSearch('  #1707  ');
		await vi.advanceTimersByTimeAsync(ACTIVITY_LOG_FILTER_DEBOUNCE_MS - 1);
		expect(getMany).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		await vi.runAllTicks();
		expect(getMany).toHaveBeenCalledTimes(1);
		expect(getMany.mock.calls[0]?.[0].$search).toBe('1707');
		expect(getMany.mock.calls[0]?.[0].$filter).toContain('created_at between');
		expect(failedNotification).not.toHaveBeenCalled();
	});

	it('does not treat mutations of returned filter snapshots as workflow intent', async () => {
		const store = useActivityLogStore();
		const snapshot = store.filters as { query: string };
		snapshot.query = 'direct mutation';
		await store.setAction('created');
		expect(store.filters.query).toBe('');
		expect(getMany.mock.calls.at(-1)?.[0].$filter).toContain("action eq 'created'");
	});

	it('does not let an older listing request replace rows', async () => {
		const first = deferred<{ data: ActivityLog[]; '@odata.count': number }>();
		const second = deferred<{ data: ActivityLog[]; '@odata.count': number }>();
		getMany.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
		const store = useActivityLogStore();
		const oldRequest = store.refreshListing();
		const newRequest = store.setPage(2);
		second.resolve({ data: [{ id: 2 } as ActivityLog], '@odata.count': 2 });
		await newRequest;
		first.resolve({ data: [{ id: 1 } as ActivityLog], '@odata.count': 1 });
		expect(await oldRequest).toEqual({ status: 'stale' });
		expect(store.activity_logs.map((row) => row.id)).toEqual([2]);
	});
});
