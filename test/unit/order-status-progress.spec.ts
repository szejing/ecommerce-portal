import { describe, expect, it } from 'vitest';
import { OrderStatus, OrderType } from 'yeppi-common';
import { canCompleteOrderStatus, getNextOrderStatus, getOrderStatusProgressPath } from '~/utils/options/order-status';

describe('order status progress', () => {
	it('uses pickup steps by default and skips courier statuses', () => {
		expect(getOrderStatusProgressPath(OrderType.PICKUP)).toEqual([
			OrderStatus.PENDING_PAYMENT,
			OrderStatus.CONFIRMED,
			OrderStatus.PAID,
			OrderStatus.PROCESSING,
			OrderStatus.READY_FOR_PICKUP,
			OrderStatus.COMPLETED,
		]);
		expect(getNextOrderStatus(OrderStatus.PROCESSING, OrderType.PICKUP)).toBe(OrderStatus.READY_FOR_PICKUP);
		expect(getNextOrderStatus(OrderStatus.READY_FOR_PICKUP, OrderType.PICKUP)).toBe(OrderStatus.COMPLETED);
	});

	it('uses delivery steps and skips ready for pickup', () => {
		expect(getNextOrderStatus(OrderStatus.PROCESSING, OrderType.DELIVERY)).toBe(OrderStatus.SHIPPED);
		expect(getNextOrderStatus(OrderStatus.SHIPPED, OrderType.DELIVERY)).toBe(OrderStatus.DELIVERED);
		expect(getNextOrderStatus(OrderStatus.DELIVERED, OrderType.DELIVERY)).toBe(OrderStatus.COMPLETED);
	});

	it('has no next status for terminal or off-path values', () => {
		expect(getNextOrderStatus(OrderStatus.COMPLETED, OrderType.DELIVERY)).toBeUndefined();
		expect(getNextOrderStatus(OrderStatus.CANCELLED, OrderType.PICKUP)).toBeUndefined();
		expect(getNextOrderStatus(OrderStatus.REQUIRES_ACTION, OrderType.PICKUP)).toBeUndefined();
	});

	it('allows complete except for completed, cancelled, and refunded', () => {
		expect(canCompleteOrderStatus(OrderStatus.PROCESSING)).toBe(true);
		expect(canCompleteOrderStatus(OrderStatus.COMPLETED)).toBe(false);
		expect(canCompleteOrderStatus(OrderStatus.CANCELLED)).toBe(false);
		expect(canCompleteOrderStatus(OrderStatus.REFUNDED)).toBe(false);
		expect(canCompleteOrderStatus(undefined)).toBe(false);
	});
});
