import { OrderItemStatus } from 'yeppi-common';

type WorkbenchItem = {
	status: OrderItemStatus;
	qty: number;
};

export function getOrderItemWorkload<T extends WorkbenchItem>(items: readonly T[]) {
	const activeItems: T[] = [];
	const excludedItems: T[] = [];
	let activeUnitCount = 0;

	for (const item of items) {
		if (item.status === OrderItemStatus.ACTIVE) {
			activeItems.push(item);
			activeUnitCount += Number.isFinite(item.qty) ? Math.max(0, item.qty) : 0;
		} else {
			excludedItems.push(item);
		}
	}

	return {
		activeItems,
		excludedItems,
		activeLineCount: activeItems.length,
		activeUnitCount,
		excludedLineCount: excludedItems.length,
	};
}
