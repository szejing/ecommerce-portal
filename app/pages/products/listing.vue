<template>
	<ZPagePanel id="products-listing" :title="t('nav.products')" :description="t('pages.productsListingDesc')" compact-on-mobile>
		<template #navbar-right>
			<div class="hidden flex-wrap items-center gap-2 lg:flex">
				<ZCreateButton to="/products/create" :label="t('common.addProduct')" :icon="ICONS.CUBE" />
				<ZCreateButton to="/products/create-service" :label="t('common.addService')" :icon="ICONS.SERVICE" />
			</div>
			<UDropdownMenu :items="mobileCreateItems" :content="{ align: 'end' }" :ui="{ item: 'min-h-11' }">
				<UButton class="min-h-11 min-w-11 justify-center lg:hidden" :aria-label="t('productMobileListing.add')" :label="t('productMobileListing.add')" />
			</UDropdownMenu>
		</template>
		<template #toolbar>
			<div class="flex flex-col gap-3">
				<div class="flex flex-col gap-3 xl:flex-row xl:items-end">
					<ZSectionFilterProducts />
					<div class="flex flex-wrap items-end gap-2 xl:shrink-0 xl:justify-end">
						<div class="flex w-44 flex-col gap-1.5">
							<label class="text-xs font-medium text-muted" for="products-listing-status">{{ t('components.filter.status') }}</label>
							<ZSelectMenuProductStatus
								id="products-listing-status"
								:status="filters.status"
								:empty-label="t('components.filter.allStatus')"
								@update:status="productStore.setStatus"
							/>
						</div>
						<UButton variant="outline" color="neutral" :icon="ICONS.FILTER" @click="productStore.refreshListing">
							{{ t('components.filter.filterAction') }}
						</UButton>
						<UButton variant="outline" color="neutral" :icon="ICONS.REFRESH" @click="productStore.clearFilters">
							{{ t('components.filter.clear') }}
						</UButton>
						<ZImportActions v-bind="importActionOptions" @download-template="downloadProductImportTemplate" @import="importProductFile" />
					</div>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div v-if="showTypeFilter" class="flex min-w-0 flex-wrap items-center gap-4" role="tablist" :aria-label="t('components.filter.productType')">
						<UButton
							v-for="item in typeTabItems"
							:key="String(item.value)"
							type="button"
							role="tab"
							size="md"
							color="neutral"
							variant="outline"
							active-color="primary"
							active-variant="solid"
							:active="selectedTypeTab === item.value"
							:icon="item.icon"
							:label="item.label"
							:aria-selected="selectedTypeTab === item.value"
							class="rounded-xl"
							@click="selectedTypeTab = String(item.value)"
						/>
					</div>
					<div class="shrink-0 sm:ms-auto">
						<ZTableToolbar
							v-model:selected-column-keys="selectedColumnKeys"
							:model-value="filters.page_size"
							:page-size-options="options_page_size"
							:export-enabled="true"
							:exporting="exporting"
							:column-options="columnOptions"
							@update:model-value="productStore.setPageSize"
							@export="exportProducts"
						/>
					</div>
				</div>

				<div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2">
					<span class="text-xs text-muted">{{ t('components.filter.activeFilters') }}</span>
					<UBadge v-if="filters.query" color="info" variant="subtle" size="sm" class="cursor-pointer" @click="productStore.setSearch('')">
						{{ t('components.filter.search') }}: {{ filters.query }}
						<UIcon name="i-heroicons-x-mark" class="ml-1 size-3" />
					</UBadge>
					<UBadge v-if="filters.status" color="success" variant="subtle" size="sm" class="cursor-pointer" @click="productStore.setStatus(undefined)">
						{{ t('components.filter.status') }}: {{ capitalizeFirstLetter(filters.status) }}
						<UIcon name="i-heroicons-x-mark" class="ml-1 size-3" />
					</UBadge>
					<UBadge v-if="filters.type_id != null" color="warning" variant="subtle" size="sm" class="cursor-pointer" @click="productStore.setTypeId(undefined)">
						{{ t('components.filter.productType') }}: {{ labelForSelectedType }}
						<UIcon name="i-heroicons-x-mark" class="ml-1 size-3" />
					</UBadge>
				</div>
			</div>
		</template>
		<div ref="mobileContent" class="lg:hidden">
			<ProductMobileListing v-model:selected-type="selectedTypeTab" :initialize="initialize" :type-options="showTypeFilter ? typeTabItems : []">
				<template #more>
					<ZImportActions touch-friendly v-bind="importActionOptions" @download-template="downloadProductImportTemplate" @import="importProductFile" />
					<UButton
						:loading="exporting"
						:disabled="exporting"
						:label="t('common.export')"
						icon="i-heroicons-arrow-down-tray"
						variant="outline"
						class="min-h-11"
						@click="exportProducts"
					/>
				</template>
			</ProductMobileListing>
		</div>
		<div class="hidden lg:block">
			<template v-if="initialize">
				<div class="divide-y divide-default overflow-hidden rounded-lg">
					<div class="grid grid-cols-4 gap-4 p-4">
						<USkeleton v-for="i in 4" :key="i" class="h-4 min-w-0 flex-1" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-4 items-center gap-4 p-4">
						<USkeleton v-for="j in 4" :key="j" class="h-4 min-w-0 flex-1" />
					</div>
				</div>
			</template>

			<UCard v-else :ui="{ root: 'overflow-hidden', body: 'p-0 sm:p-0' }">
				<UTable :data="products" :columns="visibleColumns" :loading="loading" @select="selectProduct">
					<template #empty>
						<div class="flex flex-col items-center justify-center gap-3 py-12">
							<UIcon :name="ICONS.PRODUCT" class="size-12 text-muted" />
							<p class="text-sm text-muted">{{ t('pages.noProductsFound') }}</p>
							<p class="text-xs text-dimmed">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>

				<div v-if="products.length > 0" class="flex flex-col gap-3 border-t border-default px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
					<p class="text-sm text-muted">
						{{ t('pages.showingProducts', { from: pageRange.from, to: pageRange.to, total: total_products }) }}
					</p>
					<ZPagination
						:page="filters.current_page"
						:items-per-page="filters.page_size"
						:total="total_products"
						show-edges
						:sibling-count="1"
						size="sm"
						color="neutral"
						variant="ghost"
						active-color="primary"
						active-variant="solid"
						@update:page="productStore.setPage"
					/>
				</div>
			</UCard>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { options_page_size } from '~/utils/options';
import { getProductColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { Product } from '~/utils/types/product';
import type { DropdownMenuItem, TableRow } from '@nuxt/ui';
import { ZModalImporting, ZModalLoading } from '#components';
import {
	PRODUCT_IMPORT_ACCEPT,
	PRODUCT_IMPORT_FORMAT_ERROR_MESSAGE,
	isAllowedProductImportFile,
	type ProductImportTemplateType,
} from '~/repository/modules/product/product';
import { ICONS } from '~/utils/icons';
import { listingRange } from '~/utils/listing-range';
import { productDetailPath } from '~/utils/product-route';
import { productTypeFilterIcon, productTypeFilterLabel } from '~/utils/product-type-label';
import { failedNotification } from '~/stores/AppUi/AppUi';

const TYPE_TAB_ALL = 'all';

const { t } = useI18n();
const productStore = useProductStore();
const overlay = useOverlay();
const loadingModal = overlay.create(ZModalLoading, { props: { key: 'loading' } });
const importLoadingModal = overlay.create(ZModalImporting, {
	props: {
		key: 'product-import-loading',
		processed: null as number | null,
		total: null as number | null,
		elapsedSeconds: 0,
		showStop: true,
		onStop: () => productStore.stopImportProducts(),
	},
});

const PRODUCT_COLUMN_LABELS = {
	name: 'table.codeAndName',
	type: 'table.type',
	is_active: 'table.status',
	updated_at: 'table.lastUpdated',
	price_types: 'table.price',
} as const;

const product_columns = computed(() => getProductColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, PRODUCT_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(product_columns, columnOptions);
useHead({ title: () => t('pages.productsTitle') });
const productImportSources = computed(() => [
	{
		label: t('import.ourTemplate'),
		value: 'wemotoo',
		description: t('import.ourTemplateDescription'),
		icon: ICONS.OUTLET,
	},
	{
		label: t('import.sitegiant'),
		value: 'sitegiant',
		description: t('import.sitegiantDescription'),
		logoSrc: '/logo/sitegiant.png',
	},
	{
		label: t('import.tiktok'),
		value: 'tiktok',
		description: t('import.tiktokDescription'),
		icon: 'i-simple-icons-tiktok',
	},
]);

const {
	products,
	loading,
	filters,
	product_types,
	total_products,
	exporting,
	updating,
	importing,
	import_processed,
	import_total,
	import_elapsed_seconds,
	downloading_template,
	listFailure,
} = storeToRefs(productStore);
const mobileCreateItems = computed<DropdownMenuItem[]>(() => [
	{ label: t('common.addProduct'), icon: ICONS.CUBE, to: '/products/create' },
	{ label: t('common.addService'), icon: ICONS.SERVICE, to: '/products/create-service' },
]);
const importActionOptions = computed(() => ({
	downloadingTemplate: downloading_template.value,
	importing: importing.value,
	accept: PRODUCT_IMPORT_ACCEPT,
	isAllowedFile: isAllowedProductImportFile,
	formatErrorMessage: PRODUCT_IMPORT_FORMAT_ERROR_MESSAGE,
	importSources: productImportSources.value,
	sourceModalTitle: t('import.selectTemplate'),
}));
const mobileContent = useTemplateRef('mobileContent');
const restoreMobileScroll = useMobileListScroll('products-listing-mobile-scroll', mobileContent, (path) =>
	products.value.some((product) => productDetailPath(product) === path),
);

const initialize = ref(true);
const showTypeFilter = computed(() => product_types.value.length > 1);
const pageRange = computed(() => listingRange(filters.value.current_page, filters.value.page_size, total_products.value));
const hasActiveFilters = computed(() => Boolean(filters.value.query || filters.value.status || filters.value.type_id != null));
const labelForSelectedType = computed(() => {
	const match = product_types.value.find((pt) => pt.id === filters.value.type_id);
	return match ? productTypeFilterLabel(match.value, t) : String(filters.value.type_id);
});

const typeTabItems = computed(() => [
	{
		label: t('options.all'),
		value: TYPE_TAB_ALL,
		icon: undefined as string | undefined,
	},
	...product_types.value.map((pt) => ({
		label: productTypeFilterLabel(pt.value, t),
		value: String(pt.id),
		icon: productTypeFilterIcon(pt.value),
	})),
]);

const selectedTypeTab = computed({
	get: () => (filters.value.type_id == null ? TYPE_TAB_ALL : String(filters.value.type_id)),
	set: (value: string | number) => {
		const key = String(value);
		productStore.setTypeId(key === TYPE_TAB_ALL ? undefined : Number(key));
	},
});

watch(listFailure, (failure) => {
	if (failure) failedNotification(failure.message);
});

onMounted(async () => {
	initialize.value = true;
	try {
		await productStore.refreshListing();
	} finally {
		initialize.value = false;
		await restoreMobileScroll();
	}
});

watch(
	() => updating.value,
	(value: boolean) => {
		if (value) {
			loadingModal.open();
		} else {
			loadingModal.close();
		}
	},
);

watch(
	() => exporting.value,
	(value: boolean) => {
		if (value) {
			loadingModal.open();
		} else {
			loadingModal.close();
		}
	},
);

watch(
	() => importing.value,
	(value: boolean) => {
		if (value) {
			importLoadingModal.open();
		} else {
			importLoadingModal.close();
		}
	},
);

// useOverlay copies props on create/open, so Import Progress has to be pushed in.
watch(
	() => [import_processed.value, import_total.value, import_elapsed_seconds.value] as const,
	([processed, total, elapsedSeconds]) => {
		if (!importing.value) return;
		importLoadingModal.patch({ processed, total, elapsedSeconds });
	},
);

const selectProduct = async (e: Event, row: TableRow<Product>) => {
	const product = row.original;
	if (!product) return;

	navigateTo(productDetailPath(product));
};

const exportProducts = async () => {
	await productStore.exportProducts();
};

const importProductFile = async (file: File, importSource?: string) => {
	const templateType: ProductImportTemplateType = importSource === 'sitegiant' || importSource === 'tiktok' ? importSource : 'wemotoo';
	try {
		await productStore.importProducts(file, templateType);
	} catch {
		// Store action already shows the failure notification.
	}
};

const downloadProductImportTemplate = async () => {
	await productStore.downloadImportTemplate();
};
</script>

<style scoped></style>
