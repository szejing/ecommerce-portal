<template>
	<ZPagePanel id="analytics-sales-payments" :title="t('pages.analyticsSalesPayments')" back-to="/analytics/sales">
		<template #toolbar>
			<ZSectionFilterSaleSummPayments />
		</template>

		<div class="space-y-6">
			<ZTableToolbar
				v-model="sale_summ_payments.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="sale_summ_payments.exporting"
				:column-options="columnOptions"
				@update:model-value="updatePageSize"
				@export="salesSummStore.exportSalePaymentSummary"
			/>

			<UCard
				v-if="groupedByDate.length === 0"
				class="overflow-hidden"
				:ui="{
					header: 'bg-elevated/40 px-4 py-3 sm:px-6',
					body: 'p-0 sm:p-0',
				}"
			>
				<UTable :data="[]" :columns="visibleColumns" :loading="loading" :ui="salesPaymentTableUi">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.REPORT_SALES" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noSalesPaymentSummaryFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<UCard
				v-for="group in groupedByDate"
				:key="group.date"
				class="overflow-hidden"
				:ui="{
					header: 'bg-elevated/40 px-4 py-3 sm:px-6',
					body: 'p-0 sm:p-0',
				}"
			>
				<template #header>
					<ZAnalyticsItemDateSummary
						:date="group.date"
						:primary-count="group.total_txns"
						:primary-stat-label="t('table.totalTransactions')"
						:active-qty="group.active_qty"
						:voided-qty="group.voided_qty"
						:net-amt="group.net_amt"
						:currency-code="group.currency_code"
					/>
				</template>

				<UTable :data="group.items" :columns="visibleColumns" :loading="loading" :ui="salesPaymentTableUi" />
			</UCard>

			<div v-if="data.length > 0" class="section-pagination">
				<UPagination v-model="current_page" :items-per-page="sale_summ_payments.page_size" :total="sale_summ_payments.total_data" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { OrderStatus } from 'yeppi-common';
import { getSummPaymentColumns, SUMM_PAYMENT_COLUMN_LABELS } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import { options_page_size } from '~/utils/options';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const summ_payment_columns = computed(() => getSummPaymentColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, SUMM_PAYMENT_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(summ_payment_columns, columnOptions);
useHead({ title: () => t('pages.salePaymentSummary') });

onMounted(async () => {
	await salesSummStore.getSalePaymentSummary();
});

const salesSummStore = useSummSaleStore();
const { sale_summ_payments, loading } = storeToRefs(salesSummStore);
const salesPaymentTableUi = {
	root: 'relative w-full overflow-auto',
	base: 'w-full',
	th: 'whitespace-nowrap',
	td: 'whitespace-nowrap',
	tfoot: 'bg-elevated/50 border-t border-default',
} as const;

const data = computed(() => sale_summ_payments.value.data);
const current_page = computed({
	get: () => sale_summ_payments.value.current_page,
	set: (page: number) => {
		sale_summ_payments.value.current_page = page;
	},
});

const groupedByDate = computed(() => {
	const grouped: { [key: string]: (typeof data.value)[0][] } = {};

	data.value.forEach((item) => {
		const date = new Date(item.biz_date).toISOString().split('T')[0] as string;
		if (!grouped[date]) {
			grouped[date] = [];
		}
		grouped[date].push(item);
	});

	return Object.entries(grouped).map(([date, items]) => {
		const totals = items.reduce(
			(acc, item) => {
				acc.total_txns += item.total_txns;
				acc.net_amt += item.payment_amt;
				acc.currency_code = item.currency_code;

				if (item.status === OrderStatus.REFUNDED) {
					acc.voided_qty += item.total_txns;
				} else {
					acc.active_qty += item.total_txns;
				}

				return acc;
			},
			{ total_txns: 0, net_amt: 0, voided_qty: 0, active_qty: 0, currency_code: 'MYR' },
		);

		return {
			date,
			items,
			...totals,
		};
	});
});

const updatePage = async (page: number) => {
	sale_summ_payments.value.current_page = page;
	await salesSummStore.getSalePaymentSummary();
};

const updatePageSize = async (size: number) => {
	sale_summ_payments.value.page_size = size;

	if (sale_summ_payments.value.page_size > sale_summ_payments.value.total_data) {
		sale_summ_payments.value.current_page = 1;
		return;
	}

	await salesSummStore.getSalePaymentSummary();
};
</script>

<style scoped>
/* `tr:last-child` would wrongly match the last tbody row; footer lives in tfoot */
:deep(tfoot tr) {
	background-color: rgb(249 250 251);
	border-top: 2px solid rgb(209 213 219);
}

:deep(table) {
	table-layout: fixed;
	width: 100%;
}

:deep(th:nth-child(1)),
:deep(td:nth-child(1)) {
	width: 35%;
}

:deep(th:nth-child(2)),
:deep(td:nth-child(2)) {
	width: 20%;
}

:deep(th:nth-child(3)),
:deep(td:nth-child(3)) {
	width: 22.5%;
}

:deep(th:nth-child(4)),
:deep(td:nth-child(4)) {
	width: 22.5%;
}
</style>
