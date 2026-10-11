/* eslint-disable indent */
import type { TableColumn } from '@nuxt/ui';
import type { Product } from '~/utils/types/product';
import type { PriceInput } from '../types/price';
import { UBadge } from '#components';
import { formatCurrency, ProductStatus } from 'yeppi-common';
import { getSortableHeader, mutedCell, tableCellMeta } from './styles';

type TranslateFn = (key: string) => string;

const PRODUCT_THUMBNAIL_FALLBACK = '/svg/product-holder.svg';

function componentLabels(product: Product): string[] {
	return (product.combo_component_details?.length ? product.combo_component_details : (product.combo_components ?? [])).map((component) => {
		const name = 'product_name' in component ? component.product_name : component.product_code;
		const variant = 'variant_name' in component ? component.variant_name : component.variant_code;
		return `${component.quantity} x ${name}${variant ? ` / ${variant}` : ''}`;
	});
}

export function getComboColumns(t: TranslateFn): TableColumn<Product>[] {
	return [
		{
			accessorKey: 'name',
			header: ({ column }) => getSortableHeader(column, t('table.codeAndName')),
			meta: {
				class: {
					th: 'text-left max-w-sm',
					td: 'text-left max-w-sm min-w-[12rem]',
				},
			},
			cell: ({ row }) => {
				const thumbnailUrl = row.original.thumbnail?.url;

				const statusDot = h('span', {
					class: ['inline-block size-2 rounded-full flex-shrink-0', row.original.is_active !== false ? 'bg-success-500' : 'bg-neutral-300 dark:bg-neutral-600'],
					title: row.original.is_active !== false ? t('common.active') : t('common.inactive'),
				});

				return h('div', { class: 'flex items-start gap-3' }, [
					h('img', {
						src: thumbnailUrl || PRODUCT_THUMBNAIL_FALLBACK,
						alt: row.original.name || t('table.productThumbnail'),
						class: 'w-10 h-10 rounded-md object-cover flex-shrink-0',
						onError: (event: Event) => {
							const img = event.target as HTMLImageElement;
							if (img.src.endsWith(PRODUCT_THUMBNAIL_FALLBACK)) return;
							img.src = PRODUCT_THUMBNAIL_FALLBACK;
						},
					}),
					h('div', { class: 'flex-1 min-w-0' }, [
						h('div', { class: 'flex items-center gap-1.5 min-w-0' }, [
							statusDot,
							h('span', { class: 'font-semibold text-sm text-highlighted truncate', title: row.original.name ?? undefined }, row.original.name),
						]),
						h('div', { class: 'text-xs text-muted font-mono italic truncate', title: row.original.code ?? undefined }, row.original.code),
					]),
				]);
			},
		},
		{
			id: 'components',
			header: ({ column }) => getSortableHeader(column, t('combo.components')),
			meta: {
				class: {
					th: 'text-left min-w-[11rem]',
					td: 'text-left min-w-[11rem] max-w-80',
				},
			},
			cell: ({ row }) => {
				const labels = componentLabels(row.original);
				if (labels.length === 0) return mutedCell('—');
				return h(
					'ul',
					{ class: 'text-sm space-y-1' },
					labels.map((label) => h('li', { class: 'whitespace-normal break-words' }, label)),
				);
			},
		},
		{
			id: 'available',
			header: ({ column }) => getSortableHeader(column, t('combo.available')),
			cell: ({ row }) => {
				const qty = row.original.combo_available_quantity;
				if (qty === 0) {
					return h(UBadge, { color: 'error', variant: 'subtle' }, () => t('combo.unavailable'));
				}
				if (qty === null || qty === undefined) {
					return h('span', { class: 'tabular-nums' }, t('combo.unlimited'));
				}
				return h('span', { class: 'tabular-nums' }, String(qty));
			},
		},
		{
			id: 'price_types',
			accessorFn: (row) => {
				const priceType = row.price_types?.[0];
				if (!priceType) return 0;
				return priceType.sale_price != null && priceType.sale_price > 0 ? priceType.sale_price : (priceType.orig_sell_price ?? 0);
			},
			header: ({ column }) => getSortableHeader(column, t('table.price'), 'right'),
			cell: ({ row }) => {
				const price_types: PriceInput[] | undefined = row.original.price_types;
				const pt = price_types?.[0];
				if (!pt) return mutedCell('—');

				const hasSalePrice = pt.sale_price != null && pt.sale_price > 0;
				const sellingFormatted = pt.orig_sell_price != null ? formatCurrency(pt.orig_sell_price, pt.currency_code) : 'N/A';
				const saleFormatted = hasSalePrice ? formatCurrency(pt.sale_price!, pt.currency_code) : null;

				if (hasSalePrice && saleFormatted) {
					return h('div', { class: 'flex flex-col gap-0.5' }, [
						h('span', { class: 'text-sm font-semibold text-green-600 dark:text-green-400' }, saleFormatted),
						h('span', { class: 'text-xs text-muted line-through' }, sellingFormatted),
					]);
				}

				return h('div', { class: 'flex flex-col' }, [h('span', { class: 'text-sm font-semibold text-default' }, sellingFormatted)]);
			},
			...tableCellMeta.rightNumeric,
		},
		{
			id: 'status',
			header: ({ column }) => getSortableHeader(column, t('table.status')),
			cell: ({ row }) => {
				const isArchived = row.original.is_active === false;
				const isPublished = row.original.status === ProductStatus.PUBLISHED;
				const color = isArchived ? 'neutral' : isPublished ? 'primary' : 'warning';
				const label = t(isArchived ? 'combo.archived' : isPublished ? 'combo.published' : 'combo.hidden');
				return h(UBadge, { color, variant: 'subtle' }, () => label);
			},
		},
	];
}
