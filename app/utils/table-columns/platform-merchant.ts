import type { TableColumn } from '@nuxt/ui';
import { UBadge, UButton } from '#components';
import type { PlatformMerchantRow } from '~/repository/modules/platform-merchant/models/response/platform-merchant.resp';
import { headerCell, mutedCell, primaryCell } from './styles';

type TranslateFn = (key: string) => string;

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
			cell: ({ row }) => primaryCell(row.original.package),
		},
		{
			accessorKey: 'account',
			header: () => headerCell(t('platformMerchants.account')),
			cell: ({ row }) => primaryCell(row.original.account),
		},
		{
			accessorKey: 'hide_store',
			header: () => headerCell(t('platformMerchants.hiddenStore')),
			cell: ({ row }) =>
				h(
					UBadge,
					{
						color: row.original.hide_store ? 'warning' : 'success',
						variant: 'subtle',
					},
					() => (row.original.hide_store ? t('platformMerchants.yes') : t('platformMerchants.no')),
				),
		},
		{
			accessorKey: 'company_email',
			header: () => headerCell(t('platformMerchants.companyEmail')),
			cell: ({ row }) => primaryCell(row.original.company_email || '—'),
		},
	];
}
