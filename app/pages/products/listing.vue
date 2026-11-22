<template>
	<ZPagePanel id="products-listing" :title="t('nav.products')" back-to="/products">
		<template #navbar-right>
			<div class="flex flex-wrap items-center gap-2">
				<ZImportActions
					:downloading-template="downloading_template"
					:importing="importing"
					:accept="PRODUCT_IMPORT_ACCEPT"
					:is-allowed-file="isAllowedProductImportFile"
					:format-error-message="PRODUCT_IMPORT_FORMAT_ERROR_MESSAGE"
					:import-sources="productImportSources"
					:source-modal-title="t('import.selectTemplate')"
					@download-template="downloadProductImportTemplate"
					@import="importProductFile"
				/>
				<ZCreateButton to="/products/create" :label="t('common.addProduct')" :icon="ICONS.CUBE" />
				<ZCreateButton to="/products/create-service" :label="t('common.addService')" :icon="ICONS.SERVICE" />
			</div>
		</template>
		<template #toolbar>
			<ZSectionFilterProducts />
		</template>
		<div class="space-y-6">
			<!-- Type pills (left) + table controls (right) -->
			<div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
				<UTabs
					v-if="showTypeFilter"
					v-model="selectedTypeTab"
					:items="typeTabItems"
					:content="false"
					color="primary"
					variant="pill"
					size="sm"
					activation-mode="manual"
					:aria-label="t('components.filter.productType')"
					:ui="typeTabsUi"
					class="min-w-0"
				/>
				<div class="sm:ms-auto shrink-0">
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

			<template v-if="initialize">
				<div class="rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
					<div class="grid grid-cols-4 gap-4 p-4">
						<USkeleton v-for="i in 4" :key="i" class="h-4 flex-1 min-w-0" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-4 gap-4 p-4 items-center">
						<USkeleton v-for="j in 4" :key="j" class="h-4 flex-1 min-w-0" />
					</div>
				</div>
			</template>

			<UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
				<UTable :data="products" :columns="visibleColumns" :loading="loading" @select="selectProduct">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.PRODUCT" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noProductsFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<div v-if="!initialize && products.length > 0" class="section-pagination">
				<UPagination :page="filters.current_page" :items-per-page="filters.page_size" :total="total_products" @update:page="productStore.setPage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { options_page_size } from '~/utils/options';
import { getProductColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { Product } from '~/utils/types/product';
import type { TableRow, TabsItem } from '@nuxt/ui';
import { ZModalImporting, ZModalLoading } from '#components';
import {
	PRODUCT_IMPORT_ACCEPT,
	PRODUCT_IMPORT_FORMAT_ERROR_MESSAGE,
	isAllowedProductImportFile,
	type ProductImportTemplateType,
} from '~/repository/modules/product/product';
import { ICONS } from '~/utils/icons';
import { productDetailPath } from '~/utils/product-route';
import { productTypeFilterIcon, productTypeFilterLabel } from '~/utils/product-type-label';
import { failedNotification } from '~/stores/AppUi/AppUi';

const TYPE_TAB_ALL = 'all';
const typeTabsUi = {
	root: 'w-auto max-w-full overflow-x-auto',
	list: 'inline-flex w-auto min-w-max gap-0.5 p-1.5 ring-1 ring-inset ring-default/50',
	trigger: 'grow-0 whitespace-nowrap px-3.5 py-2 text-sm',
	leadingIcon: 'size-5',
} as const;

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
const initialize = ref(true);
const showTypeFilter = computed(() => product_types.value.length > 1);

const typeTabItems = computed<TabsItem[]>(() => [
	{
		label: t('options.all'),
		value: TYPE_TAB_ALL,
		icon: ICONS.LAYERS,
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
