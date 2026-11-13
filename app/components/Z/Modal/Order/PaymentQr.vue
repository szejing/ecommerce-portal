<template>
	<UModal
		:default-open="true"
		:title="t('components.orderDetail.generatePaymentQr')"
		:ui="{
			content: 'w-full sm:max-w-md',
		}"
		@close="onClose"
	>
		<template #body>
			<div class="space-y-4" data-testid="payment-qr-modal">
				<div v-if="loading" class="flex flex-col items-center gap-3 py-8">
					<UIcon name="i-heroicons-arrow-path" class="size-8 animate-spin text-primary" />
					<p class="text-sm text-muted">{{ t('components.orderDetail.paymentQrLoading') }}</p>
				</div>

				<div v-else-if="errorMessage" class="space-y-3">
					<p class="text-sm text-error" data-testid="payment-qr-error">{{ errorMessage }}</p>
					<UButton color="primary" variant="soft" @click="loadCheckout">{{ t('common.retry') }}</UButton>
				</div>

				<div v-else-if="isPaid" class="space-y-3 text-center py-4" data-testid="payment-qr-paid">
					<UBadge color="success" size="lg" variant="subtle">
						<UIcon name="i-heroicons-check-circle" class="size-4" />
						{{ t('components.orderDetail.paid') }}
					</UBadge>
					<p class="text-sm text-muted">{{ t('components.orderDetail.paymentQrAlreadyPaid') }}</p>
				</div>

				<div v-else-if="paymentUrl" class="space-y-4">
					<div class="rounded-lg border border-default bg-elevated p-3 space-y-1 text-sm">
						<div class="flex justify-between gap-2">
							<span class="text-muted">{{ t('components.orderDetail.paymentQrAmount') }}</span>
							<span class="font-semibold tabular-nums">{{ currencyCode }} {{ amount.toFixed(2) }}</span>
						</div>
						<div v-if="purpose" class="flex justify-between gap-2">
							<span class="text-muted">{{ t('components.orderDetail.paymentPurpose') }}</span>
							<span class="font-medium capitalize">{{ purpose }}</span>
						</div>
					</div>

					<div class="flex justify-center">
						<img
							v-if="qrDataUrl"
							:src="qrDataUrl"
							alt=""
							class="size-56 rounded-md bg-white p-2"
							data-testid="payment-qr-image"
						/>
					</div>

					<div class="flex flex-col sm:flex-row gap-2">
						<UButton color="neutral" variant="soft" class="justify-center flex-1" @click="copyLink">
							<UIcon name="i-heroicons-clipboard-document" class="size-4" />
							{{ t('components.orderDetail.copyPaymentLink') }}
						</UButton>
						<UButton color="primary" variant="soft" class="justify-center flex-1" :to="paymentUrl" target="_blank" external>
							{{ t('components.orderDetail.openPaymentLink') }}
						</UButton>
					</div>
				</div>

				<div v-else class="text-sm text-muted py-4" data-testid="payment-qr-empty">
					{{ t('components.orderDetail.paymentQrUnavailable') }}
				</div>
			</div>
		</template>

		<template #footer>
			<div class="flex justify-end w-full">
				<UButton color="neutral" variant="soft" @click="onClose">{{ t('common.close') }}</UButton>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import QRCode from 'qrcode';
import type { OrderHistory } from '~/utils/types/order-history';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';

const { t } = useI18n();

const props = defineProps<{
	order: OrderHistory;
}>();

const emit = defineEmits<{
	close: [];
	refresh: [];
}>();

const loading = ref(true);
const errorMessage = ref<string | null>(null);
const paymentUrl = ref<string | null>(null);
const amount = ref(0);
const currencyCode = ref(props.order.currency?.code ?? 'MYR');
const purpose = ref<string | null>(null);
const status = ref<string | null>(null);
const qrDataUrl = ref<string | null>(null);

const isPaid = computed(() => {
	const s = (status.value ?? '').toLowerCase();
	return s === 'paid' || Number(props.order.outstanding_amt ?? 0) <= 0;
});

async function renderQr(url: string) {
	qrDataUrl.value = await QRCode.toDataURL(url, {
		errorCorrectionLevel: 'M',
		margin: 1,
		width: 224,
	});
}

async function loadCheckout() {
	loading.value = true;
	errorMessage.value = null;
	paymentUrl.value = null;
	qrDataUrl.value = null;

	try {
		const { $api } = useNuxtApp();
		const resp = await $api.order.generatePayment(props.order.order_no);
		const checkout = resp?.checkout;
		if (!checkout) {
			status.value = 'paid';
			return;
		}

		status.value = checkout.status != null ? String(checkout.status) : null;
		purpose.value = checkout.purpose != null ? String(checkout.purpose) : null;
		amount.value = Number(checkout.amount ?? props.order.outstanding_amt ?? 0);
		currencyCode.value = String(checkout.currency_code ?? props.order.currency?.code ?? 'MYR');

		const url = (checkout.payment_url ?? checkout.checkout_url ?? null) as string | null;
		if (!url) {
			if ((status.value ?? '').toLowerCase() === 'paid') return;
			errorMessage.value = t('components.orderDetail.paymentQrUnavailable');
			return;
		}

		paymentUrl.value = url;
		await renderQr(url);
	} catch (err: unknown) {
		errorMessage.value = (err as { message?: string })?.message ?? t('components.orderDetail.paymentQrFailed');
	} finally {
		loading.value = false;
	}
}

async function copyLink() {
	if (!paymentUrl.value) return;
	try {
		await navigator.clipboard.writeText(paymentUrl.value);
		successNotification(t('components.orderDetail.copyPaymentLinkSuccess'));
	} catch {
		failedNotification(t('components.orderDetail.copyPaymentLinkFailed'));
	}
}

function onClose() {
	emit('refresh');
	emit('close');
}

onMounted(() => {
	void loadCheckout();
});
</script>
