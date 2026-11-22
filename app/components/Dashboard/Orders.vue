<template>
	<div class="min-w-0">
		<UCard
			:ui="{
				header: 'bg-elevated/40 px-3 py-3 sm:px-6',
				body: 'p-0 sm:p-0',
			}"
		>
			<template #header>
				<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
					<h2 class="text-base font-semibold text-highlighted lg:text-lg">{{ t('nav.orders') }}</h2>
					<UCheckbox
						v-model="hideCompleted"
						:label="t('pages.hideCompletedOrders')"
						class="min-h-11 items-center self-start sm:self-auto"
						@update:model-value="onHideCompletedChange"
					/>
				</div>
			</template>

			<section class="lg:hidden" :aria-label="t('nav.orders')" :aria-busy="loading">
				<div v-if="loading" class="space-y-2 p-3" role="status">
					<span class="sr-only">{{ t('common.loading') }}</span>
					<USkeleton v-for="index in 4" :key="index" class="h-16 w-full" />
				</div>
				<UEmpty v-else-if="!orders.length" icon="i-heroicons-shopping-cart" :title="t('pages.noOrdersFound')" class="py-6" />
				<ul v-else class="divide-y divide-default border-t border-default">
					<li v-for="order in orders" :key="`${order.type}:${order.order_no}`">
						<ZRecordLink :to="orderPath(order)">
							<span class="flex flex-wrap items-center gap-1.5">
								<span class="text-sm font-semibold text-highlighted">#{{ order.order_no }}</span>
								<UBadge v-if="hasPreorder(order)" color="warning" variant="subtle" size="sm" class="whitespace-nowrap">
									{{ t('components.orderDetail.preorder') }}
								</UBadge>
							</span>
							<span v-if="customerLabel(order)" class="block text-sm text-muted">{{ customerLabel(order) }}</span>
							<span class="block text-xs text-muted">{{ order.order_date_time }}</span>
							<span class="mt-1 inline-flex items-center gap-1 text-xs text-muted">
								<UIcon :name="orderTypeIcon(order)" class="size-4 shrink-0 text-main" aria-hidden="true" />
								{{ orderTypeLabel(order) }}
							</span>
							<template #trailing>
								<UBadge :color="statusColor(order)" variant="subtle" class="whitespace-nowrap">
									{{ statusLabel(order) }}
								</UBadge>
								<span v-if="payableLabel(order)" class="text-sm font-medium tabular-nums whitespace-nowrap">
									{{ payableLabel(order) }}
								</span>
							</template>
						</ZRecordLink>
					</li>
				</ul>
			</section>

			<div class="hidden lg:block">
				<UTable :data="orders" :columns="order_columns" :loading="loading" @select="selectOrder">
					<template #empty>
						<div class="flex flex-col items-center justify-center gap-3 py-6">
							<span class="text-sm italic">{{ t('pages.noOrdersFound') }}</span>
						</div>
					</template>
				</UTable>
			</div>
		</UCard>
	</div>
</template>

<script lang="ts" setup>
import { useStorage } from '@vueuse/core';
import { formatCurrency, getOrderStatusColor, OrderItemStatus, OrderType } from 'yeppi-common';
import { getOrderColumns } from '~/utils/table-columns';
import { formatCustomerNameEmail } from '~/utils/format-customer-name-email';
import { getOrderStatusOption } from '~/utils/options/order-status';
import type { TableRow } from '@nuxt/ui';
import type { OrderHistory } from '~/utils/types/order-history';
import type { Range } from '~/utils/interface';

const HIDE_COMPLETED_STORAGE_KEY = 'wemotoo-dashboard-hide-completed-orders';

const props = defineProps<{
	range: Range;
}>();

const { t } = useI18n();
const order_columns = computed(() => getOrderColumns(t));

const orderStore = useOrderStore();
const { dashboardOrders: orders, dashboardLoading: loading } = storeToRefs(orderStore);

const hideCompleted = useStorage(HIDE_COMPLETED_STORAGE_KEY, false);

const fetchOrders = async () => {
	await orderStore.loadDashboard({ range: props.range, hideCompleted: hideCompleted.value });
};

const onHideCompletedChange = async (value: boolean | 'indeterminate') => {
	hideCompleted.value = value === true;
	await fetchOrders();
};

watch(
	() => [props.range?.start?.getTime(), props.range?.end?.getTime()],
	async () => {
		await fetchOrders();
	},
);

onMounted(async () => {
	await fetchOrders();
});

const orderPath = (order: OrderHistory) => `/orders/${encodeURIComponent(order.order_no)}?type=${order.type}`;

const hasPreorder = (order: OrderHistory) => (order.items ?? []).some((item) => !!item.is_preorder && item.status !== OrderItemStatus.VOIDED);

const customerLabel = (order: OrderHistory) => formatCustomerNameEmail(order.customer?.name, order.customer?.email_address);

const orderTypeLabel = (order: OrderHistory) =>
	(order.order_type ?? OrderType.PICKUP) === OrderType.DELIVERY
		? t('components.orderDetail.orderTypeDelivery')
		: t('components.orderDetail.orderTypePickup');

const orderTypeIcon = (order: OrderHistory) =>
	(order.order_type ?? OrderType.PICKUP) === OrderType.DELIVERY ? 'i-heroicons-truck' : 'i-heroicons-building-storefront';

const statusColor = (order: OrderHistory) => getOrderStatusColor(order.status) ?? 'neutral';

const statusLabel = (order: OrderHistory) => getOrderStatusOption(t, order.status)?.label ?? order.status;

const payableLabel = (order: OrderHistory) => {
	if (!order.currency?.code || order.payable_total == null) return '';
	return formatCurrency(order.payable_total, order.currency.code);
};

const selectOrder = (e: Event, row: TableRow<OrderHistory>) => {
	const order = row.original;
	if (!order) return;

	navigateTo(orderPath(order));
};
</script>
