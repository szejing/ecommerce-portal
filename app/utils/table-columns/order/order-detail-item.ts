import type { TableColumn } from '@nuxt/ui';
import type { ItemModel } from '~/utils/models/item.model';
import { TABLE_ALIGN_RIGHT } from '../styles';

type TranslateFn = (key: string) => string;

export function getOrderDetailItemColumns(t: TranslateFn): TableColumn<ItemModel>[] {
	return [
		{
			id: 'item',
			accessorKey: 'prod_code',
			header: t('components.orderDetail.item'),
			meta: {
				class: {
					th: 'text-left w-full min-w-0',
					td: 'text-left w-full min-w-0 whitespace-normal break-words',
				},
			},
		},
		{
			id: 'unitSellPrice',
			accessorKey: 'unit_sell_price',
			header: t('components.orderDetail.unitPrice'),
			meta: {
				class: {
					th: `${TABLE_ALIGN_RIGHT} w-24`,
					td: `${TABLE_ALIGN_RIGHT} w-24 whitespace-nowrap`,
				},
			},
		},
		{
			accessorKey: 'qty',
			header: t('components.orderDetail.qty'),
			meta: {
				class: {
					th: `${TABLE_ALIGN_RIGHT} w-14`,
					td: `${TABLE_ALIGN_RIGHT} w-14 whitespace-nowrap`,
				},
			},
		},
		{
			id: 'lineTotal',
			accessorKey: 'net_amt',
			header: t('components.orderDetail.price'),
			meta: {
				class: {
					th: `${TABLE_ALIGN_RIGHT} w-24`,
					td: `${TABLE_ALIGN_RIGHT} w-24 whitespace-nowrap`,
				},
			},
		},
	];
}
