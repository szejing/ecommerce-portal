<template>
	<ZPagePanel id="orders" inline-mobile-actions :title="t('nav.orders')">
		<template #navbar-right>
			<ZCreateButton class="hidden lg:flex" to="/orders/create" :label="t('pages.newSale')" color="success" />
			<UButton
				to="/orders/create"
				color="success"
				:label="t('productMobileListing.add')"
				:aria-label="t('pages.newSale')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
			/>
		</template>
		<template #toolbar>
			<ZSectionFilterOrders />
		</template>

		<div class="space-y-4">
			<ZTableToolbar
				v-model:selected-column-keys="selectedColumnKeys"
				class="hidden lg:flex"
				:model-value="pageSize"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="orderStore.setPageSize"
				@export="exportOrders"
			/>

			<UButton
				:label="t('common.export')"
				:loading="exporting"
				variant="ghost"
				color="neutral"
				icon="i-heroicons-arrow-down-tray"
				class="min-h-11 lg:hidden"
				@click="exportOrders"
			/>

			<template v-if="initialize || loading">
				<div class="rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
					<div class="grid grid-cols-4 gap-4 p-4">
						<USkeleton v-for="i in 4" :key="i" class="h-4 flex-1 min-w-0" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-4 gap-4 p-4 items-center">
						<USkeleton v-for="j in 4" :key="j" class="h-4 flex-1 min-w-0" />
					</div>
				</div>
			</template>

			<section v-else ref="mobileContent" class="lg:hidden" :aria-label="t('nav.orders')">
				<UEmpty v-if="!orders.length" icon="i-heroicons-shopping-cart" :title="t('pages.noOrdersFound')" :description="t('pages.tryAdjustingFilters')" />
				<ul v-else class="divide-y divide-default border-y border-default">
					<li v-for="order in orders" :key="`${order.type}:${order.order_no}`">
						<ZRecordLink :to="orderPath(order)">
							<span class="block text-sm font-semibold text-highlighted">#{{ order.order_no }}</span>
							<span v-if="order.customer?.name || order.customer?.email_address" class="block text-sm text-muted">
								{{ formatCustomerNameEmail(order.customer?.name, order.customer?.email_address) }}
							</span>
							<span class="block text-xs text-muted">{{ order.order_date_time }}</span>
							<template #trailing>
								<UBadge :color="getOrderStatusColor(order.status)" variant="subtle" class="whitespace-normal">
									{{ getOrderStatusOption(t, order.status)?.label ?? order.status }}
								</UBadge>
								<span v-if="order.currency?.code && order.payable_total != null" class="text-sm font-medium tabular-nums">
									{{ formatCurrency(order.payable_total, order.currency.code) }}
								</span>
							</template>
						</ZRecordLink>
					</li>
				</ul>
			</section>

			<!-- Orders Table -->
			<UCard class="hidden lg:block" :ui="{ body: 'p-0 sm:p-0' }">
				<UTable
					v-if="!initialize && !loading"
					v-model:sorting="sorting"
					:data="orders"
					:columns="visibleColumns"
					:ui="{ th: 'whitespace-nowrap' }"
					@select="selectOrder"
				>
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
				v-if="!initialize && !loading && (orders.length > 0 || page > 1)"
				class="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3"
			>
				<div class="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
					<div v-if="orders.length" class="text-sm text-gray-700 dark:text-gray-300">
						{{
							t('pages.showingToOf', {
								from: (page - 1) * pageSize + 1,
								to: Math.min(page * pageSize, total),
								total,
							})
						}}
					</div>
					<ZPagination :page="page" :total="total" :items-per-page="pageSize" size="sm" @update:page="orderStore.setPage" />
				</div>
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { formatCurrency, getOrderStatusColor } from 'yeppi-common';
import { options_page_size, getOrderStatusOption } from '~/utils/options';
import { formatCustomerNameEmail } from '~/utils/format-customer-name-email';
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
const { orders, loading, exporting, page, pageSize, total, listFailure } = storeToRefs(orderStore);
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

const initialize = ref(true);

const mobileContent = useTemplateRef('mobileContent');
const restoreMobileScroll = useMobileListScroll(
	'orders-listing-mobile-scroll',
	mobileContent,
	path => orders.value.some(order => orderPath(order).split('?')[0] === path),
);

onMounted(async () => {
	orderStore.hydrateFromQuery(route.query);
	initialize.value = true;
	try {
		await orderStore.refreshListing();
	} finally {
		initialize.value = false;
		await restoreMobileScroll();
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

const orderPath = (order: OrderHistory) => `/orders/${encodeURIComponent(order.order_no)}?type=${order.type}`;

const selectOrder = async (e: Event, row: TableRow<OrderHistory>) => {
	const order = row.original;
	if (!order) return;

	navigateTo(orderPath(order));
};
</script>

<style scoped></style>
