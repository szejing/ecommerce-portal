import { describe, expect, it } from 'vitest';
import { OrderItemStatus } from 'yeppi-common';
import { getOrderItemWorkload } from '../../app/utils/order-workbench';

describe('getOrderItemWorkload', () => {
	it('counts only active lines and units as the fulfillment workload', () => {
		const workload = getOrderItemWorkload([
			{ status: OrderItemStatus.ACTIVE, qty: 2 },
			{ status: OrderItemStatus.VOIDED, qty: 7 },
			{ status: OrderItemStatus.ACTIVE, qty: 3 },
		]);

		expect(workload.activeLineCount).toBe(2);
		expect(workload.activeUnitCount).toBe(5);
		expect(workload.excludedLineCount).toBe(1);
		expect(workload.activeItems.map((item) => item.qty)).toEqual([2, 3]);
		expect(workload.excludedItems.map((item) => item.qty)).toEqual([7]);
	});

	it('normalizes invalid or negative quantities out of the unit count', () => {
		const workload = getOrderItemWorkload([
			{ status: OrderItemStatus.ACTIVE, qty: Number.NaN },
			{ status: OrderItemStatus.ACTIVE, qty: -2 },
			{ status: OrderItemStatus.ACTIVE, qty: 1.5 },
		]);

		expect(workload.activeLineCount).toBe(3);
		expect(workload.activeUnitCount).toBe(1.5);
	});
});
