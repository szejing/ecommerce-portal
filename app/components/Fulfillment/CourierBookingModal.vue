<script setup lang="ts">
import type { CourierHandover } from 'yeppi-common';
import { KEY } from 'yeppi-common';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';
import { getCourierHandoverItems } from '~/utils/options/courier-handover';
import type {
	CourierBookingContext,
	CourierBookingQuote,
	CourierBookingTarget,
} from '~/utils/types/courier-booking';

const { t } = useI18n();

const open = defineModel<boolean>('open', { default: false });

const props = defineProps<{
	targets: CourierBookingTarget[];
}>();

const emit = defineEmits<{
	'after:leave': [];
	close: [booked?: boolean];
}>();

const saving = ref(false);
const quoting = ref(false);
const context = ref<CourierBookingContext>();
const quotes = ref<CourierBookingQuote[]>([]);
const wallet = ref<{ balance: number; currency: string }>();
const selectedServiceId = ref<string>();
const queueIndex = ref(0);

const parcel = reactive({
	weight_kg: '',
	width_cm: '',
	height_cm: '',
	length_cm: '',
});
const collectionDate = ref('');
const handover = ref<CourierHandover>('PICKUP');
const dropoffPointId = ref('');

const activeTarget = computed(() => props.targets[queueIndex.value]);
const handoverOptions = computed(() => getCourierHandoverItems('EasyParcel'));
const canQuote = computed(() =>
	[parcel.weight_kg, parcel.width_cm, parcel.height_cm, parcel.length_cm].every((value) => Number(value) > 0),
);
const canSubmit = computed(() => Boolean(selectedServiceId.value && collectionDate.value && context.value?.sender));

const resetQuoteState = () => {
	quotes.value = [];
	wallet.value = undefined;
	selectedServiceId.value = undefined;
};

const loadContext = async () => {
	const merchant_id = String(useCookie(KEY.X_MERCHANT_ID).value ?? '');
	context.value = await useNuxtApp().$api.fulfillment.getCourierBookingContext(merchant_id);
	collectionDate.value = context.value.collection_date;
	handover.value = context.value.handover;
	dropoffPointId.value = context.value.dropoff_point_id ?? '';
};

const fetchQuotes = async () => {
	if (!activeTarget.value || !canQuote.value) return;
	quoting.value = true;
	resetQuoteState();
	try {
		const merchant_id = String(useCookie(KEY.X_MERCHANT_ID).value ?? '');
		const response = await useNuxtApp().$api.fulfillment.quoteCourierBooking(activeTarget.value.fulfillmentId, {
			merchant_id,
			parcel: {
				weight_kg: Number(parcel.weight_kg),
				width_cm: Number(parcel.width_cm),
				height_cm: Number(parcel.height_cm),
				length_cm: Number(parcel.length_cm),
			},
			handover: handover.value,
			dropoff_point_id: dropoffPointId.value.trim() || null,
		});
		quotes.value = response.quotes;
		wallet.value = response.wallet;
		selectedServiceId.value = response.quotes[0]?.service_id;
	} catch (error) {
		failedNotification(error instanceof Error ? error.message : String(error));
	} finally {
		quoting.value = false;
	}
};

const submitBooking = async () => {
	if (!activeTarget.value || !context.value || !canSubmit.value) return;
	saving.value = true;
	try {
		const merchant_id = String(useCookie(KEY.X_MERCHANT_ID).value ?? '');
		await useNuxtApp().$api.fulfillment.submitCourierBooking(activeTarget.value.fulfillmentId, {
			merchant_id,
			parcel: {
				weight_kg: Number(parcel.weight_kg),
				width_cm: Number(parcel.width_cm),
				height_cm: Number(parcel.height_cm),
				length_cm: Number(parcel.length_cm),
			},
			handover: handover.value,
			dropoff_point_id: dropoffPointId.value.trim() || null,
			service_id: selectedServiceId.value as string,
			collection_date: collectionDate.value,
			sender: context.value.sender,
		});

		if (queueIndex.value < props.targets.length - 1) {
			queueIndex.value += 1;
			resetQuoteState();
			successNotification(t('components.fulfillment.courierBooking.queuedNext', {
				orderNo: activeTarget.value.orderNo,
				current: queueIndex.value + 1,
				total: props.targets.length,
			}));
			return;
		}

		successNotification(t('components.fulfillment.courierBooking.submitted'));
		open.value = false;
		emit('close', true);
	} catch (error) {
		failedNotification(error instanceof Error ? error.message : String(error));
	} finally {
		saving.value = false;
	}
};

watch(open, async (isOpen) => {
	if (!isOpen) {
		queueIndex.value = 0;
		resetQuoteState();
		return;
	}
	queueIndex.value = 0;
	resetQuoteState();
	try {
		await loadContext();
	} catch (error) {
		failedNotification(error instanceof Error ? error.message : String(error));
		open.value = false;
	}
});

watch(() => props.targets, () => {
	queueIndex.value = 0;
	resetQuoteState();
});
</script>

<template>
	<UModal
		v-model:open="open"
		:title="t('components.fulfillment.courierBooking.title')"
		:description="activeTarget ? t('components.fulfillment.courierBooking.description', { orderNo: activeTarget.orderNo, batchNo: activeTarget.batchNo }) : undefined"
		@after:leave="emit('after:leave')"
	>
		<template #body>
			<div v-if="targets.length > 1" class="mb-4 text-sm text-muted">
				{{ t('components.fulfillment.courierBooking.queueProgress', { current: queueIndex + 1, total: targets.length }) }}
			</div>

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<label class="space-y-1 text-sm">
						<span>{{ t('components.fulfillment.courierBooking.weightKg') }}</span>
						<UInput v-model="parcel.weight_kg" type="number" min="0" step="0.01" data-testid="courier-booking-weight" />
					</label>
					<label class="space-y-1 text-sm">
						<span>{{ t('components.fulfillment.courierBooking.widthCm') }}</span>
						<UInput v-model="parcel.width_cm" type="number" min="0" step="0.1" data-testid="courier-booking-width" />
					</label>
					<label class="space-y-1 text-sm">
						<span>{{ t('components.fulfillment.courierBooking.heightCm') }}</span>
						<UInput v-model="parcel.height_cm" type="number" min="0" step="0.1" data-testid="courier-booking-height" />
					</label>
					<label class="space-y-1 text-sm">
						<span>{{ t('components.fulfillment.courierBooking.lengthCm') }}</span>
						<UInput v-model="parcel.length_cm" type="number" min="0" step="0.1" data-testid="courier-booking-length" />
					</label>
				</div>

				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label class="space-y-1 text-sm">
						<span>{{ t('components.fulfillment.courierBooking.collectionDate') }}</span>
						<UInput v-model="collectionDate" type="date" data-testid="courier-booking-collection-date" />
					</label>
					<label class="space-y-1 text-sm">
						<span>{{ t('components.fulfillment.courierBooking.handover') }}</span>
						<USelect
							v-model="handover"
							:items="handoverOptions"
							value-key="value"
							label-key="label"
							class="w-full"
							data-testid="courier-booking-handover"
						/>
					</label>
				</div>

				<label v-if="handover === 'DROP_OFF'" class="block space-y-1 text-sm">
					<span>{{ t('components.fulfillment.courierBooking.dropoffPoint') }}</span>
					<UInput v-model="dropoffPointId" data-testid="courier-booking-dropoff-point" />
				</label>

				<div class="flex flex-wrap items-center gap-2">
					<UButton
						color="neutral"
						variant="soft"
						icon="i-lucide-refresh-cw"
						:loading="quoting"
						:disabled="!canQuote || saving"
						data-testid="courier-booking-fetch-quotes"
						@click="fetchQuotes"
					>
						{{ t('components.fulfillment.courierBooking.fetchQuotes') }}
					</UButton>
					<p v-if="wallet" class="text-sm text-muted">
						{{ t('components.fulfillment.courierBooking.walletBalance', { amount: wallet.balance, currency: wallet.currency }) }}
					</p>
				</div>

				<USelectMenu
					v-if="quotes.length"
					v-model="selectedServiceId"
					:items="quotes.map((quote) => ({
						value: quote.service_id,
						label: quote.service_name
							? `${quote.service_name}${quote.price != null ? ` — ${quote.price}` : ''}`
							: quote.service_id,
					}))"
					value-key="value"
					:placeholder="t('components.fulfillment.courierBooking.selectService')"
					class="w-full"
					data-testid="courier-booking-service"
				/>
			</div>
		</template>

		<template #footer>
			<div class="flex w-full justify-end gap-2">
				<UButton color="neutral" variant="ghost" :disabled="saving" @click="open = false">
					{{ t('common.cancel') }}
				</UButton>
				<UButton
					color="primary"
					icon="i-lucide-truck"
					:loading="saving"
					:disabled="!canSubmit || quoting"
					data-testid="courier-booking-submit"
					@click="submitBooking"
				>
					{{ t('components.fulfillment.pushToEasyParcel') }}
				</UButton>
			</div>
		</template>
	</UModal>
</template>
