<template>
	<ZPagePanel id="analytics-orders-customers" :title="t('pages.analyticsOrdersCustomers')" back-to="/analytics/orders">
		<template #toolbar>
			<ZSectionFilterOrderSummCustomers />
		</template>

		<div class="space-y-6">
			<ZTableToolbar
				v-model="order_summ_customer.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="order_summ_customer.exporting"
				:column-options="columnOptions"
				@update:model-value="updatePageSize"
				@export="exportOrderCustomerSummaryToCsv"
			/>

			<UCard class="w-full overflow-hidden" :ui="{ body: 'p-0 sm:p-0' }">
				<UTable :data="data" :columns="visibleColumns" :loading="is_loading" :ui="orderCustomerTableUi">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.REPORT_ORDER" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noDataFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<div v-if="data.length > 0" class="section-pagination">
				<UPagination v-model="current_page" :items-per-page="order_summ_customer.page_size" :total="order_summ_customer.total_data" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { getSummCustomerColumns, getSummCustomerColumnLabels } from '~/utils/table-columns';
import type { SummOrderCustomer } from '~/utils/types/summ-orders';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import { options_page_size } from '~/utils/options';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const summ_customer_columns = computed(() => getSummCustomerColumns<SummOrderCustomer>(t, 'order'));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, getSummCustomerColumnLabels('order')));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(summ_customer_columns, columnOptions);
useHead({ title: () => t('pages.orderCustomerSummary') });

onMounted(async () => {
	await orderSummStore.getOrderCustomerSummary();
});

const orderSummStore = useSummOrderStore();
const { order_summ_customer } = storeToRefs(orderSummStore);
const orderCustomerTableUi = {
	root: 'relative w-full overflow-auto',
	base: 'w-full',
	th: 'whitespace-nowrap',
	td: 'whitespace-nowrap',
	tfoot: 'bg-elevated/50 border-t border-default',
} as const;

const is_loading = computed(() => order_summ_customer.value.loading);
const data = computed(() => order_summ_customer.value.data);
const current_page = computed(() => order_summ_customer.value.current_page);

const updatePage = async (page: number) => {
	order_summ_customer.value.current_page = page;
	await orderSummStore.getOrderCustomerSummary();
};

const updatePageSize = async (size: number) => {
	await orderSummStore.updateOrderCustomerSummPageSize(size);
};

const exportOrderCustomerSummaryToCsv = async () => {
	await orderSummStore.exportOrderCustomerSummary();
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
