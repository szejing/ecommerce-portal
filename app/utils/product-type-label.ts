import { ProductType } from 'yeppi-common';
import { ICONS } from '~/utils/icons';

/** CRM listing label for a catalog product type value. */
export function productTypeFilterLabel(value: string, t: (key: string) => string): string {
	const kind = value.toLowerCase();
	if (kind === ProductType.ITEM) return t('components.filter.productTypeProducts');
	if (kind === ProductType.SERVICE) return t('components.filter.productTypeServices');
	if (kind === ProductType.EVENT) return t('components.filter.productTypeEvent');
	return value;
}

/** Leading icon for CRM product-type filter tabs. */
export function productTypeFilterIcon(value: string): string {
	const kind = value.toLowerCase();
	if (kind === ProductType.ITEM) return ICONS.CUBE;
	if (kind === ProductType.SERVICE) return 'i-heroicons-wrench-screwdriver';
	if (kind === ProductType.EVENT) return ICONS.CALENDAR;
	return ICONS.TAG;
}
