/* eslint-disable indent */
import type { TableColumn } from '@nuxt/ui';
import type { Product } from '~/utils/types/product';
import { headerCell } from './styles';

type TranslateFn = (key: string) => string;

const PRODUCT_THUMBNAIL_FALLBACK = '/svg/product-holder.svg';

export function getComboAddItemColumns(t: TranslateFn): TableColumn<Product>[] {
	return [
		{
			accessorKey: 'name',
			header: () => headerCell(t('table.codeAndName')),
			meta: {
				class: {
					th: 'text-left',
					td: 'text-left min-w-[12rem]',
				},
			},
			cell: ({ row }) => {
				const thumbnailUrl = row.original.thumbnail?.url;
				return h('div', { class: 'flex items-center gap-3' }, [
					h('img', {
						src: thumbnailUrl || PRODUCT_THUMBNAIL_FALLBACK,
						alt: row.original.name || t('table.productThumbnail'),
						class: 'size-10 shrink-0 rounded-md object-cover',
						onError: (event: Event) => {
							const img = event.target as HTMLImageElement;
							if (img.src.endsWith(PRODUCT_THUMBNAIL_FALLBACK)) return;
							img.src = PRODUCT_THUMBNAIL_FALLBACK;
						},
					}),
					h('div', { class: 'min-w-0 flex-1' }, [
						h('div', { class: 'truncate font-medium text-highlighted', title: row.original.name ?? undefined }, row.original.name),
						h('div', { class: 'truncate font-mono text-xs text-muted italic', title: row.original.code ?? undefined }, row.original.code),
					]),
				]);
			},
		},
		{
			id: 'select',
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
