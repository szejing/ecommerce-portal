<template>
	<ZPagePanel id="products-brands" inline-mobile-actions :title="t('nav.brands')" back-to="/products">
		<template #navbar-right>
			<ZCreateButton class="hidden lg:flex" to="/products/brands/create" :label="t('common.addBrand')" />
			<UButton
				to="/products/brands/create"
				:label="t('productMobileListing.add')"
				:aria-label="t('common.addBrand')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
			/>
		</template>
		<template #toolbar>
			<ZSectionFilterBrands />
		</template>
		<div class="space-y-3 lg:space-y-6">
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				class="hidden lg:flex"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="brandStore.updatePageSize"
				@export="exportBrands"
			/>

			<template v-if="initialize">
				<div class="rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
					<div class="grid grid-cols-[1fr_auto] gap-4 p-4">
						<USkeleton class="h-4 w-24" />
						<USkeleton class="h-4 w-16" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-[1fr_auto] gap-4 p-4 items-center">
						<USkeleton class="h-4 w-40" />
						<USkeleton class="h-4 w-12" />
					</div>
				</div>
			</template>

			<section v-else class="lg:hidden" :aria-label="t('nav.brands')" :aria-busy="loading">
				<ZLoading v-if="loading" />
				<UEmpty v-else-if="!getDisplayBrands.length" :icon="ICONS.ADDITIONAL" :title="t('pages.noBrandsFound')" :description="t('pages.tryAdjustingFilters')" />
				<ul v-else class="divide-y divide-default border-y border-default">
					<li v-for="brand in getDisplayBrands" :key="brand.code">
						<ZRecordLink @click="openBrand(brand)">
							<span class="block text-sm font-semibold text-highlighted">{{ brand.description || brand.code }}</span>
							<span v-if="brand.description" class="block text-xs text-muted">{{ brand.code }}</span>
							<template #trailing>
								<span class="text-sm tabular-nums">
									<span class="sr-only">{{ t('table.noOfItems') }}</span>
									{{ brand.total_products ?? 0 }}
								</span>
								<UBadge v-if="brand.is_active === false" color="neutral" variant="subtle" size="sm">{{ t('common.inactive') }}</UBadge>
							</template>
						</ZRecordLink>
					</li>
				</ul>
			</section>

			<UCard v-if="!initialize" class="hidden lg:block" :ui="{ body: 'p-0 sm:p-0' }">
				<UTable :data="getDisplayBrands" :columns="visibleColumns" :loading="loading" @select="(_event, row) => openBrand(row.original)">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.ADDITIONAL" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noBrandsFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<!-- Pagination  -->
			<div v-if="!initialize && (getDisplayBrands.length > 0 || filter.current_page > 1)" class="section-pagination flex-wrap items-center gap-2">
				<USelect
					:model-value="filter.page_size"
					:items="options_page_size"
					:aria-label="t('catalogMobile.rowsPerPage')"
					class="min-h-11 lg:hidden"
					@update:model-value="brandStore.updatePageSize"
				/>
				<ZPagination :page="filter.current_page" :items-per-page="filter.page_size" :total="total_brands" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalBrandDetail, ZModalConfirmation } from '#components';
import { getBrandColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { Brand } from '~/utils/types/brand';
import { options_page_size } from '~/utils/options';
import { ICONS } from '~/utils/icons';
import { failedNotification } from '~/stores/AppUi/AppUi';

const BRAND_COLUMN_LABELS = {
	code: 'table.code',
	total_products: 'table.noOfItems',
} as const;

const overlay = useOverlay();
const brandStore = useBrandStore();

const { t } = useI18n();
const brand_columns = computed(() => getBrandColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, BRAND_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(brand_columns, columnOptions);
useHead({ title: () => t('pages.brandsTitle') });

const { loading, getDisplayBrands, total_brands, filter, exporting } = storeToRefs(brandStore);
const initialize = ref(true);

onMounted(async () => {
	initialize.value = true;
	try {
		await brandStore.getBrands();
	} finally {
		initialize.value = false;
	}
});

const deleteBrand = async (brand: Brand) => {
	const hasProducts = false;

	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: hasProducts ? t('pages.confirmDeleteBrandWithProducts') : t('pages.confirmDeleteBrand'),
			action: 'delete',
			onConfirm: async () => {
				await brandStore.deleteBrand(brand);
				confirmModal.close();
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};

const openBrand = async (brand: Brand) => {
	if (brand.is_internal) {
		failedNotification(t('pages.internalBrandsCannotBeEdited'));
		return;
	}

	const brandModal = overlay.create(ZModalBrandDetail, {
		props: {
			brand: JSON.parse(JSON.stringify(brand)),
			onUpdate: async ({ description, is_active }) => {
				await brandStore.updateBrand(description, is_active);
				brandModal.close();
			},
			onDelete: async () => {
				brandModal.close();
				await deleteBrand(brand);
			},
			onCancel: () => {
				brandModal.close();
			},
		},
	});

	brandModal.open();
};

const updatePage = async (page: number) => {
	await brandStore.updatePage(page);
};

const exportBrands = async () => {
	// await brandStore.exportBrands();
};
</script>

<style scoped></style>
