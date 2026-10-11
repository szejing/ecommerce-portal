<template>
	<ZPagePanel id="product-combos" :title="t('combo.title')" back-to="/products">
		<template #navbar-right>
			<ZCreateButton to="/products/combos/create" :label="t('common.addCombo')" />
		</template>
		<template #toolbar>
			<ZSectionFilterCombos />
		</template>
		<div class="space-y-6">
			<ZTableToolbar
				v-model:selected-column-keys="selectedColumnKeys"
				:model-value="combo_filters.page_size"
				:page-size-options="options_page_size"
				:export-enabled="false"
				:column-options="columnOptions"
				@update:model-value="productStore.setComboPageSize"
			/>

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
				<UTable :data="combos" :columns="visibleColumns" :loading="combo_loading" @select="selectCombo">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.CUBE" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noCombosFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<div v-if="!initialize && combos.length > 0" class="section-pagination">
				<UPagination
					:page="combo_filters.current_page"
					:items-per-page="combo_filters.page_size"
					:total="total_combos"
					@update:page="productStore.setComboPage"
				/>
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { options_page_size } from '~/utils/options';
import { getComboColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { Product } from '~/utils/types/product';
import type { TableRow } from '@nuxt/ui';
import { ICONS } from '~/utils/icons';
import { productDetailPath } from '~/utils/product-route';
import { failedNotification } from '~/stores/AppUi/AppUi';

const { t } = useI18n();
const productStore = useProductStore();

const COMBO_COLUMN_LABELS = {
	name: 'table.codeAndName',
	components: 'combo.components',
	available: 'combo.available',
	price_types: 'table.price',
	status: 'table.status',
} as const;

const combo_columns = computed(() => getComboColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, COMBO_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(combo_columns, columnOptions);
useHead({ title: () => t('pages.combosTitle') });

const { combos, combo_loading, combo_filters, total_combos, comboListFailure } = storeToRefs(productStore);
const initialize = ref(true);

watch(comboListFailure, (failure) => {
	if (failure) failedNotification(failure.message);
});

onMounted(async () => {
	initialize.value = true;
	try {
		await productStore.refreshComboListing();
	} finally {
		initialize.value = false;
	}
});

const selectCombo = async (_event: Event, row: TableRow<Product>) => {
	const combo = row.original;
	if (!combo) return;

	navigateTo(productDetailPath(combo));
};
</script>

<style scoped></style>
