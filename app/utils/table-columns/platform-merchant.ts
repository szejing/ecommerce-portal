import type { TableColumn } from '@nuxt/ui';
import { AccountStatus, Package } from 'yeppi-common';
import { UBadge, UButton } from '#components';
import type { PlatformMerchantRow } from '~/repository/modules/platform-merchant/models/response/platform-merchant.resp';
import { accountTypeLabel } from '~/utils/options/account-type';
import { headerCell, mutedCell, primaryCell } from './styles';

type TranslateFn = (key: string) => string;
type BadgeColor = 'primary' | 'error' | 'success' | 'warning' | 'secondary' | 'info' | 'neutral';

type PlatformMerchantColumnOptions = {
	onCopy?: (value: string, label: string) => void;
};

function copyCell(
	value: string | null | undefined,
	label: string,
	copyLabel: string,
	onCopy?: (value: string, label: string) => void,
) {
	if (!value) {
		return mutedCell('—');
	}

	const children = [h('span', { class: 'font-mono text-xs truncate', title: value }, value)];

	if (onCopy) {
		children.push(
			h(
				UButton,
				{
					size: 'xs',
					color: 'neutral',
					variant: 'ghost',
					onClick: (e: Event) => {
						e.stopPropagation();
						onCopy(value, label);
					},
				},
				() => copyLabel,
			),
		);
	}

	return h('div', { class: 'flex items-center gap-1 min-w-0' }, children);
}

function packageBadgeColor(value: Package | string | null | undefined): BadgeColor {
	switch (value) {
		case Package.EVENTS:
			return 'primary';
		case Package.FULL:
			return 'success';
		case Package.ECOMMERCE:
		default:
			return 'neutral';
	}
}

function accountBadgeColor(value: AccountStatus | string | null | undefined): BadgeColor {
	switch (value) {
		case AccountStatus.NEW:
			return 'info';
		case AccountStatus.ACTIVE:
			return 'success';
		case AccountStatus.INACTIVE:
			return 'neutral';
		case AccountStatus.EXPIRED:
			return 'error';
		default:
			return 'neutral';
	}
}

function accountStatusLabel(t: TranslateFn, value: AccountStatus | string | null | undefined): string {
	switch (value) {
		case AccountStatus.NEW:
			return t('options.new');
		case AccountStatus.ACTIVE:
			return t('options.active');
		case AccountStatus.INACTIVE:
			return t('options.inactive');
		case AccountStatus.EXPIRED:
			return t('options.expired');
		default:
			return value ? String(value) : '—';
	}
}

function statusBadge(label: string, color: BadgeColor) {
	return h(
		UBadge,
		{
			color,
			variant: 'subtle',
			class: 'capitalize whitespace-nowrap',
		},
		() => label,
	);
}

export function getPlatformMerchantColumns(
	t: TranslateFn,
	options?: PlatformMerchantColumnOptions,
): TableColumn<PlatformMerchantRow>[] {
	const onCopy = options?.onCopy;
	const copyLabel = t('platformMerchants.copy');

	return [
		{
			accessorKey: 'merchant_id',
			header: () => headerCell(t('platformMerchants.merchantId')),
			cell: ({ row }) => copyCell(row.original.merchant_id, t('platformMerchants.merchantId'), copyLabel, onCopy),
		},
		{
			accessorKey: 'name',
			header: () => headerCell(t('form.name')),
			cell: ({ row }) => primaryCell(row.original.name),
		},
		{
			accessorKey: 'store_handle',
			header: () => headerCell(t('platformMerchants.handle')),
			cell: ({ row }) => copyCell(row.original.store_handle, t('platformMerchants.handle'), copyLabel, onCopy),
		},
		{
			accessorKey: 'package',
			header: () => headerCell(t('platformMerchants.package')),
			cell: ({ row }) => {
				const value = row.original.package;
				const label = accountTypeLabel(value as Package, t) || String(value || '—');
				return statusBadge(label, packageBadgeColor(value));
			},
		},
		{
			accessorKey: 'account',
			header: () => headerCell(t('platformMerchants.account')),
			cell: ({ row }) => {
				const value = row.original.account;
				return statusBadge(accountStatusLabel(t, value), accountBadgeColor(value));
			},
		},
		{
			accessorKey: 'hide_store',
			header: () => headerCell(t('platformMerchants.hiddenStore')),
			cell: ({ row }) =>
				statusBadge(
					row.original.hide_store ? t('platformMerchants.yes') : t('platformMerchants.no'),
					row.original.hide_store ? 'warning' : 'success',
				),
		},
		{
			accessorKey: 'company_email',
			header: () => headerCell(t('platformMerchants.companyEmail')),
			cell: ({ row }) => primaryCell(row.original.company_email || '—'),
		},
	];
}
