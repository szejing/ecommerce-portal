import type { OrderDiscountModel } from '~/utils/models/order-discount.model';

export function visibleOrderHeaderDiscounts(
	discounts: OrderDiscountModel[] | null | undefined,
): OrderDiscountModel[] {
	return (discounts ?? []).filter((discount) => {
		const amount = Number(discount.disc_amt ?? 0);
		return Number.isFinite(amount) && amount !== 0;
	});
}
