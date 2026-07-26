<template>
	<ZPagePanel id="products-options" :title="t('nav.options')">
		<template #navbar-right>
			<ZCreateButton to="/products/options/create" :label="t('common.addOption')" />
		</template>
		<template #toolbar>
			<ZSectionFilterBrands />
		</template>
		<div class="space-y-6">
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="productOptionsStore.updatePage"
				@export="exportOptions"
			/>

			<template v-if="initialize">
				<div class="rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
					<!-- Header: Name | Values -->
					<div class="grid grid-cols-[1fr_1fr] gap-4 p-4">
						<USkeleton class="h-4 w-24" />
						<div class="flex justify-center">
							<USkeleton class="h-4 w-20" />
						</div>
					</div>
					<!-- Rows: option name + pill-shaped value placeholders -->
					<div v-for="i in 5" :key="i" class="grid grid-cols-[1fr_1fr] gap-4 p-4 items-center">
						<USkeleton class="h-4 w-32" />
						<div class="flex justify-center flex-wrap gap-1">
							<USkeleton v-for="j in 3" :key="j" class="h-6 w-14 rounded-full" />
						</div>
					</div>
				</div>
			</template>
			<UTable v-else :data="prod_variations" :columns="visibleColumns" :loading="loading" @select="selectProductOption">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 gap-3">
						<UIcon :name="ICONS.ADDITIONAL" class="w-12 h-12 text-gray-400" />
						<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noOptionsFound') }}</p>
						<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
				</template>
			</UTable>

			<!-- Pagination  -->
			<div v-if="prod_variations.length > 0" class="section-pagination">
				<UPagination v-model="filter.current_page" :items-per-page="filter.page_size" :total="total_variations" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalConfirmation, ZModalOptionDetail } from '#components';
import { getProductVariationColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { ProductVariation } from '~/utils/types/product-variation';
import type { ProductOption } from '~/utils/types/product-option';
import { options_page_size } from '~/utils/options';
import type { TableRow } from '@nuxt/ui';
import { ICONS } from '~/utils/icons';

const PRODUCT_VARIATION_COLUMN_LABELS = {
	name: 'table.name',
	options: 'table.options',
} as const;

const { t } = useI18n();
const product_variation_columns = computed(() => getProductVariationColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, PRODUCT_VARIATION_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(product_variation_columns, columnOptions);
useHead({ title: () => t('pages.optionsTitle') });

const overlay = useOverlay();
const productOptionsStore = useProductOptionStore();

const { loading, prod_variations, filter, exporting } = storeToRefs(productOptionsStore);
const { total_variations } = storeToRefs(productOptionsStore);
const initialize = ref(true);

onMounted(async () => {
	initialize.value = true;
	try {
		await productOptionsStore.getProductVariations();
	} finally {
		initialize.value = false;
	}
});

const deleteProductOption = async (row: TableRow<ProductVariation>) => {
	const option = row.original;

	if (!option) return;

	const hasProducts = false;
	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: 'Are you sure you want to delete this option?',
			action: 'delete',
			onConfirm: async () => {
				await productOptionsStore.deleteProductVariation(option);
				confirmModal.close();
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};

const selectProductOption = async (e: Event, row: TableRow<ProductVariation>) => {
	const option = row.original;

	if (!option) return;

	const optionModal = overlay.create(ZModalOptionDetail, {
		props: {
			productOption: JSON.parse(JSON.stringify(option)),
			onUpdate: async (name: string, values: ProductOption[]) => {
				await productOptionsStore.updateProductVariation(option.id!, name, values);
				optionModal.close();
			},
			onDelete: async () => {
				optionModal.close();
				await deleteProductOption(row);
			},
			onCancel: () => {
				optionModal.close();
			},
		},
	});

	optionModal.open();
};

const updatePage = async (page: number) => {
	await productOptionsStore.updatePage(page);
};

const exportOptions = async () => {
	// await productOptionsStore.exportOptions();
};
</script>

<style scoped>
.base {
	width: 100%;
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	gap: 1.5rem;
	margin-top: 1rem;
}

@media (min-width: 640px) {
	.base {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}
}

.section-empty {
	height: 13rem;
}

.section-empty div {
	text-align: center;
}

.section-empty h2 {
	font-size: 1.5rem;
	line-height: 2rem;
	font-weight: 600;
}

.section-empty p {
	color: var(--color-neutral-400);
}
</style>
