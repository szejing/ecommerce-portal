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
				<UBadge :color="orderState.color" variant="subtle" size="sm" class="max-w-full capitalize">
					<span class="min-w-0 truncate whitespace-nowrap">{{ orderState.label }}</span>
				</UBadge>
			</dd>
		</div>
		<div data-testid="workbench-payment-status" class="state-summary-item">
			<dt class="state-summary-label">{{ t('components.orderDetail.paymentState') }}</dt>
			<dd class="state-summary-value">
				<UBadge :color="paymentState.color" variant="subtle" size="sm" class="max-w-full capitalize">
					<span class="min-w-0 truncate whitespace-nowrap">{{ paymentState.label }}</span>
				</UBadge>
			</dd>
		</div>
		<div data-testid="workbench-fulfillment-status" class="state-summary-item">
			<dt class="state-summary-label">{{ t('components.orderDetail.fulfillmentState') }}</dt>
			<dd class="state-summary-value">
				<UBadge :color="fulfillmentState.color" variant="subtle" size="sm" class="max-w-full capitalize">
					<span class="min-w-0 truncate whitespace-nowrap">{{ fulfillmentState.label }}</span>
				</UBadge>
			</dd>
		</div>
	</dl>
</template>

<script lang="ts" setup>
import { OrderType } from 'yeppi-common';
import {
	getFulfillmentStatusColor,
	getFulfillmentStatusOptions,
	getOrderStatusColor,
	getOrderStatusOption,
	getPaymentStatusColor,
	getPaymentStatusOptions,
	getShipmentStatusColor,
	getShipmentStatusOptions,
} from '~/utils/options';
import type { FulfillmentLifecycleStatusValue, ShipmentStatusValue } from '~/utils/types/order-fulfillment-shipping';
import type { OrderHistory } from '~/utils/types/order-history';

const props = withDefaults(defineProps<{
	order: OrderHistory;
	compact?: boolean;
	showOrder?: boolean;
}>(), {
	compact: false,
	showOrder: true,
});

const { t } = useI18n();

const orderState = computed(() => ({
	label: getOrderStatusOption(t, props.order.status)?.label ?? props.order.status,
	color: getOrderStatusColor(props.order.status) ?? 'neutral',
}));

const paymentState = computed(() => ({
	label: getPaymentStatusOptions(t).find((option) => option.value === props.order.payment_status)?.label ?? t('options.pending'),
	color: getPaymentStatusColor(props.order.payment_status) ?? 'neutral',
}));

const fulfillmentState = computed(() => {
	if ((props.order.order_type ?? OrderType.PICKUP) === OrderType.PICKUP) {
		return { label: t('components.orderDetail.orderTypePickup'), color: 'primary' as const };
	}

	const batches = props.order.fulfillments ?? [];
	if (!batches.length) {
		return { label: t('options.pending'), color: 'warning' as const };
	}

	const shipmentStatuses = new Set(batches.map((batch) => batch.shipment_status));
	if (shipmentStatuses.size === 1 && !shipmentStatuses.has('pending')) {
		const shipmentStatus = batches[0]!.shipment_status as ShipmentStatusValue;
		return {
			label: getShipmentStatusOptions(t).find((option) => option.value === shipmentStatus)?.label ?? shipmentStatus,
			color: getShipmentStatusColor(shipmentStatus) ?? 'neutral',
		};
	}

	if ([...shipmentStatuses].some((status) => status !== 'pending')) {
		return { label: t('options.processing'), color: 'info' as const };
	}

	const lifecycleStatuses = new Set(batches.map((batch) => batch.status));
	if (lifecycleStatuses.size === 1) {
		const lifecycleStatus = batches[0]!.status as FulfillmentLifecycleStatusValue;
		return {
			label: getFulfillmentStatusOptions(t).find((option) => option.value === lifecycleStatus)?.label ?? lifecycleStatus,
			color: getFulfillmentStatusColor(lifecycleStatus) ?? 'neutral',
		};
	}

	return { label: t('options.processing'), color: 'info' as const };
});
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
