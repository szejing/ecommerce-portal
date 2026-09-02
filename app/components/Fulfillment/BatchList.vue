<script setup lang="ts">
import { LazyFulfillmentArrangementModal } from '#components';
import { PaymentStatus } from 'yeppi-common';
import { useCourierStore } from '~/stores/Courier/Courier';
import { useFulfillmentStore, type FulfillmentAction } from '~/stores/Fulfillment/Fulfillment';
import type { Courier } from '~/utils/types/courier';
import type { CourierBookingTarget } from '~/utils/types/courier-booking';
import type { FulfillmentBatch } from '~/utils/types/order-fulfillment-shipping';
import type { OrderHistory } from '~/utils/types/order-history';

const { t } = useI18n();

const props = withDefaults(defineProps<{
	order: OrderHistory;
	ownerType?: 'order' | 'sale';
}>(), {
	ownerType: 'order',
});

const emit = defineEmits<{
	refresh: [];
}>();

const overlay = useOverlay();
const fulfillmentStore = useFulfillmentStore();
const courierStore = useCourierStore();
const { isConnected: isEasyParcelConnected } = useEasyParcelConnection();
const arrangementCouriers = ref<Courier[]>([]);
const bookingTargets = ref<CourierBookingTarget[]>([]);
const bookingModalOpen = ref(false);

const batches = computed(() => [...(props.order.fulfillments ?? [])].sort((left, right) => left.batch_no - right.batch_no));
const loading = computed(() => fulfillmentStore.updating);
const currencyCode = computed(() => props.order.currency?.code ?? 'MYR');
const canBookCourier = computed(
	() => isEasyParcelConnected.value && props.order.payment_status === PaymentStatus.PAID,
);

const editBatch = async (batch: FulfillmentBatch) => {
	arrangementCouriers.value = await courierStore.fetchAllActiveCouriers();

	const arrangementModal = overlay.create(LazyFulfillmentArrangementModal, {
		props: {
			open: true,
			batch,
			couriers: arrangementCouriers.value,
			save: async (payload) => {
				await fulfillmentStore.updateArrangement(batch.id, payload);
			},
		},
	});

	const saved = await arrangementModal.open().result;
	if (saved) emit('refresh');
};

const openBookingModal = (targets: CourierBookingTarget[]) => {
	bookingTargets.value = targets;
	bookingModalOpen.value = true;
};

const bookBatch = (batch: FulfillmentBatch) => {
	openBookingModal([{
		fulfillmentId: batch.id,
		orderNo: batch.order_no,
		batchNo: batch.batch_no,
	}]);
};

const onBookingClose = (booked?: boolean) => {
	bookingModalOpen.value = false;
	if (booked) emit('refresh');
};

const runAction = async (action: FulfillmentAction, batch: FulfillmentBatch) => {
	await fulfillmentStore.runAction(batch.id, action);
	emit('refresh');
};
</script>

<template>
	<section v-if="batches.length" class="space-y-3" aria-labelledby="fulfillment-shipping-heading">
		<div v-if="batches.length > 1" class="flex items-center justify-between gap-3">
			<h2 id="fulfillment-shipping-heading" class="text-base font-semibold text-default">
				{{ t('components.fulfillment.batchesTitle') }}
			</h2>
			<UBadge data-testid="fulfillment-batch-count" color="neutral" variant="subtle">
				{{ t('components.fulfillment.batchCount', { count: batches.length }) }}
			</UBadge>
		</div>

		<FulfillmentBatchCard
			v-for="batch in batches"
			:key="batch.id"
			:batch="batch"
			:currency-code="currencyCode"
			:show-batch-meta="batches.length > 1"
			:loading="loading"
			:can-book-courier="canBookCourier"
			@edit="editBatch"
			@book="bookBatch"
			@action="runAction"
		/>

		<FulfillmentCourierBookingModal
			v-model:open="bookingModalOpen"
			:targets="bookingTargets"
			@close="onBookingClose"
		/>
	</section>
</template>
