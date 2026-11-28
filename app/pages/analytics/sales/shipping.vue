<template>
	<ZPagePanel id="analytics-sales-shipping" desktop-toolbar :title="t('pages.analyticsSalesShipping')" back-to="/analytics/sales">
		<template #toolbar>
			<ZSectionFilterSaleSummShipping mode="summary" />
		</template>

		<div class="min-w-0 space-y-3 lg:space-y-6">
			<ZAnalyticsReportMobileControls
				v-model:filters-open="filtersOpen"
				v-model:selected-column-keys="selectedColumnKeys"
				:filters="sale_summ_shipping.filter"
				:fields="[]"
				:page-size="sale_summ_shipping.page_size"
				:column-options="columnOptions"
				:loading="sale_summ_shipping.loading"
				:exporting="sale_summ_shipping.exporting"
				:total="sale_summ_shipping.total_data"
				@apply-filters="applyMobileFilters"
				@update:page-size="setMobilePageSize"
				@export="exportSummary"
			/>
			<ZTableToolbar
				v-model:selected-column-keys="selectedColumnKeys"
				:model-value="sale_summ_shipping.page_size"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="sale_summ_shipping.exporting"
				:column-options="columnOptions"
				class="max-lg:hidden"
				@update:model-value="(size) => saleSummStore.setShippingPageSize(size, 'summary')"
				@export="exportSummary"
			/>

			<UCard class="w-full overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
				<ZAnalyticsReportTable
					role="region" tabindex="0" :aria-label="t('portalMobile.reportTable')"
					:data="sale_summ_shipping.data"
					:columns="visibleColumns" :column-options="columnOptions" :primary-keys="['biz_date', 'shipping_fee', 'integrator_charge', 'net_amt', 'total_txns']"
					:empty-title="t('pages.noSalesShippingFound')" :loading="sale_summ_shipping.loading" :ui="shippingTableUi"
					@edit-filters="filtersOpen = true"
				>
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.REPORT_SALES" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noSalesShippingFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</ZAnalyticsReportTable>
			</UCard>

			<div v-if="sale_summ_shipping.data.length > 0" class="section-pagination">
				<ZPagination
					:page="sale_summ_shipping.current_page"
					:items-per-page="sale_summ_shipping.page_size"
					:total="sale_summ_shipping.total_data"
					@update:page="(page) => saleSummStore.setShippingPage(page, 'summary')"
				/>
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { options_page_size } from '~/utils/options';
import { getSummShippingColumns, SUMM_SHIPPING_COLUMN_LABELS } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import { ICONS } from '~/utils/icons';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';

const { t } = useI18n();
useHead({ title: () => t('pages.salesShippingTitle') });

const saleSummStore = useSummSaleStore();
const { sale_summ_shipping, listFailure } = storeToRefs(saleSummStore);
const { filtersOpen, applyMobileFilters, setMobilePageSize } = useAnalyticsReportControls(sale_summ_shipping, saleSummStore.refreshShippingListing);

const shippingTableUi = {
	root: 'relative w-full overflow-auto',
	base: 'w-full',
	th: 'whitespace-nowrap',
	td: 'whitespace-nowrap',
	tfoot: 'bg-elevated/50 border-t border-default',
} as const;

watch(listFailure, (failure) => {
	if (failure) failedNotification(failure.message);
});

onMounted(async () => {
	await saleSummStore.refreshShippingListing();
});

const shippingColumns = computed(() => getSummShippingColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, SUMM_SHIPPING_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(shippingColumns, columnOptions, {
	defaultHiddenKeys: ['currency_code'],
});

const exportSummary = async () => {
	const outcome = await saleSummStore.exportShippingSummary();
	if (outcome.status === 'completed') successNotification(t('summSale.notifications.shippingExported'));
	else if (outcome.failure.kind === 'export_empty') failedNotification(t('summSale.notifications.shippingExportFailed'));
	else failedNotification(outcome.failure.message);
};
</script>

<style scoped>
:deep(tfoot tr) {
	font-weight: 600;
}

:deep(table) {
	width: 100%;
}
</style>
