/* eslint-disable indent */
import type { TableColumn } from '@nuxt/ui';
import type { ComboComponent } from '~/utils/types/product';
import { headerCell } from './styles';

type TranslateFn = (key: string) => string;

export function getComboComponentColumns(t: TranslateFn): TableColumn<ComboComponent>[] {
	return [
		{
			id: 'item',
			accessorKey: 'product_code',
			header: () => headerCell(t('combo.item')),
			meta: {
				class: {
					th: 'text-left',
					td: 'text-left min-w-[10rem]',
				},
			},
		},
		{
			id: 'quantity',
			accessorKey: 'quantity',
			header: () => headerCell(t('combo.quantity')),
			meta: {
				class: {
					th: 'w-36',
					td: 'w-36',
				},
			},
		},
		{
			id: 'unitPrice',
			header: () => headerCell(t('combo.unitPrice')),
			meta: {
				class: {
					th: 'w-28',
					td: 'w-28 tabular-nums',
				},
			},
		},
		{
			id: 'lineTotal',
			header: () => headerCell(t('combo.lineTotal')),
			meta: {
				class: {
					th: 'w-28',
					td: 'w-28 tabular-nums',
				},
			},
		},
		{
			id: 'actions',
			header: () => '',
			meta: {
				class: {
					th: 'w-10',
					td: 'w-10',
				},
			},
		},
	];
}
