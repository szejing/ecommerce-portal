import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { OrderResendEmailAction } from 'yeppi-common';
import { useOrderStore } from '../../app/stores/Order/Order';
import { useSaleStore } from '../../app/stores/Sale/Sale';
import type { OrderHistory } from '../../app/utils/types/order-history';

const { successNotification, failedNotification } = vi.hoisted(() => ({
	successNotification: vi.fn(),
	failedNotification: vi.fn(),
}));

vi.mock('../../app/stores/AppUi/AppUi', () => ({
	successNotification,
	failedNotification,
}));

describe('order/sale resend email stores', () => {
	const apiMock = {
		order: { getOrderByOrderNo: vi.fn(), resendCurrentStatusEmail: vi.fn() },
		sale: { getBillDetailsByOrderNo: vi.fn(), resendCurrentStatusEmail: vi.fn() },
	};

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		vi.stubGlobal('localStorage', {
			getItem: () => null,
			setItem: () => undefined,
			removeItem: () => undefined,
			clear: () => undefined,
		});
		apiMock.order.getOrderByOrderNo.mockResolvedValue({
			order: { order_no: 'ORD-1', customer: { customer_no: 'C1' } } as OrderHistory,
		});
		apiMock.sale.getBillDetailsByOrderNo.mockResolvedValue({
			bill: { order_no: 'ORD-1', customer: { customer_no: 'C1' } } as OrderHistory,
		});
		apiMock.order.resendCurrentStatusEmail.mockResolvedValue({ status: true });
		apiMock.sale.resendCurrentStatusEmail.mockResolvedValue({ status: true });
		(globalThis as unknown as { useNuxtApp: () => unknown }).useNuxtApp = () => ({ $api: apiMock }) as unknown;
	});

	it('passes the selected action through the order session owner', async () => {
		const store = useOrderStore();
		await store.open('ORD-1', 'order');

		expect(await store.resendCurrentStatusEmail(OrderResendEmailAction.SHIPPED)).toEqual({ status: 'completed' });

		expect(apiMock.order.resendCurrentStatusEmail).toHaveBeenCalledWith('ORD-1', OrderResendEmailAction.SHIPPED);
		expect(store.resendingEmail).toBe(false);
		expect(successNotification).not.toHaveBeenCalled();
	});

	it('passes the selected action through the sale store leftover listing path', async () => {
		const store = useSaleStore();

		await store.resendCurrentStatusEmail('ORD-1', OrderResendEmailAction.SHIPPED);

		expect(apiMock.sale.resendCurrentStatusEmail).toHaveBeenCalledWith('ORD-1', OrderResendEmailAction.SHIPPED);
		expect(store.resending_email).toBe(false);
	});
});
