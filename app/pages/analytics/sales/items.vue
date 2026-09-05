<template>
	<ZPagePanel id="analytics-sales-items" :title="t('pages.analyticsSalesItems')" back-to="/analytics/sales">
		<template #toolbar>
			<ZSectionFilterSaleSummItems />
		</template>

		<div class="space-y-6">
			<ZTableToolbar
				v-model="sale_summ_items.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="sale_summ_items.exporting"
				:column-options="columnOptions"
				@update:model-value="updatePageSize"
				@export="salesSummStore.exportSaleItemSummary"
			/>

			<UCard
				v-if="groupedByDate.length === 0"
				class="overflow-hidden"
				:ui="{
					header: 'bg-elevated/40 px-4 py-3 sm:px-6',
					body: 'p-0 sm:p-0',
				}"
			>
				<UTable :data="[]" :columns="visibleColumns" :loading="loading" :ui="salesItemTableUi">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.REPORT_SALES" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noSalesItemSummaryFound') }}</p>
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

				<UTable :data="group.items" :columns="visibleColumns" :loading="loading" :ui="salesItemTableUi" />
			</UCard>

			<div v-if="data.length > 0" class="section-pagination">
				<UPagination v-model="current_page" :items-per-page="sale_summ_items.page_size" :total="sale_summ_items.total_data" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { OrderItemStatus } from 'yeppi-common';
import { getSummItemColumns, getSummItemColumnLabels } from '~/utils/table-columns';
import type { SummSaleItem } from '~/utils/types/summ-sales';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import { options_page_size } from '~/utils/options';
import { ICONS } from '~/utils/icons';

const route = useRoute();
const { t } = useI18n();
const summ_item_columns = computed(() => getSummItemColumns<SummSaleItem>(t, 'total_txns'));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, getSummItemColumnLabels('total_txns')));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(summ_item_columns, columnOptions);
useHead({ title: () => t('pages.saleItemSummary') });

const salesSummStore = useSummSaleStore();
const { sale_summ_items, loading } = storeToRefs(salesSummStore);
const salesItemTableUi = {
	root: 'relative overflow-auto',
	base: 'min-w-[1180px]',
	th: 'whitespace-nowrap',
	td: 'whitespace-nowrap',
	tfoot: 'bg-elevated/50 border-t border-default',
} as const;

function applyQueryToFilter() {
	const start = route.query.start_date;
	const end = route.query.end_date;
	if (typeof start === 'string' && start) {
		const d = new Date(start);
		if (!Number.isNaN(d.getTime())) {
			salesSummStore.sale_summ_items.filter.date_range.start = d;
		}
	}
	if (typeof end === 'string' && end) {
		const d = new Date(end);
		if (!Number.isNaN(d.getTime())) {
			salesSummStore.sale_summ_items.filter.date_range.end = d;
		}
	}
}

onMounted(async () => {
	applyQueryToFilter();
	await salesSummStore.getSaleItemSummary();
});

watch(
	() => route.query.start_date && route.query.end_date,
	() => {
		applyQueryToFilter();
		salesSummStore.getSaleItemSummary();
	},
);
const data = computed(() => sale_summ_items.value.data);
const current_page = computed({
	get: () => sale_summ_items.value.current_page,
	set: (page: number) => {
		sale_summ_items.value.current_page = page;
	},
});

// Group data by date
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
				acc.total_qty += item.total_qty;
				acc.gross_amt += item.gross_amt;
				acc.net_amt += item.net_amt;
				acc.currency_code = item.currency_code;

				// Separate voided and non-voided quantities
				if (item.item_status === OrderItemStatus.VOIDED) {
					acc.voided_qty += item.total_qty;
				} else {
					acc.active_qty += item.total_qty;
				}
				return acc;
			},
			{ total_txns: 0, total_qty: 0, gross_amt: 0, net_amt: 0, voided_qty: 0, active_qty: 0, currency_code: 'MYR' },
		);

		return {
			date,
			items,
			...totals,
		};
	});
});

// const updateColumns = (columns: { key: string; label: string }[]) => {
// 	selectedColumns.value = columns;
// };

const updatePage = async (page: number) => {
	sale_summ_items.value.current_page = page;
	await salesSummStore.getSaleItemSummary();
};

const updatePageSize = async (size: number) => {
	sale_summ_items.value.page_size = size;

	if (sale_summ_items.value.page_size > sale_summ_items.value.total_data) {
		sale_summ_items.value.current_page = 1;
		return;
	}

	await salesSummStore.getSaleItemSummary();
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
}

:deep(th:nth-child(1)),
:deep(td:nth-child(1)) {
	width: 30%;
}

:deep(th:nth-child(2)),
:deep(td:nth-child(2)) {
	width: 18%;
}

:deep(th:nth-child(3)),
:deep(td:nth-child(3)) {
	width: 17%;
}

:deep(th:nth-child(4)),
:deep(td:nth-child(4)) {
	width: 17%;
}

:deep(th:nth-child(5)),
:deep(td:nth-child(5)) {
	width: 18%;
}
</style>
