import { DiscountType, formatCurrency } from 'yeppi-common';

export type DiscountTypeBadgeColor = 'info' | 'primary' | 'success';

const DISC_TYPE_BADGE_COLOR: Record<DiscountType, DiscountTypeBadgeColor> = {
	[DiscountType.PERCENTAGE]: 'info',
	[DiscountType.FIXED]: 'primary',
	[DiscountType.FREE_SHIPPING]: 'success',
};

export function getDiscountTypeBadgeColor(discType: DiscountType | null | undefined): DiscountTypeBadgeColor {
	if (!discType) return 'info';
	return DISC_TYPE_BADGE_COLOR[discType] ?? 'info';
}

export function formatDiscountDiscValue(discType: DiscountType, discValue: number): string {
	if (discType === DiscountType.PERCENTAGE) {
		return `${discValue}%`;
	}
	if (discType === DiscountType.FIXED) {
		return formatCurrency(discValue, 'MYR');
	}
	return String(discValue);
}
