<template>
	<ZPagePanel id="orders" :title="t('nav.orders')">
		<template #toolbar>
			<ZSectionFilterOrders />
		</template>

		<div class="space-y-6">
			<!-- Table Controls -->
			<div class="flex flex-col sm:flex-row sm:items-center justify-end sm:justify-between gap-4">
				<ZSectionFilterStatuses
					v-model="selectedStatuses"
					:items="statusItems"
					:get-color="getOrderStatusColor"
					:placeholder="t('components.selectMenu.selectOrderStatus')"
					class="w-full sm:w-72"
				/>

				<!-- Table Actions -->
				<ZTableToolbar
					:model-value="pageSize"
					v-model:selected-column-keys="selectedColumnKeys"
					:page-size-options="options_page_size"
					:export-enabled="true"
					:exporting="exporting"
					:column-options="columnOptions"
					@update:model-value="orderStore.setPageSize"
					@export="exportOrders"
				/>
			</div>

			<template v-if="loading">
				<div class="rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
					<div class="grid grid-cols-4 gap-4 p-4">
						<USkeleton v-for="i in 4" :key="i" class="h-4 flex-1 min-w-0" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-4 gap-4 p-4 items-center">
						<USkeleton v-for="j in 4" :key="j" class="h-4 flex-1 min-w-0" />
					</div>
				</div>
			</template>

			<!-- Orders Table -->
			<UCard :ui="{ body: 'p-0 sm:p-0' }">
				<UTable v-if="!initialize && !loading" v-model:sorting="sorting" :data="orders" :columns="visibleColumns" @select="selectOrder">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon name="i-heroicons-shopping-cart" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noOrdersFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<!-- Pagination -->
			<div
				v-if="!initialize && !loading && orders.length > 0"
				class="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3"
			>
				<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
					<div class="text-sm text-gray-700 dark:text-gray-300">
						{{
							t('pages.showingToOf', {
								from: (page - 1) * pageSize + 1,
								to: Math.min(page * pageSize, total),
								total,
							})
						}}
					</div>
					<UPagination
						:page="page"
						:total="total"
						:page-size="pageSize"
						show-last
						show-first
						size="sm"
						@update:page="orderStore.setPage"
					/>
				</div>
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { OrderStatus } from 'yeppi-common';
import { getOrderStatusColor, getOrderStatusOptions, options_page_size } from '~/utils/options';
import { getOrderColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { TableRow } from '@nuxt/ui';
import type { SortingState } from '@tanstack/vue-table';
import type { OrderExportOptions } from '~/utils/order-export';
import type { OrderHistory } from '~/utils/types/order-history';
import { ZModalLoading } from '#components';
import ZModalOrderExport from '~/components/Z/Modal/Order/Export.vue';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';

const sorting = ref<SortingState>([]);

const route = useRoute();
const ORDER_COLUMN_LABELS = {
	index: 'table.no',
	order_no: 'table.orderNo',
	order_type: 'table.type',
	customer: 'table.customer',
	status: 'table.status',
	gross_amt: 'table.grossAmt',
	tax_amt_exc: 'table.taxAmtExc',
	net_amt: 'table.netAmt',
	shipping_fee: 'components.fulfillment.shippingFee',
	payable_total: 'table.totalAmt',
} as const;

const { t } = useI18n();
const order_columns = computed(() => getOrderColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, ORDER_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(order_columns, columnOptions);
useHead({ title: () => t('pages.ordersTitle') });

const orderStore = useOrderStore();
const { orders, filters, loading, exporting, page, pageSize, total, listFailure } = storeToRefs(orderStore);
const overlay = useOverlay();
const loadingModal = overlay.create(ZModalLoading, {
	props: { key: 'orders-export-loading' },
});

watch(exporting, (value) => {
	if (value) {
		loadingModal.open();
	} else {
		loadingModal.close();
	}
});

watch(orders, () => {
	sorting.value = [];
});

watch(listFailure, (failure) => {
	if (failure) failedNotification(failure.message);
});

const statusItems = computed(() => getOrderStatusOptions(t).filter((option) => option.value !== 'All'));

const selectedStatuses = computed({
	get() {
		return filters.value.statuses as string[];
	},
	set(value: string[]) {
		orderStore.setStatuses(value as OrderStatus[]);
	},
});

const initialize = ref(true);

onMounted(async () => {
	orderStore.hydrateFromQuery(route.query);
	initialize.value = true;
	try {
		await orderStore.refreshListing();
	} finally {
		initialize.value = false;
	}
});

onBeforeUnmount(() => orderStore.dispose());

const exportOrders = () => {
	const exportModal = overlay.create(ZModalOrderExport, {
		props: {
			onConfirm: async (options: OrderExportOptions) => {
				exportModal.close();
				const outcome = await orderStore.exportOrders(options);
				if (outcome.status === 'completed') successNotification(t('orderHistory.notifications.exported'));
				else if (outcome.failure.kind === 'export_empty') failedNotification(t('orderHistory.notifications.exportFailed'));
				else failedNotification(outcome.failure.message);
			},
			onCancel: () => {
				exportModal.close();
			},
		},
	});

	exportModal.open();
};

const selectOrder = async (e: Event, row: TableRow<OrderHistory>) => {
	const order = row.original;
	if (!order) return;

	navigateTo(`/orders/${encodeURIComponent(order.order_no)}?type=${order.type}`);
};
</script>

<style scoped></style>
