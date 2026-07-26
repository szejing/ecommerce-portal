<template>
	<ZPagePanel id="discounts-listing" :title="t('nav.discounts')" back-to="/marketing">
		<template #navbar-right>
			<ZCreateButton to="/marketing/discounts/create" :label="t('common.addDiscount')" />
		</template>
		<template #toolbar>
			<ZSectionFilterDiscounts />
		</template>

		<div class="space-y-6">
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="discountStore.updatePageSize"
				@export="exportDiscounts"
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
			<UTable v-else :data="discounts" :columns="visibleColumns" :loading="loading" @select="selectDiscount">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 gap-3">
						<UIcon :name="ICONS.ADDITIONAL" class="w-12 h-12 text-gray-400" />
						<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noDiscountsFound') }}</p>
						<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
				</template>
			</UTable>

			<!-- Pagination -->
			<div v-if="!initialize && discounts.length > 0" class="section-pagination">
				<UPagination v-model="filter.current_page" :items-per-page="filter.page_size" :total="total_discounts" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { getDiscountColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { TableRow } from '@nuxt/ui';
import type { Discount } from '~/utils/types/discount';
import { options_page_size } from '~/utils/options';
import { ICONS } from '~/utils/icons';

const DISCOUNT_COLUMN_LABELS = {
	code: 'table.code',
	disc_type: 'table.rule',
	usage_count: 'table.usage',
	is_disabled: 'table.active',
} as const;

const { t } = useI18n();
const discount_columns = computed(() => getDiscountColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, DISCOUNT_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(discount_columns, columnOptions);
useHead({ title: () => t('pages.discountsTitle') });

const discountStore = useDiscountStore();
const { loading, discounts, filter, total_discounts, exporting } = storeToRefs(discountStore);
const initialize = ref(true);
const router = useRouter();

onMounted(async () => {
	initialize.value = true;
	try {
		await discountStore.getDiscounts();
	} finally {
		initialize.value = false;
	}
});

const selectDiscount = async (e: Event, row: TableRow<Discount>) => {
	const discount = row.original;
	if (!discount) return;
	router.push(`/marketing/discounts/${discount.code}`);
};

const updatePage = async (page: number) => {
	await discountStore.updatePage(page);
};

const exportDiscounts = async () => {
	// await discountStore.exportDiscounts();
};
</script>

<style scoped></style>
