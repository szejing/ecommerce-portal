import { Package } from 'yeppi-common';

type TranslateFn = (key: string) => string;

const accountTypeLabels: Record<string, string> = {
	[Package.SELLER]: 'options.accountType.seller',
	[Package.ORGANIZER]: 'options.accountType.organizer',
	[Package.VIP]: 'options.accountType.vip',
};

export const accountTypeLabel = (accountType: Package, t: TranslateFn): string => {
	const key = accountTypeLabels[accountType];
	return key ? t(key) : String(accountType);
};
