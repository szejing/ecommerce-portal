<template>
	<ZPagePanel id="analytics-sales-summary" desktop-toolbar :title="t('pages.analyticsSalesSummary')" back-to="/analytics/sales">
		<template #toolbar>
			<ZSectionFilterSaleSumm />
		</template>

		<div class="min-w-0 space-y-3 lg:space-y-6">
			<ZAnalyticsReportMobileControls
				v-model:filters-open="filtersOpen"
				v-model:selected-column-keys="selectedColumnKeys"
				:filters="sale_summ.filter"
				:fields="['status']"
				:page-size="sale_summ.page_size"
				:column-options="columnOptions"
				:loading="sale_summ.loading"
				:exporting="sale_summ.exporting"
				:total="sale_summ.total_data"
				@apply-filters="applyMobileFilters"
				@update:page-size="setMobilePageSize"
				@export="exportSummary('matching')"
			/>
			<ZTableToolbar
				v-model:selected-column-keys="selectedColumnKeys"
				:model-value="sale_summ.page_size"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="sale_summ.exporting"
				:column-options="columnOptions"
				class="max-lg:hidden"
				@update:model-value="salesSummStore.setPageSize"
				@export="exportSummary"
			/>

			<UCard class="overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
				<ZAnalyticsReportTable
					role="region" tabindex="0" :aria-label="t('portalMobile.reportTable')"
					:data="rows"
					:columns="visibleDailyColumns" :column-options="columnOptions" :primary-keys="['biz_date', 'status', 'net_amt', 'total_txns', 'total_qty']"
					:empty-title="t('pages.noSalesSummaryFound')" :loading="loading" :ui="{
						root: 'relative overflow-auto',
						base: 'min-w-[980px]',
						th: 'whitespace-nowrap',
						td: 'whitespace-nowrap',
						tfoot: 'bg-elevated/50 border-t border-default',
					}"
					@edit-filters="filtersOpen = true"
				>
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.REPORT_SALES" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noSalesSummaryFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</ZAnalyticsReportTable>
			</UCard>

			<div v-if="data.length > 0" class="section-pagination">
				<ZPagination :page="current_page" :items-per-page="sale_summ.page_size" :total="sale_summ.total_data" @update:page="salesSummStore.setPage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { options_page_size } from '~/utils/options';
import { mapSummBillsToTableRows } from '~/utils/summ-bill-table-rows';
import { getSummColumns, getSummColumnLabels } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import { ICONS } from '~/utils/icons';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';

const route = useRoute();
const { t } = useI18n();
useHead({ title: () => t('pages.saleSummaryTitle') });

const salesSummStore = useSummSaleStore();
const { sale_summ, filters, listFailure } = storeToRefs(salesSummStore);
const { filtersOpen, applyMobileFilters, setMobilePageSize } = useAnalyticsReportControls(sale_summ, salesSummStore.refreshListing);
const loading = computed(() => sale_summ.value.loading);

watch(listFailure, (failure) => {
	if (failure) failedNotification(failure.message);
});

onMounted(async () => {
	salesSummStore.hydrateFromQuery(route.query);
	await salesSummStore.refreshListing();
});

watch(
	() => ({ start: route.query.start_date, end: route.query.end_date, status: route.query.status }),
	() => {
		salesSummStore.hydrateFromQuery(route.query);
		void salesSummStore.refreshListing();
	},
	{ deep: true },
);

const data = computed(() => sale_summ.value.data);
const current_page = computed(() => sale_summ.value.current_page);

const saleSummColumns = computed(() => getSummColumns(t, 'total_txns'));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, getSummColumnLabels('total_txns')));
const { selectedColumnKeys, visibleColumns: visibleDailyColumns } = useTableColumnVisibility(saleSummColumns, columnOptions, {
	defaultHiddenKeys: ['currency_code', 'total_voided_qty'],
});

const rows = computed(() =>
	mapSummBillsToTableRows(data.value, {
		groupByStatus: !filters.value.status,
	}),
);

const exportSummary = async (scope: 'page' | 'matching' = 'page') => {
	const outcome = await salesSummStore.exportSummary(scope);
	if (outcome.status === 'completed') successNotification(t('summSale.notifications.exported'));
	else if (outcome.failure.kind === 'export_empty') failedNotification(t('summSale.notifications.exportFailed'));
	else failedNotification(outcome.failure.message);
};
</script>

<style scoped>
:deep(tfoot tr) {
	font-weight: 600;
}
</style>
