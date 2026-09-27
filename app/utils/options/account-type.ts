import { Package } from 'yeppi-common';

type TranslateFn = (key: string) => string;

const accountTypeLabels: Record<string, string> = {
	[Package.ECOMMERCE]: 'options.accountType.ecommerce',
	[Package.EVENTS]: 'options.accountType.events',
	[Package.FULL]: 'options.accountType.full',
};

export const accountTypeLabel = (accountType: Package, t: TranslateFn): string => {
	const key = accountTypeLabels[accountType];
	return key ? t(key) : String(accountType);
};
