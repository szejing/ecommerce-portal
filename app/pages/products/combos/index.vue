<template>
	<ZPagePanel id="product-combos" inline-mobile-actions :title="t('combo.title')" back-to="/products">
		<template #navbar-right>
			<ZCreateButton class="hidden lg:flex" to="/products/combos/create" :label="t('common.addCombo')" />
			<UButton
				to="/products/combos/create"
				:label="t('productMobileListing.add')"
				:aria-label="t('common.addCombo')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
			/>
		</template>
		<template #toolbar>
			<ZSectionFilterCombos />
		</template>
		<div class="space-y-3 lg:space-y-6">
			<ZTableToolbar
				v-model:selected-column-keys="selectedColumnKeys"
				class="hidden lg:flex"
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

			<section v-else ref="mobileContent" class="lg:hidden" :aria-label="t('combo.title')" :aria-busy="combo_loading">
				<ZLoading v-if="combo_loading" />
				<UEmpty v-else-if="!combos.length" :icon="ICONS.CUBE" :title="t('pages.noCombosFound')" :description="t('pages.tryAdjustingFilters')" />
				<ul v-else class="divide-y divide-default border-y border-default">
					<li v-for="combo in combos" :key="combo.code">
						<ZRecordLink :to="productDetailPath(combo)">
							<template #leading>
								<ZImage :src="combo.thumbnail?.url || ''" :width="40" :height="40" />
							</template>
							<span class="block text-sm font-semibold text-highlighted">{{ combo.name || combo.code }}</span>
							<span v-if="combo.name" class="block text-xs text-muted">{{ combo.code }}</span>
							<span v-if="combo.combo_components?.length" class="block text-xs text-muted">
								{{ t('combo.components') }} · {{ combo.combo_components.length }}
							</span>
							<template #trailing>
								<UBadge :color="combo.is_active === false ? 'neutral' : combo.status === ProductStatus.PUBLISHED ? 'success' : 'warning'" variant="subtle" size="sm" class="whitespace-normal">
									{{ t(combo.is_active === false ? 'combo.archived' : combo.status === ProductStatus.PUBLISHED ? 'combo.published' : 'combo.hidden') }}
								</UBadge>
								<span v-if="combo.price_types?.[0]" class="text-sm font-medium tabular-nums">
									{{ comboPrice(combo.price_types[0]) }}
								</span>
								<span class="text-xs text-muted">
									{{ combo.combo_available_quantity === 0 ? t('combo.unavailable') : combo.combo_available_quantity == null ? t('combo.unlimited') : t('combo.available') + ' · ' + combo.combo_available_quantity }}
								</span>
							</template>
						</ZRecordLink>
					</li>
				</ul>
			</section>

			<UCard v-if="!initialize" class="hidden lg:block" :ui="{ body: 'p-0 sm:p-0' }">
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

			<div v-if="!initialize && (combos.length > 0 || combo_filters.current_page > 1)" class="section-pagination flex-wrap items-center gap-2">
				<USelect
					:model-value="combo_filters.page_size"
					:items="options_page_size"
					:aria-label="t('catalogMobile.rowsPerPage')"
					class="min-h-11 lg:hidden"
					@update:model-value="productStore.setComboPageSize"
				/>
				<ZPagination
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
import { formatCurrency, ProductStatus } from 'yeppi-common';
import type { PriceInput } from '~/utils/types/price';
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

const mobileContent = useTemplateRef('mobileContent');
const restoreMobileScroll = useMobileListScroll(
	'combos-listing-mobile-scroll',
	mobileContent,
	path => combos.value.some(combo => productDetailPath(combo) === path),
);

function comboPrice(price: PriceInput) {
	const amount = price.sale_price != null && price.sale_price > 0 ? price.sale_price : price.orig_sell_price;
	return amount == null ? '' : formatCurrency(amount, price.currency_code);
}

watch(comboListFailure, (failure) => {
	if (failure) failedNotification(failure.message);
});

onMounted(async () => {
	initialize.value = true;
	try {
		await productStore.refreshComboListing();
	} finally {
		initialize.value = false;
		await restoreMobileScroll();
	}
});

const selectCombo = async (_event: Event, row: TableRow<Product>) => {
	const combo = row.original;
	if (!combo) return;

	navigateTo(productDetailPath(combo));
};
</script>

<style scoped></style>
