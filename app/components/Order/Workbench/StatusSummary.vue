<template>
	<dl
		class="state-summary"
		:class="{
			'state-summary--compact': compact,
			'state-summary--with-order': showOrder && !compact,
		}"
		:aria-label="t('components.orderDetail.operationalSummary')"
	>
		<div v-if="showOrder" data-testid="workbench-order-status" class="state-summary-item">
			<dt class="state-summary-label">{{ t('components.orderDetail.orderState') }}</dt>
			<dd class="state-summary-value">
				<div class="status-control">
					<div class="status-split text-inverted" :class="statusPillClass" :title="orderState.label">
						<ZSelectMenuOrderStatus
							appearance="pill"
							:status="order.status"
							:disabled="updating"
							@update:status="onStatusSelected"
						/>
						<button
							v-if="nextStatus"
							type="button"
							data-testid="workbench-order-status-next"
							class="status-split-next"
							:disabled="updating"
							:aria-label="t('components.orderDetail.nextOrderStatus', { status: nextStatusLabel })"
							:title="t('components.orderDetail.nextOrderStatus', { status: nextStatusLabel })"
							@click="onStatusSelected(nextStatus)"
						>
							<UIcon :name="ICONS.CHEVRON_RIGHT" class="size-4" aria-hidden="true" />
						</button>
					</div>
					<UButton
						v-if="showComplete"
						data-testid="workbench-order-status-complete"
						color="neutral"
						variant="subtle"
						size="sm"
						square
						:icon="ICONS.CHECK_ROUNDED"
						:disabled="updating"
						:aria-label="t('components.orderDetail.completeOrderStatus')"
						:title="t('components.orderDetail.completeOrderStatus')"
						@click="onStatusSelected(OrderStatus.COMPLETED)"
					/>
				</div>
			</dd>
		</div>
		<div data-testid="workbench-payment-status" class="state-summary-item">
			<dt class="state-summary-label">{{ t('components.orderDetail.paymentState') }}</dt>
			<dd class="state-summary-value">
				<div class="status-control">
					<div class="status-split text-inverted" :class="paymentPillClass" :title="paymentState.label">
						<ZSelectMenuPaymentStatus
							appearance="pill"
							:payment-status="order.payment_status"
							:disabled="updating"
							@update:payment-status="onPaymentStatusSelected"
						/>
						<button
							v-if="nextPaymentStatus"
							type="button"
							data-testid="workbench-payment-status-next"
							class="status-split-next"
							:disabled="updating"
							:aria-label="t('components.orderDetail.nextPaymentStatus', { status: nextPaymentStatusLabel })"
							:title="t('components.orderDetail.nextPaymentStatus', { status: nextPaymentStatusLabel })"
							@click="onPaymentStatusSelected(nextPaymentStatus)"
						>
							<UIcon :name="ICONS.CHEVRON_RIGHT" class="size-4" aria-hidden="true" />
						</button>
					</div>
					<UButton
						v-if="showCompletePayment"
						data-testid="workbench-payment-status-complete"
						color="neutral"
						variant="subtle"
						size="sm"
						square
						:icon="ICONS.CHECK_ROUNDED"
						:disabled="updating"
						:aria-label="t('components.orderDetail.completePaymentStatus')"
						:title="t('components.orderDetail.completePaymentStatus')"
						@click="onPaymentStatusSelected(PaymentStatus.PAID)"
					/>
				</div>
			</dd>
		</div>
		<div data-testid="workbench-fulfillment-status" class="state-summary-item">
			<dt class="state-summary-label">{{ t('components.orderDetail.fulfillmentState') }}</dt>
			<dd class="state-summary-value">
				<div v-if="editableShipmentStatus !== undefined" class="status-control">
					<div class="status-split text-inverted" :class="shipmentPillClass" :title="shipmentState.label">
						<ZSelectMenuShipmentStatus
							appearance="pill"
							:shipment-status="editableShipmentStatus"
							:disabled="updating"
							@update:shipment-status="onShipmentStatusSelected"
						/>
						<button
							v-if="nextShipmentStatus"
							type="button"
							data-testid="workbench-shipment-status-next"
							class="status-split-next"
							:disabled="updating"
							:aria-label="t('components.orderDetail.nextShipmentStatus', { status: nextShipmentStatusLabel })"
							:title="t('components.orderDetail.nextShipmentStatus', { status: nextShipmentStatusLabel })"
							@click="onShipmentStatusSelected(nextShipmentStatus)"
						>
							<UIcon :name="ICONS.CHEVRON_RIGHT" class="size-4" aria-hidden="true" />
						</button>
					</div>
					<UButton
						v-if="showCompleteShipment"
						data-testid="workbench-shipment-status-complete"
						color="neutral"
						variant="subtle"
						size="sm"
						square
						:icon="ICONS.CHECK_ROUNDED"
						:disabled="updating"
						:aria-label="t('components.orderDetail.completeShipmentStatus')"
						:title="t('components.orderDetail.completeShipmentStatus')"
						@click="onShipmentStatusSelected('delivered')"
					/>
				</div>
				<UBadge v-else :color="fulfillmentState.color" variant="subtle" size="sm" class="max-w-full capitalize">
					<span class="min-w-0 truncate whitespace-nowrap">{{ fulfillmentState.label }}</span>
				</UBadge>
			</dd>
		</div>
	</dl>
</template>

<script lang="ts" setup>
import { OrderStatus, OrderType, PaymentStatus } from 'yeppi-common';
import {
	canCompleteOrderStatus,
	canCompletePaymentStatus,
	canCompleteShipmentStatus,
	getNextOrderStatus,
	getNextPaymentStatus,
	getNextShipmentStatus,
	getOrderStatusColor,
	getOrderStatusOption,
	getPaymentStatusColor,
	getPaymentStatusOptions,
	getShipmentStatusColor,
	getShipmentStatusOptions,
} from '~/utils/options';
import { ICONS } from '~/utils/icons';
import type { ShipmentStatusValue } from '~/utils/types/order-fulfillment-shipping';
import type { OrderHistory } from '~/utils/types/order-history';

const props = withDefaults(defineProps<{
	order: OrderHistory;
	compact?: boolean;
	showOrder?: boolean;
	updating?: boolean;
}>(), {
	compact: false,
	showOrder: true,
	updating: false,
});

const emit = defineEmits<{
	'update:status': [status: OrderStatus];
	'update:paymentStatus': [status: PaymentStatus];
	'update:shipmentStatus': [status: ShipmentStatusValue];
}>();

const { t } = useI18n();

function pillClassForColor(color: string | undefined) {
	switch (color) {
		case 'primary':
			return 'bg-primary-500';
		case 'success':
			return 'bg-success-500';
		case 'warning':
			return 'bg-warning-500';
		case 'error':
			return 'bg-error-500';
		case 'secondary':
			return 'bg-secondary-500';
		case 'neutral':
			return 'bg-inverted';
		default:
			return 'bg-info-500';
	}
}

const orderState = computed(() => ({
	label: getOrderStatusOption(t, props.order.status)?.label ?? props.order.status,
	color: getOrderStatusColor(props.order.status) ?? 'neutral',
}));

const nextStatus = computed(() => getNextOrderStatus(props.order.status, props.order.order_type));
const nextStatusLabel = computed(() => {
	if (!nextStatus.value) {
		return '';
	}
	return getOrderStatusOption(t, nextStatus.value)?.label ?? nextStatus.value;
});
const showComplete = computed(() => canCompleteOrderStatus(props.order.status));
const statusPillClass = computed(() => pillClassForColor(orderState.value.color));

const paymentState = computed(() => ({
	label: getPaymentStatusOptions(t).find((option) => option.value === props.order.payment_status)?.label ?? t('options.pending'),
	color: getPaymentStatusColor(props.order.payment_status) ?? 'neutral',
}));
const nextPaymentStatus = computed(() => getNextPaymentStatus(props.order.payment_status));
const nextPaymentStatusLabel = computed(() => {
	if (!nextPaymentStatus.value) {
		return '';
	}
	return getPaymentStatusOptions(t).find((option) => option.value === nextPaymentStatus.value)?.label ?? nextPaymentStatus.value;
});
const showCompletePayment = computed(() => canCompletePaymentStatus(props.order.payment_status));
const paymentPillClass = computed(() => pillClassForColor(paymentState.value.color));

const isPickup = computed(() => (props.order.order_type ?? OrderType.PICKUP) === OrderType.PICKUP);

const editableShipmentStatus = computed((): ShipmentStatusValue | undefined => {
	if (isPickup.value) {
		return undefined;
	}

	const batches = props.order.fulfillments ?? [];
	if (!batches.length) {
		return undefined;
	}

	const shipmentStatuses = new Set(batches.map((batch) => batch.shipment_status));
	if (shipmentStatuses.size !== 1) {
		return undefined;
	}

	return batches[0]!.shipment_status as ShipmentStatusValue;
});

const shipmentState = computed(() => {
	const status = editableShipmentStatus.value;
	if (!status) {
		return { label: '', color: 'neutral' as const };
	}
	return {
		label: getShipmentStatusOptions(t).find((option) => option.value === status)?.label ?? status,
		color: getShipmentStatusColor(status) ?? 'neutral',
	};
});
const nextShipmentStatus = computed(() => getNextShipmentStatus(editableShipmentStatus.value));
const nextShipmentStatusLabel = computed(() => {
	if (!nextShipmentStatus.value) {
		return '';
	}
	return getShipmentStatusOptions(t).find((option) => option.value === nextShipmentStatus.value)?.label ?? nextShipmentStatus.value;
});
const showCompleteShipment = computed(() => canCompleteShipmentStatus(editableShipmentStatus.value));
const shipmentPillClass = computed(() => pillClassForColor(shipmentState.value.color));

const fulfillmentState = computed(() => {
	if (isPickup.value) {
		return { label: t('components.orderDetail.orderTypePickup'), color: 'primary' as const };
	}

	const batches = props.order.fulfillments ?? [];
	if (!batches.length) {
		return { label: t('options.pending'), color: 'warning' as const };
	}

	return { label: t('options.processing'), color: 'info' as const };
});

function onStatusSelected(status: OrderStatus | undefined) {
	if (!status || status === props.order.status || props.updating) {
		return;
	}
	emit('update:status', status);
}

function onPaymentStatusSelected(status: PaymentStatus | undefined) {
	if (!status || status === props.order.payment_status || props.updating) {
		return;
	}
	emit('update:paymentStatus', status);
}

function onShipmentStatusSelected(status: ShipmentStatusValue | undefined) {
	if (!status || status === editableShipmentStatus.value || props.updating) {
		return;
	}
	emit('update:shipmentStatus', status);
}
</script>

<style scoped>
.state-summary {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 0.375rem 0.75rem;
	min-width: 0;
	margin: 0;
	border: 1px solid var(--ui-border);
	border-radius: 0.75rem;
	background: color-mix(in srgb, var(--ui-bg-elevated) 55%, transparent);
	padding: 0.5rem 0.75rem;
}

.state-summary--compact {
	grid-template-columns: repeat(2, minmax(0, 1fr));
	padding: 0.375rem 0.625rem;
	gap: 0.25rem 0.75rem;
}

.state-summary-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	min-width: 0;
}

.state-summary-item + .state-summary-item {
	border-top: 1px solid var(--ui-border);
	padding-top: 0.375rem;
}

.state-summary--compact .state-summary-item + .state-summary-item {
	border-top: 0;
	padding-top: 0;
}

.state-summary-label {
	margin: 0;
	flex-shrink: 0;
	font-size: 0.6875rem;
	font-weight: 600;
	line-height: 1rem;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--ui-text-muted);
}

.state-summary-value {
	display: flex;
	min-width: 0;
	margin: 0;
	justify-content: flex-end;
}

.status-control {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	min-width: 0;
}

.status-split {
	display: inline-flex;
	align-items: stretch;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	border-radius: 0.5rem;
}

.status-split-next {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	min-width: 2rem;
	padding-inline: 0.25rem;
	border: 0;
	border-left: 1px solid color-mix(in srgb, white 30%, transparent);
	background: transparent;
	color: inherit;
	cursor: pointer;
	touch-action: manipulation;
}

.status-split-next:hover:not(:disabled) {
	background: color-mix(in srgb, white 12%, transparent);
}

.status-split-next:focus-visible {
	outline: 2px solid color-mix(in srgb, white 80%, transparent);
	outline-offset: -2px;
}

.status-split-next:disabled {
	cursor: not-allowed;
	opacity: 0.5;
}

@media (min-width: 640px) {
	.state-summary--with-order {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		padding: 0.625rem 0.75rem;
		gap: 0.75rem;
	}

	.state-summary--with-order .state-summary-item {
		flex-direction: column;
		align-items: flex-start;
		justify-content: flex-start;
		gap: 0.25rem;
	}

	.state-summary--with-order .state-summary-item + .state-summary-item {
		border-top: 0;
		padding-top: 0;
	}

	.state-summary--with-order .state-summary-value {
		justify-content: flex-start;
	}
}
</style>
