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
					th: 'text-left min-w-0',
					td: 'text-left min-w-0 whitespace-normal',
				},
			},
		},
		{
			id: 'unitSellPrice',
			accessorKey: 'unit_sell_price',
			header: t('components.orderDetail.unitPrice'),
			meta: {
				class: {
					th: `${TABLE_ALIGN_RIGHT} w-28`,
					td: `${TABLE_ALIGN_RIGHT} w-28 whitespace-nowrap`,
				},
			},
		},
		{
			accessorKey: 'qty',
			header: t('components.orderDetail.qty'),
			meta: {
				class: {
					th: `${TABLE_ALIGN_RIGHT} w-16`,
					td: `${TABLE_ALIGN_RIGHT} w-16 whitespace-nowrap`,
				},
			},
		},
		{
			id: 'lineTotal',
			accessorKey: 'net_amt',
			header: t('components.orderDetail.price'),
			meta: {
				class: {
					th: `${TABLE_ALIGN_RIGHT} w-28`,
					td: `${TABLE_ALIGN_RIGHT} w-28 whitespace-nowrap`,
				},
			},
		},
	];
}
