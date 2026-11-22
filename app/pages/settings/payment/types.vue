<template>
	<ZPagePanel id="payment-types" :title="t('nav.paymentTypes')" back-to="/settings/payment">
		<template #toolbar>
			<ZSectionFilterPaymentTypeGroups />
		</template>

		<div class="flex min-w-0 flex-col gap-3 lg:gap-6">
			<!-- Table Controls -->
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				desktop-columns
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="updatePageSize"
				@export="exportPaymentTypes"
			/>

			<template v-if="initialize">
				<div class="hidden lg:block rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
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
			<UTable v-else class="hidden lg:block" :data="payment_type_groups" :columns="visibleColumns" :loading="loading">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 gap-3">
						<UIcon :name="ICONS.PAYMENT_METHODS" class="w-12 h-12 text-gray-400" />
						<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noPaymentTypesFound') }}</p>
						<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
				</template>
			</UTable>

			<ZMobileRecordList
				v-slot="{ item }"
				:items="payment_type_groups"
				item-key="code"
				:label="t('nav.paymentTypes')"
				:empty-title="t('pages.noPaymentTypesFound')"
				:loading="initialize || loading"
			>
				<div class="min-h-16 px-2 py-2.5 wrap-anywhere">
					<span class="block text-sm font-semibold text-highlighted">{{ item.short_desc || item.desc || item.code }}</span>
					<span v-if="item.code" class="block text-xs text-muted">{{ item.code }}</span>
				</div>
			</ZMobileRecordList>

			<div v-if="!initialize && (payment_type_groups.length > 0 || filter.current_page > 1)" class="section-pagination">
				<ZPagination :page="filter.current_page" :items-per-page="filter.page_size" :total="total_payment_type_groups" :disabled="loading" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { options_page_size } from '~/utils/options';
import { getPaymentTypeGroupColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import { ICONS } from '~/utils/icons';

const PAYMENT_TYPE_GROUP_COLUMN_LABELS = {
	index: 'table.no',
	code: 'table.groupCode',
} as const;

const { t } = useI18n();
const payment_type_group_columns = computed(() => getPaymentTypeGroupColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, PAYMENT_TYPE_GROUP_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(payment_type_group_columns, columnOptions);
useHead({ title: () => t('pages.paymentTypesTitle') });

const paymentTypeStore = usePaymentTypeStore();
const { payment_type_groups, filter, total_payment_type_groups, loading, exporting } = storeToRefs(paymentTypeStore);
const initialize = ref(true);

onMounted(async () => {
	initialize.value = true;
	try {
		await paymentTypeStore.getPaymentTypeGroups();
	} finally {
		initialize.value = false;
	}
});

const updatePage = async (page: number) => {
	await paymentTypeStore.updatePage(page);
};

const updatePageSize = async (size: number) => {
	await paymentTypeStore.updatePageSize(size);
};

const exportPaymentTypes = async () => {
	await paymentTypeStore.exportPaymentTypeGroups();
};
</script>

<style scoped></style>
