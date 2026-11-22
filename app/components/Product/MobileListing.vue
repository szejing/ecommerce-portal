<template>
	<div class="space-y-2">
		<div ref="searchBar" class="flex items-center gap-2">
			<UInput
				:model-value="filters.query"
				type="search"
				:icon="ICONS.SEARCH_ROUNDED"
				:aria-label="t('productMobileListing.search')"
				:placeholder="t('productMobileListing.search')"
				class="min-w-0 flex-1"
				:ui="{ base: 'min-h-11 text-base' }"
				@update:model-value="productStore.setSearch"
			/>
			<UDrawer v-model:open="filtersOpen" :title="t('productMobileListing.filters')" :close="{ class: 'min-h-11 min-w-11 justify-center' }">
				<UButton color="neutral" variant="outline" :icon="ICONS.FILTER" class="min-h-11" :label="filtersLabel" />
				<template #body>
					<div class="space-y-4">
						<UFormField :label="t('components.filter.status')">
							<USelect v-model="draftStatus" :items="statusOptions" class="w-full min-h-11" />
						</UFormField>
						<UFormField :label="t('productMobileListing.sort')">
							<USelect v-model="draftSort" :items="sortOptions" class="w-full min-h-11" />
						</UFormField>
					</div>
				</template>
				<template #footer>
					<div class="grid grid-cols-2 gap-2 pb-[env(safe-area-inset-bottom)]">
						<UButton color="neutral" variant="outline" class="min-h-11 justify-center" :label="t('components.filter.clear')" @click="resetDraft" />
						<UButton class="min-h-11 justify-center" :label="t('common.apply')" @click="applyFilters" />
					</div>
				</template>
			</UDrawer>
		</div>

		<div v-if="typeOptions.length" class="flex flex-wrap gap-1" role="group" :aria-label="t('components.filter.productType')">
			<UButton
				v-for="item in typeOptions"
				:key="item.value"
				:label="item.label"
				:color="selectedType === item.value ? 'primary' : 'neutral'"
				:variant="selectedType === item.value ? 'soft' : 'ghost'"
				:aria-pressed="selectedType === item.value"
				class="min-h-11 min-w-11 px-2.5"
				@click="$emit('update:selectedType', item.value)"
			/>
		</div>

		<div class="flex min-h-11 items-center justify-between gap-2">
			<p role="status" class="text-sm text-muted">
				{{ busy ? t('common.loading') : !listFailure && total_products ? t('pages.showingProducts', { ...pageRange, total: total_products }) : '' }}
			</p>
			<UDrawer :title="t('productMobileListing.more')" :close="{ class: 'min-h-11 min-w-11 justify-center' }">
				<UButton color="neutral" variant="ghost" :icon="ICONS.HORIZONTAL_ELLIPSIS" :label="t('productMobileListing.more')" class="min-h-11 shrink-0" />
				<template #body>
					<div class="space-y-4 pb-[env(safe-area-inset-bottom)]">
						<slot name="more" />
					</div>
				</template>
			</UDrawer>
		</div>

		<section :aria-label="t('productMobileListing.results')" :aria-busy="busy">
			<div v-if="busy" class="divide-y divide-default">
				<div v-for="index in 5" :key="index" class="flex items-center gap-3 py-3" aria-hidden="true">
					<USkeleton class="size-10 shrink-0 rounded-md" />
					<div class="flex-1 space-y-2">
						<USkeleton class="h-4 w-2/3" />
						<USkeleton class="h-3 w-1/3" />
					</div>
				</div>
			</div>
			<div v-else-if="listFailure" class="space-y-3 py-6">
				<p>{{ t('productMobileListing.loadFailed') }}</p>
				<UButton variant="outline" class="min-h-11" :label="t('error.tryAgain')" @click="productStore.refreshListing" />
			</div>
			<div v-else-if="!rows.length" class="space-y-1 py-6">
				<p>{{ t('pages.noProductsFound') }}</p>
				<p class="text-sm text-muted">{{ t('pages.tryAdjustingFilters') }}</p>
			</div>
			<ul v-else class="divide-y divide-default border-y border-default">
				<li v-for="{ product, sku, type } in rows" :key="product.code">
					<NuxtLink
						:to="productDetailPath(product)"
						class="flex min-h-16 items-center gap-2.5 rounded-sm px-1 py-2.5 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]"
					>
						<ZImage :src="product.thumbnail?.url || ''" :width="40" :height="40" />
						<span class="min-w-0 flex-1 wrap-anywhere">
							<span class="block text-sm font-semibold text-highlighted">{{ product.name || product.code }}</span>
							<span v-if="product.code || type" class="block text-xs text-muted">
								{{ [product.code, type].filter(Boolean).join(' · ') }}
							</span>
							<span v-if="sku" class="block text-xs font-medium text-primary">{{ sku }}</span>
						</span>
						<span class="flex shrink-0 flex-col items-end gap-1">
							<UBadge v-if="product.status" :color="getProductStatusColor(product.status)" variant="subtle" size="sm">
								{{ statusOptions.find(({ value }) => value === product.status)?.label ?? t('options.' + product.status, product.status) }}
							</UBadge>
							<UBadge v-if="product.is_active === false" color="neutral" variant="subtle" size="sm">{{ t('common.inactive') }}</UBadge>
						</span>
						<UIcon :name="ICONS.CHEVRON_RIGHT" class="size-4 shrink-0 text-muted" aria-hidden="true" />
					</NuxtLink>
				</li>
			</ul>
			<nav v-if="!busy && !listFailure && pageCount > 1" :aria-label="t('productMobileListing.pagination')" class="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
				<UButton
					color="neutral"
					variant="outline"
					:label="t('productMobileListing.previous')"
					:disabled="filters.current_page <= 1"
					class="min-h-11 justify-center"
					@click="changePage(filters.current_page - 1)"
				/>
				<span class="text-center text-xs text-muted">{{ t('productMobileListing.page', { page: filters.current_page, total: pageCount }) }}</span>
				<UButton
					color="neutral"
					variant="outline"
					:label="t('productMobileListing.next')"
					:disabled="filters.current_page >= pageCount"
					class="min-h-11 justify-center"
					@click="changePage(filters.current_page + 1)"
				/>
			</nav>
		</section>
	</div>
</template>

<script lang="ts" setup>
import type { ProductStatus } from 'yeppi-common';
import { ICONS } from '~/utils/icons';
import { listingRange } from '~/utils/listing-range';
import { getProductStatusColor, getProductStatusOptions } from '~/utils/options';
import { productDetailPath } from '~/utils/product-route';
import { productTypeFilterLabel } from '~/utils/product-type-label';
import type { ProductListingSort } from '~/stores/Product/Product';

const props = defineProps<{
	initialize: boolean;
	typeOptions: { label: string; value: string }[];
	selectedType: string;
}>();
defineEmits<{ 'update:selectedType': [value: string] }>();

const { t } = useI18n();
const productStore = useProductStore();
const { products, filters, total_products, loading, listFailure } = storeToRefs(productStore);
const searchBar = useTemplateRef('searchBar');
const filtersOpen = ref(false);
const draftStatus = ref<ProductStatus | 'all'>('all');
const draftSort = ref<ProductListingSort>('recent');
const statusOptions = computed(() => [{ label: t('components.filter.allStatus'), value: 'all' as const }, ...getProductStatusOptions(t)]);
const sortOptions = computed(() => [
	{ label: t('productMobileListing.recent'), value: 'recent' as const },
	{ label: t('productMobileListing.name'), value: 'name' as const },
]);

const busy = computed(() => props.initialize || loading.value);
const pageCount = computed(() => Math.ceil(total_products.value / filters.value.page_size));
const pageRange = computed(() => listingRange(filters.value.current_page, filters.value.page_size, total_products.value));
const filtersLabel = computed(() => filters.value.status ? t('productMobileListing.filtersCount', { count: 1 }) : t('productMobileListing.filters'));

const rows = computed(() => {
	const term = filters.value.query.trim().toLowerCase();
	return products.value.map(product => {
		const skus = [...new Set([product.sku, ...(product.variants ?? []).map(variant => variant.sku)].flatMap(sku => sku?.trim() || []))];
		const matches = term ? skus.filter(sku => sku.toLowerCase().includes(term)) : [];
		const singleSku = matches.find(sku => sku.toLowerCase() === term)
			?? (matches.length === 1 ? matches[0] : undefined)
			?? (skus.length === 1 ? skus[0] : undefined);
		let sku = '';
		if (singleSku) {
			sku = t('productMobileListing.sku', { sku: singleSku });
		} else if (matches.length > 1) {
			sku = t('productMobileListing.matchingSkus', { count: matches.length });
		} else if (skus.length > 1) {
			sku = t('productMobileListing.skus', { count: skus.length });
		}
		return {
			product,
			sku,
			type: props.selectedType === 'all' && product.type ? productTypeFilterLabel(product.type, t) : '',
		};
	});
});

watch(filtersOpen, (open) => {
	if (!open) return;
	draftStatus.value = filters.value.status ?? 'all';
	draftSort.value = filters.value.sort;
});

function resetDraft() {
	draftStatus.value = 'all';
	draftSort.value = 'recent';
}

function applyFilters() {
	filtersOpen.value = false;
	void productStore.applyListingOptions(draftStatus.value === 'all' ? undefined : draftStatus.value, draftSort.value);
}

function changePage(page: number) {
	void productStore.setPage(page);
	searchBar.value?.scrollIntoView({ block: 'start' });
}
</script>
