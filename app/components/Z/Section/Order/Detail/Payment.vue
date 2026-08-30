<template>
	<UCard class="payment-info-card">
		<template #header>
			<div class="card-header-sidebar">
				<h3 class="sidebar-title">
					<UIcon name="i-heroicons-banknotes" class="w-5 h-5" aria-hidden="true" />
					{{ t('components.orderDetail.paymentInformation') }}
				</h3>
				<UButton
					v-if="order?.payments?.length == 0"
					variant="ghost"
					size="xs"
					:icon="ICONS.ADD_OUTLINE"
					:aria-label="t('components.orderDetail.addPayment')"
					@click="addPaymentInfo"
				/>
				<div v-if="order?.payment_status === PaymentStatus.PAID" class="status-group">
					<UBadge color="success" size="lg">
						<UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
						{{ t('components.orderDetail.paid') }}
					</UBadge>
				</div>
			</div>
		</template>

		<div v-if="order?.payments && order.payments.length > 0" class="payments-list">
			<button
				v-for="payment in order.payments"
				:key="payment.payment_line"
				data-testid="payment-item"
				type="button"
				class="payment-item"
				:aria-label="
					t('components.orderDetail.viewPayment', {
						type: payment.payment_type_desc,
						amount: `${payment.currency_code} ${payment.payment_amt?.toFixed(2)}`,
					})
				"
				@click="viewPaymentInfo(payment)"
			>
				<div class="payment-header">
					<span class="payment-type">{{ payment.payment_type_desc }}</span>
					<span class="payment-amount">{{ payment.currency_code }} {{ payment.payment_amt?.toFixed(2) }}</span>
				</div>
				<div v-if="payment.ref_no1" class="payment-ref">
					<span class="payment-ref-label">{{ t('components.orderDetail.refLabel') }}:</span>
					<span class="payment-ref-value">{{ payment.ref_no1 }}</span>
				</div>
				<div class="payment-date">
					<UIcon name="i-heroicons-clock" class="w-3 h-3" />
					{{ getFormattedDate(payment.payment_date_time, 'dd MMM yyyy HH:mm') }}
				</div>
			</button>
		</div>
		<div v-else class="payment-empty">
			<UIcon name="i-heroicons-currency-dollar" class="w-12 h-12 text-neutral-300" />
			<p class="payment-empty-text">{{ t('components.orderDetail.noPaymentRecorded') }}</p>
			<UButton size="sm" color="primary" :icon="ICONS.ADD_OUTLINE" @click="addPaymentInfo">
				{{ t('components.orderDetail.addPayment') }}
			</UButton>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import { ZModalOrderDetailPayment } from '#components';
import { PaymentStatus, getFormattedDate } from 'yeppi-common';
import type { PaymentModel } from '~/utils/models';
import type { OrderHistory } from '~/utils/types/order-history';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const props = defineProps<{
	order?: OrderHistory;
}>();

const emit = defineEmits<{
	refresh: [];
}>();

const overlay = useOverlay();

const addPaymentInfo = () => {
	if (!props.order) return;

	const paymentModal = overlay.create(ZModalOrderDetailPayment, {
		props: {
			order: props.order,
			onUpdate: () => {
				paymentModal.close();
				emit('refresh');
			},
			onCancel: () => {
				paymentModal.close();
			},
		},
	});

	paymentModal.open();
};

const viewPaymentInfo = (payment: PaymentModel) => {
	if (!props.order) return;

	const paymentModal = overlay.create(ZModalOrderDetailPayment, {
		props: {
			order: props.order,
			payment: payment,
			onUpdate: () => {
				paymentModal.close();
				emit('refresh');
			},
			onCancel: () => {
				paymentModal.close();
			},
		},
	});

	paymentModal.open();
};
</script>

<style scoped>
.card-header-sidebar {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
}

.sidebar-title {
	font-size: 1rem;
	font-weight: 600;
	color: var(--ui-text-highlighted);
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.payment-info-card {
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.payments-list {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.payment-item {
	appearance: none;
	width: 100%;
	padding: 1rem;
	font: inherit;
	color: inherit;
	text-align: left;
	background: var(--ui-bg-elevated);
	border-radius: 0.5rem;
	border: 1px solid var(--ui-border);
	cursor: pointer;
	transition: all 0.2s ease;
}

.payment-item:hover {
	background: var(--ui-bg-accented);
	border-color: var(--color-primary-300);
}

.payment-item:focus-visible {
	outline: 2px solid var(--ui-primary);
	outline-offset: 2px;
}

.payment-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 0.5rem;
}

.payment-type {
	font-size: 0.875rem;
	font-weight: 600;
	color: var(--ui-text-highlighted);
}

.payment-amount {
	font-size: 1rem;
	font-weight: 700;
	color: var(--color-primary-600);
}

.payment-ref {
	display: flex;
	gap: 0.5rem;
	font-size: 0.75rem;
	margin-bottom: 0.25rem;
}

.payment-ref-label {
	color: var(--ui-text-muted);
}

.payment-ref-value {
	color: var(--ui-text);
	font-weight: 500;
}

.payment-date {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	font-size: 0.75rem;
	color: var(--ui-text-muted);
}

.payment-empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 2rem;
	text-align: center;
	gap: 1rem;
}

.payment-empty-text {
	color: var(--ui-text-muted);
	font-size: 0.875rem;
}
</style>
