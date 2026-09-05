import { h } from 'vue';
import type { TableColumn, TableRow } from '@nuxt/ui';
import { getFormattedDate, getShipmentStatusColor } from 'yeppi-common';
import { UBadge } from '#components';
import { headerCell, moneyCell, numberCell, tableCellMeta } from '../styles';
import type { TranslateFn } from './types';
import type { SummSaleShipping, SummSaleShippingDetail } from '~/utils/types/summ-sales';

export const SUMM_SHIPPING_COLUMN_LABELS = {
	biz_date: 'table.bizDate',
	currency_code: 'table.currency',
	net_amt: 'table.netAmt',
	free_shipping_disc_amt: 'table.shippingDiscount',
	shipping_fee: 'table.shippingFeeCollected',
	integrator_charge: 'table.integratorCharge',
	total_txns: 'table.totalTransactions',
	total_qty: 'table.totalItems',
} as const;

export const SUMM_SHIPPING_DETAIL_COLUMN_LABELS = {
	biz_date: 'table.bizDate',
	order_no: 'table.orderNo',
	inv_no: 'table.invoiceNo',
	shipment_status: 'table.shipmentStatus',
	net_amt: 'table.netAmt',
	free_shipping_disc_amt: 'table.shippingDiscount',
	shipping_fee: 'table.shippingFeeCollected',
	integrator_charge: 'table.integratorCharge',
	total_qty: 'table.totalItems',
} as const;

type MoneyKey = 'net_amt' | 'free_shipping_disc_amt' | 'shipping_fee' | 'integrator_charge';
type CountKey = 'total_txns' | 'total_qty';

const moneyFooter = <T extends { currency_code: string } & Record<MoneyKey, number>>(
	column: { getFacetedRowModel: () => { rows: TableRow<T>[] } },
	key: MoneyKey,
) => {
	const rows = column.getFacetedRowModel().rows;
	const total = rows.reduce((acc, row) => acc + Number(row.original[key] ?? 0), 0);
	return moneyCell(total, rows[0]?.original.currency_code ?? 'MYR');
};

const countFooter = <T extends Record<CountKey, number>>(
	column: { getFacetedRowModel: () => { rows: TableRow<T>[] } },
	key: CountKey,
) => {
	const total = column.getFacetedRowModel().rows.reduce((acc, row) => acc + Number(row.original[key] ?? 0), 0);
	return numberCell(total);
};

export function getSummShippingColumns(t: TranslateFn): TableColumn<SummSaleShipping>[] {
	return [
		{
			accessorKey: 'biz_date',
			header: () => headerCell(t(SUMM_SHIPPING_COLUMN_LABELS.biz_date)),
			cell: ({ row }) => getFormattedDate(row.original.biz_date, 'yyyy-MM-dd'),
			footer: () => h('div', { class: 'font-semibold text-default' }, t('pages.totalLabel')),
		},
		{
			accessorKey: 'currency_code',
			header: () => headerCell(t(SUMM_SHIPPING_COLUMN_LABELS.currency_code)),
		},
		{
			accessorKey: 'net_amt',
			header: () => headerCell(t(SUMM_SHIPPING_COLUMN_LABELS.net_amt), 'right'),
			cell: ({ row }) => moneyCell(row.original.net_amt, row.original.currency_code),
			footer: ({ column }) => moneyFooter(column, 'net_amt'),
			...tableCellMeta.rightNumeric,
		},
		{
			accessorKey: 'free_shipping_disc_amt',
			header: () => headerCell(t(SUMM_SHIPPING_COLUMN_LABELS.free_shipping_disc_amt), 'right'),
			cell: ({ row }) => moneyCell(row.original.free_shipping_disc_amt, row.original.currency_code),
			footer: ({ column }) => moneyFooter(column, 'free_shipping_disc_amt'),
			...tableCellMeta.rightNumeric,
		},
		{
			accessorKey: 'shipping_fee',
			header: () => headerCell(t(SUMM_SHIPPING_COLUMN_LABELS.shipping_fee), 'right'),
			cell: ({ row }) => moneyCell(row.original.shipping_fee, row.original.currency_code),
			footer: ({ column }) => moneyFooter(column, 'shipping_fee'),
			...tableCellMeta.rightNumeric,
		},
		{
			accessorKey: 'integrator_charge',
			header: () => headerCell(t(SUMM_SHIPPING_COLUMN_LABELS.integrator_charge), 'right'),
			cell: ({ row }) => moneyCell(row.original.integrator_charge, row.original.currency_code),
			footer: ({ column }) => moneyFooter(column, 'integrator_charge'),
			...tableCellMeta.rightNumeric,
		},
		{
			accessorKey: 'total_txns',
			header: () => headerCell(t(SUMM_SHIPPING_COLUMN_LABELS.total_txns), 'right'),
			cell: ({ row }) => numberCell(row.original.total_txns),
			footer: ({ column }) => countFooter(column, 'total_txns'),
			...tableCellMeta.rightNumeric,
		},
		{
			accessorKey: 'total_qty',
			header: () => headerCell(t(SUMM_SHIPPING_COLUMN_LABELS.total_qty), 'right'),
			cell: ({ row }) => numberCell(row.original.total_qty),
			footer: ({ column }) => countFooter(column, 'total_qty'),
			...tableCellMeta.rightNumeric,
		},
	];
}

export function getSummShippingDetailColumns(t: TranslateFn): TableColumn<SummSaleShippingDetail>[] {
	return [
		{
			accessorKey: 'biz_date',
			header: () => headerCell(t(SUMM_SHIPPING_DETAIL_COLUMN_LABELS.biz_date)),
			cell: ({ row }) => getFormattedDate(row.original.biz_date, 'yyyy-MM-dd'),
			footer: () => h('div', { class: 'font-semibold text-default' }, t('pages.totalLabel')),
		},
		{
			accessorKey: 'order_no',
			header: () => headerCell(t(SUMM_SHIPPING_DETAIL_COLUMN_LABELS.order_no)),
			cell: ({ row }) => h('span', { class: 'font-medium' }, row.original.order_no),
		},
		{
			accessorKey: 'inv_no',
			header: () => headerCell(t(SUMM_SHIPPING_DETAIL_COLUMN_LABELS.inv_no)),
			cell: ({ row }) => {
				const inv = row.original.inv_no;
				const orderNo = row.original.order_no;
				return inv && inv !== orderNo ? inv : '—';
			},
		},
		{
			accessorKey: 'shipment_status',
			header: () => headerCell(t(SUMM_SHIPPING_DETAIL_COLUMN_LABELS.shipment_status)),
			cell: ({ row }) => {
				const status = row.original.shipment_status;
				const color = getShipmentStatusColor(status) ?? 'neutral';
				return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () => status);
			},
		},
		{
			accessorKey: 'net_amt',
			header: () => headerCell(t(SUMM_SHIPPING_DETAIL_COLUMN_LABELS.net_amt), 'right'),
			cell: ({ row }) => moneyCell(row.original.net_amt, row.original.currency_code),
			footer: ({ column }) => moneyFooter(column, 'net_amt'),
			...tableCellMeta.rightNumeric,
		},
		{
			accessorKey: 'free_shipping_disc_amt',
			header: () => headerCell(t(SUMM_SHIPPING_DETAIL_COLUMN_LABELS.free_shipping_disc_amt), 'right'),
			cell: ({ row }) => moneyCell(row.original.free_shipping_disc_amt, row.original.currency_code),
			footer: ({ column }) => moneyFooter(column, 'free_shipping_disc_amt'),
			...tableCellMeta.rightNumeric,
		},
		{
			accessorKey: 'shipping_fee',
			header: () => headerCell(t(SUMM_SHIPPING_DETAIL_COLUMN_LABELS.shipping_fee), 'right'),
			cell: ({ row }) => moneyCell(row.original.shipping_fee, row.original.currency_code),
			footer: ({ column }) => moneyFooter(column, 'shipping_fee'),
			...tableCellMeta.rightNumeric,
		},
		{
			accessorKey: 'integrator_charge',
			header: () => headerCell(t(SUMM_SHIPPING_DETAIL_COLUMN_LABELS.integrator_charge), 'right'),
			cell: ({ row }) => moneyCell(row.original.integrator_charge, row.original.currency_code),
			footer: ({ column }) => moneyFooter(column, 'integrator_charge'),
			...tableCellMeta.rightNumeric,
		},
		{
			accessorKey: 'total_qty',
			header: () => headerCell(t(SUMM_SHIPPING_DETAIL_COLUMN_LABELS.total_qty), 'right'),
			cell: ({ row }) => numberCell(row.original.total_qty),
			footer: ({ column }) => countFooter(column, 'total_qty'),
			...tableCellMeta.rightNumeric,
		},
	];
}
