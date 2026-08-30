<template>
	<ZPagePanel id="orders-detail" :title="t('pages.orderDetail')" back-to="/orders" class="pb-24 sm:pb-0">
		<ZLoading v-if="loading" />
		<div v-else-if="order_not_found" class="order-not-found">
			<UIcon name="i-heroicons-magnifying-glass-circle" class="order-not-found-icon" />
			<p class="order-not-found-text">{{ t('pages.orderNotFound', { orderNo: order_no_param }) }}</p>
			<UButton color="primary" variant="soft" :to="'/orders'">{{ t('nav.orders') }}</UButton>
		</div>
		<div v-else class="order-detail-container pb-[calc(5.5rem+env(safe-area-inset-bottom,0))] lg:pb-0">
			<!-- Header Section -->
			<div class="order-header">
				<div class="order-header-left">
					<div class="order-header-title">
						<h1 class="order-number">{{ record?.order_no }}</h1>
					</div>
					<div class="flex flex-col">
						<div v-if="record?.order_date_time" class="metadata-item">
							<UIcon :name="ICONS.CALENDAR" class="w-4 h-4 text-main" />
							<p>{{ record?.order_date_time }}</p>
						</div>
						<div v-if="display_invoice_no" class="metadata-item">
							<p class="text-base text-neutral-400 italic">{{ display_invoice_no }}</p>
						</div>
						<div v-if="record?.ref_no" class="metadata-item">
							<p>{{ t('components.orderDetail.refLabel') }}: {{ record?.ref_no }}</p>
						</div>
						<div v-if="record" class="metadata-item fulfillment-meta mt-2">
							<UIcon
								:name="(record?.order_type ?? OrderType.PICKUP) === OrderType.DELIVERY ? 'i-heroicons-truck' : 'i-heroicons-building-storefront'"
								class="w-4 h-4 shrink-0 text-main"
							/>
							<div class="flex flex-wrap items-center gap-1.5">
								<UBadge color="primary" variant="subtle" size="md">
									{{ order_fulfillment_method_label }}
								</UBadge>
							</div>
						</div>
					</div>
				</div>
				<div class="order-header-right">
					<UButton
						color="primary"
						:icon="ICONS.SYNC_ROUNDED"
						variant="ghost"
						:disabled="refreshing || refreshCooldown > 0"
						:loading="refreshing"
						:class="{ 'spin-icon': refreshing }"
						:aria-label="t('components.orderDetail.refresh')"
						@click="refreshOrder"
					>
						{{ refresh_button_text }}
					</UButton>
				</div>
				<OrderWorkbenchStatusSummary v-if="orderForModal" :order="orderForModal" class="order-header-states" />
				<p v-if="order?.last_updated" class="status-last-updated" :title="t('table.lastUpdated')">
					{{ order.last_updated }}
				</p>
			</div>

			<!-- Main Grid Layout -->
			<div class="wrapper-grid">
				<div class="main-wrapper">
					<UAlert
						v-if="record?.remarks"
						data-testid="order-attention"
						color="warning"
						variant="subtle"
						icon="i-heroicons-chat-bubble-left-ellipsis"
						:title="t('components.orderDetail.remarks')"
						:description="record.remarks"
					/>

					<!-- Order Items -->
					<ZSectionOrderDetailItems v-if="orderForModal" :order="orderForModal" @refresh="onItemsRefresh" />

					<!-- Customer Detail -->
					<ZSectionOrderDetailCustomer
						:customer="record?.customer"
						:show-addresses="(record?.order_type ?? OrderType.PICKUP) === OrderType.DELIVERY"
						:order-no="record?.order_no"
						@refresh="refreshOrder"
					/>

					<Activities :activities="activityLogEntries" />
				</div>

				<!-- Sidebar (desktop) -->
				<div v-if="record !== undefined && isLgUp" class="side-wrapper">
					<div class="sticky-sidebar">
						<ZSectionOrderDetailPayment :order="orderForModal" @refresh="refreshOrder" />

						<FulfillmentBatchList
							v-if="orderForModal && (record?.order_type ?? OrderType.PICKUP) === OrderType.DELIVERY"
							:order="orderForModal"
							:owner-type="ownerType"
							@refresh="getOrderDetails"
						/>

						<ZSectionOrderDetailOrderStatus
							v-model:status="new_order_status"
							:current-status="order?.status"
							:updating="updating"
							@submit="handleUpdateOrderStatus"
						/>

						<ZSectionOrderDetailCustomerEmail
							v-if="resend_email_action"
							:description="resend_email_description"
							:resend-email-label="can_resend_status_email ? resend_email_label : undefined"
							:customer-email-address="resend_email_customer_address"
							:button-text="resend_email_button_text"
							:disabled="!can_resend_status_email"
							:loading="is_resending_email"
							@resend="handleResendCurrentStatusEmail"
						/>
					</div>
				</div>
			</div>

			<!-- Mobile: sticky processing summary and order actions drawer -->
			<div
				v-if="record !== undefined && !isLgUp"
				class="mobile-actions-bar fixed inset-x-0 bottom-0 z-40 border-t border-default bg-default/95 px-4 pt-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
			>
				<UDrawer v-model:open="isOrderActionsOpen" :title="t('components.orderDetail.orderActionsTitle')" direction="bottom">
					<div class="mobile-actions-trigger-layout">
						<OrderWorkbenchStatusSummary v-if="orderForModal" :order="orderForModal" compact :show-order="false" />
						<UButton color="primary" :icon="ICONS.SETTINGS_ROUNDED" class="mobile-actions-open-trigger min-h-11" @click="isOrderActionsOpen = true">
							{{ t('components.orderDetail.processOrder') }}
						</UButton>
					</div>
					<template #body>
						<div class="mobile-actions-drawer-body max-h-[min(82dvh,48rem)] space-y-4 overflow-y-auto overscroll-contain px-0.5 pb-4">
							<ZSectionOrderDetailPayment :order="orderForModal" @refresh="refreshOrder" />

							<FulfillmentBatchList
								v-if="orderForModal && (record?.order_type ?? OrderType.PICKUP) === OrderType.DELIVERY"
								:order="orderForModal"
								:owner-type="ownerType"
								@refresh="getOrderDetails"
							/>

							<ZSectionOrderDetailOrderStatus
								v-model:status="new_order_status"
								:current-status="order?.status"
								:updating="updating"
								@submit="handleUpdateOrderStatus"
							/>

							<ZSectionOrderDetailCustomerEmail
								v-if="resend_email_action"
								:description="resend_email_description"
								:resend-email-label="can_resend_status_email ? resend_email_label : undefined"
								:customer-email-address="resend_email_customer_address"
								:button-text="resend_email_button_text"
								:disabled="!can_resend_status_email"
								:loading="is_resending_email"
								@resend="handleResendCurrentStatusEmail"
							/>
						</div>
					</template>
				</UDrawer>
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalConfirmation } from '#components';
import { OrderResendEmailAction, OrderStatus, OrderType } from 'yeppi-common';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';
import { ICONS } from '~/utils/icons';
import type { OrderHistory } from '~/utils/types/order-history';
import { resolveOrderResendEmailAction } from '~/utils/resolve-order-resend-email-action';
import { getFulfillmentMethodDescriptions } from '~/utils/fulfillment';
import Activities from '~/components/ActivityLog/Activities.vue';
import { useMediaQuery } from '@vueuse/core';

const orderStore = useOrderStore();
const { current: order, notFound: order_not_found, sessionLoading, updating, resendingEmail, refreshing, refreshCooldown } = storeToRefs(orderStore);

const loading = computed(() => sessionLoading.value);

const route = useRoute();
const isLgUp = useMediaQuery('(min-width: 1024px)');
const isOrderActionsOpen = ref(false);

watch(isLgUp, (lg) => {
	if (lg) {
		isOrderActionsOpen.value = false;
	}
});
const order_no_param = computed(() => String(route.params.order_no ?? ''));
const type = computed(() => String(route.query.type ?? ''));
const ownerType = computed<'order' | 'sale'>(() => (type.value === 'sale' ? 'sale' : 'order'));

const record = computed(() => order.value);

/** Invoice Number is Sale-only; Order placeholder equals order_no and must not show. */
const display_invoice_no = computed(() => {
	const current = record.value;
	if (!current?.inv_no || current.type !== 'sale') {
		return undefined;
	}
	if (current.inv_no === current.order_no) {
		return undefined;
	}
	return current.inv_no;
});

const activityLogEntries = computed(() => {
	if (record.value?.activities?.length) {
		return record.value.activities;
	}
	return record.value?.logs;
});

/** Shipping method name when present; otherwise delivery vs pickup label */
const order_fulfillment_method_label = computed(() => {
	const r = record.value;
	const descriptions = getFulfillmentMethodDescriptions(r?.fulfillments ?? []);
	if (descriptions.length) {
		return descriptions.join(', ');
	}
	const isDelivery = (r?.order_type ?? OrderType.PICKUP) === OrderType.DELIVERY;
	return isDelivery ? t('components.orderDetail.orderTypeDelivery') : t('components.orderDetail.orderTypePickup');
});

const orderForModal = computed((): OrderHistory | undefined => {
	return order.value;
});

type ResendEmailAction = OrderResendEmailAction;

const overlay = useOverlay();
const new_order_status = ref<OrderStatus>(OrderStatus.PENDING_PAYMENT);

const { t } = useI18n();

const resend_email_action = computed<ResendEmailAction | undefined>(() => {
	const current = order.value;
	if (!current) return undefined;

	return resolveOrderResendEmailAction({
		status: current.status,
		payment_status: current.payment_status,
		payment_method: current.metadata?.payment_method as string | undefined,
		fulfillments: current.fulfillments,
	});
});

const resend_email_label = computed(() => {
	switch (resend_email_action.value) {
		case OrderResendEmailAction.ORDER_CONFIRMATION:
			return 'order confirmation';
		case OrderResendEmailAction.INVOICE:
			return 'invoice';
		case OrderResendEmailAction.RECEIPT:
			return 'receipt';
		case OrderResendEmailAction.REFUND:
			return 'refund receipt';
		case OrderResendEmailAction.CANCELLATION:
			return 'cancellation email';
		case OrderResendEmailAction.SHIPPED:
			return 'shipment email';
		default:
			return '';
	}
});

const can_resend_status_email = computed(() => !!record.value?.customer?.email_address && !!resend_email_action.value);

const is_resending_email = computed(() => resendingEmail.value);

const resend_email_description = computed(() => {
	if (!record.value?.customer?.email_address) {
		return 'Customer email is missing.';
	}
	if (!resend_email_action.value) {
		return 'No email available for this status.';
	}
	return '';
});

const resend_email_customer_address = computed(() => (can_resend_status_email.value ? record.value?.customer?.email_address : undefined));
const resend_email_button_text = computed(() => {
	if (!resend_email_action.value) {
		return 'No email available';
	}
	return `Resend ${resend_email_label.value}`;
});

const isMobile = ref(false);

const checkMobile = () => {
	isMobile.value = window.innerWidth < 640;
};

watch(
	() => order.value?.status,
	(newStatus) => {
		if (newStatus) {
			new_order_status.value = newStatus as OrderStatus;
		}
	},
);

useHead({ title: () => t('pages.orderDetailTitle') + (record.value?.order_no ?? '') });

onMounted(() => {
	checkMobile();
	window.addEventListener('resize', checkMobile);
	getOrderDetails();
});

onBeforeRouteLeave(() => {
	orderStore.closeSession();
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', checkMobile);
});

const getOrderDetails = async () => {
	await orderStore.open(order_no_param.value, ownerType.value);
};

const onItemsRefresh = () => {
	return getOrderDetails();
};

const refreshOrder = async () => {
	const outcome = await orderStore.refreshCurrent();
	if (outcome.status === 'completed') successNotification(t('components.orderDetail.refreshSuccess'));
	else if (outcome.status === 'failed') failedNotification(outcome.failure.message);
};

const refresh_button_text = computed(() => {
	if (isMobile.value) {
		return '';
	}

	if (refreshCooldown.value > 0) {
		return t('components.orderDetail.waitSeconds', { n: refreshCooldown.value });
	}
	return t('components.orderDetail.refresh');
});

const handleUpdateOrderStatus = async () => {
	if (!order.value) {
		throw new Error('Order not found');
	}

	if (new_order_status.value == OrderStatus.CANCELLED) {
		const confirmModal = overlay.create(ZModalConfirmation, {
			props: {
				message: t('components.orderDetail.confirmCancelOrder'),
				titleVariant: 'danger',
				action: 'delete',
				onConfirm: async () => {
					await executeOrderStatusUpdate(new_order_status.value);
					confirmModal.close();
				},
				onCancel: () => {
					confirmModal.close();
				},
			},
		});
		confirmModal.open();
		return;
	}

	await executeOrderStatusUpdate(new_order_status.value);
};

const handleResendCurrentStatusEmail = async () => {
	if (!record.value?.order_no || !can_resend_status_email.value || !resend_email_action.value) {
		return;
	}

	const outcome = await orderStore.resendCurrentStatusEmail(resend_email_action.value);
	if (outcome.status === 'completed') successNotification(t('orderHistory.notifications.emailResent'));
	else if (outcome.status === 'failed') failedNotification(outcome.failure.message);
};

const executeOrderStatusUpdate = async (new_status: OrderStatus) => {
	if (!order.value) {
		throw new Error('Order not found');
	}

	const outcome = await orderStore.updateStatus(new_status);
	if (outcome.status === 'failed') {
		failedNotification(outcome.failure.message);
		return;
	}
	if (outcome.status === 'rejected') return;
	if (outcome.stayOnPage) successNotification(t('components.orderDetail.statusUpdateSuccess'));
	else useRouter().back();
};
</script>

<style scoped>
.order-detail-container {
	max-width: 1600px;
	width: 100%;
}

.order-not-found {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 3rem 1.5rem;
	text-align: center;
	gap: 1rem;
}

.order-not-found-icon {
	width: 3rem;
	height: 3rem;
	color: var(--color-gray-400);
}

.order-not-found-text {
	color: var(--color-gray-600);
	font-size: 1rem;
	max-width: 28rem;
}

.order-header {
	display: grid;
	grid-template-columns: 1fr auto;
	gap: 1rem;
	align-items: start;
	border: 1px solid var(--ui-border);
	background: var(--ui-bg);
	border-radius: 1rem;
	padding: 1.25rem;
	margin-bottom: 1.5rem;
	box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

@media (min-width: 768px) {
	.order-header {
		padding: 1.5rem;
	}
}

.order-header-left {
	min-width: 0;
}

.order-header-title {
	display: flex;
	align-items: center;
	gap: 1rem;
}

.order-number {
	font-size: 1.875rem;
	font-weight: 700;
	line-height: 1.2;
	margin: 0;
}

.metadata-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.875rem;
}

.order-header-right {
	display: flex;
	justify-content: flex-end;
	align-items: flex-start;
}

.order-header-states {
	grid-column: 1 / -1;
}

.status-last-updated {
	grid-column: 1 / -1;
	margin: 0;
	text-align: left;
	font-size: 0.6875rem;
	line-height: 1.25;
	font-variant-numeric: tabular-nums;
	color: var(--ui-text-muted, var(--color-gray-500));
	opacity: 0.75;
}

.wrapper-grid {
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	gap: 1.5rem;
}

@media (min-width: 1024px) {
	.wrapper-grid {
		grid-template-columns: repeat(12, minmax(0, 1fr));
	}
}

.main-wrapper {
	grid-column: span 1 / span 1;
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
}

@media (min-width: 1024px) {
	.main-wrapper {
		grid-column: span 8 / span 8;
	}
}

.side-wrapper {
	grid-column: span 4 / span 4;
}

.sticky-sidebar {
	position: sticky;
	top: 1.5rem;
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

@media (max-width: 640px) {
	.order-header {
		padding: 1rem;
		gap: 1rem;
		grid-template-columns: 1fr auto;
	}

	.order-number {
		font-size: 1.5rem;
	}
}

.mobile-actions-trigger-layout {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: end;
	gap: 0.75rem;
}

@media (max-width: 420px) {
	.mobile-actions-trigger-layout {
		grid-template-columns: minmax(0, 1fr);
	}

	.mobile-actions-open-trigger {
		width: 100%;
		justify-content: center;
	}
}

.spin-icon :deep(svg) {
	animation: spin 1s linear infinite;
}

@keyframes spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
