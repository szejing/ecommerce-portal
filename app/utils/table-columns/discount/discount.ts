import { UBadge, USwitch } from '#components';
import { AllocationType, DiscountType } from 'yeppi-common';
import { formatDiscountDiscValue, getDiscountTypeBadgeColor } from '~/utils/discount-rule-display';
import type { TableColumn } from '@nuxt/ui';
import type { Discount } from '~/utils/types/discount';
import { getSortableHeader, headerCell, tableCellMeta } from '../styles';
import { useDiscountStore } from '~/stores/discount/discount';

type TranslateFn = (key: string) => string;

const DISC_TYPE_I18N: Record<DiscountType, string> = {
	[DiscountType.PERCENTAGE]: 'components.discountForm.discTypeOptionPercentage',
	[DiscountType.FIXED]: 'components.discountForm.discTypeOptionFixed',
	[DiscountType.FREE_SHIPPING]: 'components.discountForm.discTypeOptionFreeShipping',
};

const ALLOCATION_I18N: Record<AllocationType, string> = {
	[AllocationType.BILL]: 'components.discountForm.allocationBill',
	[AllocationType.ITEM]: 'components.discountForm.allocationItem',
};

export const getDiscountColumns = (t: TranslateFn): TableColumn<Discount>[] => {
	return [
		{
			accessorKey: 'code',
			header: ({ column }) => getSortableHeader(column, t('table.code')),
			cell: ({ row }) => {
				const desc = row.original.description?.trim();
				return h('div', { class: 'flex flex-col gap-1' }, [
					h('p', { class: 'font-semibold text-highlighted' }, row.original.code),
					h('p', { class: 'text-sm text-muted' }, desc || '—'),
				]);
			},
		},
		{
			accessorKey: 'disc_type',
			header: () => headerCell(t('table.rule')),
			cell: ({ row }) => {
				const rt = row.original.disc_type;
				const labelKey = DISC_TYPE_I18N[rt];
				const color = getDiscountTypeBadgeColor(rt);
				const children: ReturnType<typeof h>[] = [
					h(UBadge, { variant: 'subtle', color, class: 'capitalize w-fit' }, () => (labelKey ? t(labelKey) : String(rt))),
				];
				if (rt !== DiscountType.FREE_SHIPPING) {
					children.push(h('span', { class: 'text-sm font-semibold tabular-nums text-default' }, formatDiscountDiscValue(rt, row.original.disc_value)));
				}
				return h('div', { class: 'flex flex-col gap-1 items-start' }, children);
			},
		},
		{
			accessorKey: 'allocation',
			header: () => headerCell(t('table.allocation')),
			cell: ({ row }) => {
				const labelKey = row.original.allocation ? ALLOCATION_I18N[row.original.allocation] : undefined;
				return h(UBadge, { variant: 'subtle', color: 'neutral', class: 'w-fit' }, () =>
					labelKey ? t(labelKey) : t('common.notSet'),
				);
			},
		},
		{
			accessorKey: 'usage_count',
			header: () => headerCell(t('table.usage'), 'right'),
			cell: ({ row }) => {
				const limit = row.original.usage_limit;
				const count = row.original.usage_count || 0;
				if (limit) {
					return h('span', { class: 'text-sm text-default tabular-nums' }, `${count} / ${limit}`);
				}
				return h('span', { class: 'text-sm text-default tabular-nums' }, `${count}  (∞)`);
			},
			...tableCellMeta.rightNumeric,
		},
		{
			accessorKey: 'is_disabled',
			header: () => headerCell(t('table.active')),
			cell: ({ row }) => {
				const discountStore = useNuxtApp().$pinia ? useDiscountStore() : null;
				const isActive = !row.original.is_disabled;
				return h(USwitch, {
					'class': 'size-5 mx-auto',
					'modelValue': isActive,
					'onUpdate:modelValue': (value: unknown) => {
						if (discountStore) {
							discountStore.updateStatus(row.original, Boolean(value));
						}
					},
				});
			},
		},
	];
};
