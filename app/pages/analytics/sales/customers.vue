<template>
	<ZPagePanel id="analytics-sales-customers" :title="t('pages.analyticsSalesCustomers')" back-to="/analytics/sales">
		<template #toolbar>
			<ZSectionFilterSaleSummCustomers />
		</template>

		<div class="space-y-6">
			<ZTableToolbar
				v-model="sale_summ_customer.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="sale_summ_customer.exporting"
				:column-options="columnOptions"
				@update:model-value="updatePageSize"
				@export="saleSummStore.exportSaleCustomerSummary"
			/>

			<UCard class="w-full overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
				<UTable :data="data" :columns="visibleColumns" :loading="loading" :ui="saleCustomerTableUi">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.REPORT_SALES" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noSalesCustomerSummaryFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<div v-if="data.length > 0" class="section-pagination">
				<UPagination v-model="current_page" :items-per-page="sale_summ_customer.page_size" :total="sale_summ_customer.total_data" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { getSummCustomerColumns, getSummCustomerColumnLabels } from '~/utils/table-columns';
import type { SummSaleCustomer } from '~/utils/types/summ-sales';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import { options_page_size } from '~/utils/options';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const summ_customer_columns = computed(() => getSummCustomerColumns<SummSaleCustomer>(t, 'sale'));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, getSummCustomerColumnLabels('sale')));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(summ_customer_columns, columnOptions);
useHead({ title: () => t('pages.saleCustomerSummary') });

onMounted(async () => {
	await saleSummStore.getSaleCustomerSummary();
});

const saleSummStore = useSummSaleStore();
const { sale_summ_customer, loading } = storeToRefs(saleSummStore);
const saleCustomerTableUi = {
	root: 'relative w-full overflow-auto',
	base: 'w-full',
	th: 'whitespace-nowrap',
	td: 'whitespace-nowrap',
	tfoot: 'bg-elevated/50 border-t border-default',
} as const;

const data = computed(() => sale_summ_customer.value.data);
const current_page = computed(() => sale_summ_customer.value.current_page);

const updatePage = async (page: number) => {
	sale_summ_customer.value.current_page = page;
	await saleSummStore.getSaleCustomerSummary();
};

const updatePageSize = async (size: number) => {
	sale_summ_customer.value.page_size = size;

	if (sale_summ_customer.value.page_size > sale_summ_customer.value.total_data) {
		sale_summ_customer.value.current_page = 1;
		return;
	}

	await saleSummStore.getSaleCustomerSummary();
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
