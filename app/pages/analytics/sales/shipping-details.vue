<template>
	<ZPagePanel id="analytics-sales-shipping-details" :title="t('pages.analyticsSalesShippingDetails')" back-to="/analytics/sales">
		<template #toolbar>
			<ZSectionFilterSaleSummShipping mode="details" />
		</template>

		<div class="space-y-6">
			<ZTableToolbar
				:model-value="sale_summ_shipping.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="sale_summ_shipping.exporting"
				:column-options="columnOptions"
				@update:model-value="(size) => saleSummStore.setShippingPageSize(size, 'details')"
				@export="exportDetails"
			/>

			<UCard class="w-full overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
				<UTable
					:data="sale_summ_shipping.details"
					:columns="visibleColumns"
					:loading="sale_summ_shipping.loading"
					:ui="shippingDetailsTableUi"
				>
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.REPORT_SALES" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noSalesShippingDetailsFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<div v-if="sale_summ_shipping.details.length > 0" class="section-pagination">
				<UPagination
					:page="sale_summ_shipping.current_page"
					:items-per-page="sale_summ_shipping.page_size"
					:total="sale_summ_shipping.total_data"
					@update:page="(page) => saleSummStore.setShippingPage(page, 'details')"
				/>
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { options_page_size } from '~/utils/options';
import { getSummShippingDetailColumns, SUMM_SHIPPING_DETAIL_COLUMN_LABELS } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import { ICONS } from '~/utils/icons';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';

const { t } = useI18n();
useHead({ title: () => t('pages.salesShippingDetailsTitle') });

const saleSummStore = useSummSaleStore();
const { sale_summ_shipping, listFailure } = storeToRefs(saleSummStore);

const shippingDetailsTableUi = {
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
	await saleSummStore.refreshShippingDetailsListing();
});

const detailColumns = computed(() => getSummShippingDetailColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, SUMM_SHIPPING_DETAIL_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(detailColumns, columnOptions, {
	defaultHiddenKeys: [],
});

const exportDetails = async () => {
	const outcome = await saleSummStore.exportShippingDetails();
	if (outcome.status === 'completed') successNotification(t('summSale.notifications.shippingDetailsExported'));
	else if (outcome.failure.kind === 'export_empty') failedNotification(t('summSale.notifications.shippingDetailsExportFailed'));
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
