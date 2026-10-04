<template>
	<ZPagePanel id="product-combos" :title="t('combo.title')" back-to="/products">
		<template #navbar-right>
			<ZCreateButton to="/products/combos/create" :label="t('combo.create')" />
		</template>
		<template #toolbar>
			<div class="flex flex-wrap items-center gap-3">
				<UInput v-model="search" icon="i-lucide-search" :placeholder="t('combo.search')" :aria-label="t('combo.search')" class="w-full sm:w-72" />
				<USelect v-model="status" :items="statusItems" :aria-label="t('common.status')" class="w-44" />
				<USelect v-model="pageSize" :items="[10, 20, 50]" :aria-label="t('common.entries')" class="w-20" />
				<UTooltip :text="t('common.refresh')">
					<UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" :aria-label="t('common.refresh')" :loading="pending" @click="refresh()" />
				</UTooltip>
			</div>
		</template>
		<UAlert v-if="error" color="error" icon="i-lucide-circle-alert" :title="t('combo.loadFailed')" :description="getErrorResponseMessage(error, t('combo.loadFailed'))" class="mb-4" />
		<div class="min-w-0 overflow-x-auto" :aria-busy="pending">
			<UTable :data="data?.items ?? []" :columns="columns" :loading="pending" @select="selectCombo">
				<template #name-cell="{ row }">
					<NuxtLink :to="productDetailPath(row.original)" class="flex items-center gap-3 min-w-48 max-w-80">
						<img v-if="row.original.thumbnail?.url" :src="row.original.thumbnail.url" :alt="row.original.name" class="size-12 shrink-0 rounded object-cover" />
						<div class="min-w-0">
							<p class="font-medium break-words whitespace-normal">{{ row.original.name }}</p>
							<p class="text-xs text-muted break-all">{{ row.original.code }}</p>
						</div>
					</NuxtLink>
				</template>
				<template #components-cell="{ row }">
					<ul class="min-w-44 max-w-80 text-sm space-y-1">
						<li v-for="(label, index) in componentLabels(row.original)" :key="index" class="whitespace-normal break-words">{{ label }}</li>
					</ul>
				</template>
				<template #available-cell="{ row }">
					<UBadge v-if="row.original.combo_available_quantity === 0" color="error" variant="subtle">{{ t('combo.unavailable') }}</UBadge>
					<span v-else class="tabular-nums">{{ row.original.combo_available_quantity === null ? t('combo.unlimited') : row.original.combo_available_quantity ?? 0 }}</span>
				</template>
				<template #price-cell="{ row }"><span class="whitespace-nowrap tabular-nums">{{ comboPrice(row.original) }}</span></template>
				<template #status-cell="{ row }">
					<UBadge :color="row.original.is_active === false ? 'neutral' : row.original.status === ProductStatus.PUBLISHED ? 'primary' : 'warning'" variant="subtle">
						{{ t(row.original.is_active === false ? 'combo.archived' : row.original.status === ProductStatus.PUBLISHED ? 'combo.published' : 'combo.hidden') }}
					</UBadge>
				</template>
				<template #actions-cell="{ row }">
					<UTooltip :text="t('combo.configure')"><UButton icon="i-lucide-pencil" color="neutral" variant="ghost" :aria-label="t('combo.configure')" :to="productDetailPath(row.original)" @click.stop /></UTooltip>
				</template>
				<template #empty><p class="py-10 text-center text-muted">{{ pending ? t('common.loading') : error ? t('combo.loadFailed') : t('combo.empty') }}</p></template>
			</UTable>
		</div>
		<div class="flex justify-between items-center gap-4 flex-wrap pt-4 border-t border-muted">
			<span class="text-sm text-muted">{{ t('combo.count', { count: data?.total ?? 0 }) }}</span>
			<UPagination v-model:page="page" :items-per-page="pageSize" :total="data?.total ?? 0" :disabled="pending" />
		</div>
	</ZPagePanel>
</template>

<script setup lang="ts">
import type { TableColumn, TableRow } from '@nuxt/ui';
import { useDebounceFn } from '@vueuse/core';
import { formatCurrency, getErrorResponseMessage, ProductStatus } from 'yeppi-common';
import type { Product } from '~/utils/types/product';
import { productDetailPath } from '~/utils/product-route';

const { t } = useI18n();
useHead({ title: () => t('combo.title') });
const productStore = useProductStore();
const search = ref('');
const query = ref('');
const status = ref('all');
const page = ref(1);
const pageSize = ref(20);
watch(search, useDebounceFn(() => { query.value = search.value.trim(); page.value = 1; }, 500));
watch([status, pageSize], () => { page.value = 1; });
const statusItems = computed(() => [
	{ label: t('combo.allStatuses'), value: 'all' },
	{ label: t('combo.published'), value: ProductStatus.PUBLISHED },
	{ label: t('combo.hidden'), value: ProductStatus.DRAFT },
]);
const { data, pending, error, refresh } = await useAsyncData('product-combos', () => productStore.getCombos({
	page: page.value, pageSize: pageSize.value, search: query.value, status: status.value === 'all' ? undefined : status.value as ProductStatus,
}), { watch: [page, pageSize, query, status], default: () => ({ items: [], total: 0 }) });
const columns = computed<TableColumn<Product>[]>(() => [
	{ accessorKey: 'name', header: t('table.codeAndName') },
	{ id: 'components', header: t('combo.components') },
	{ id: 'available', header: t('combo.available') },
	{ id: 'price', header: t('common.price') },
	{ id: 'status', header: t('common.status') },
	{ id: 'actions', header: '' },
]);
function componentLabels(product: Product): string[] {
	return (product.combo_component_details?.length ? product.combo_component_details : product.combo_components ?? []).map(component => {
		const name = 'product_name' in component ? component.product_name : component.product_code;
		const variant = 'variant_name' in component ? component.variant_name : component.variant_code;
		return `${component.quantity} x ${name}${variant ? ` / ${variant}` : ''}`;
	});
}
function comboPrice(product: Product): string {
	const price = product.price_types?.[0];
	if (!price) return '-';
	return formatCurrency(price.sale_price && price.sale_price > 0 ? price.sale_price : price.orig_sell_price, price.currency_code);
}
function selectCombo(_event: Event, row: TableRow<Product>) {
	void navigateTo(productDetailPath(row.original));
}
</script>
