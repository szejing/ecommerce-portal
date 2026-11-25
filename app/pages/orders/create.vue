<template>
	<ZPagePanel id="counter-sale" :title="t('pages.newSale')" back-to="/orders">
		<div class="mx-auto flex w-full max-w-[480px] flex-col gap-4 pb-28">
			<p class="text-sm text-muted">{{ stepLabel }}</p>

			<template v-if="step === 1">
				<UButton
					icon="i-heroicons-magnifying-glass"
					:label="t('pages.counterSaleSearch')"
					color="neutral"
					variant="outline"
					block
					class="min-h-11 justify-start"
					@click="openCatalogue"
				/>

				<ul v-if="lines.length" class="space-y-2">
					<li v-for="line in lines" :key="line.key" class="flex items-center gap-3 rounded-lg border border-default bg-default p-2.5">
						<ZImage :src="line.image" alt="" :width="48" :height="48" />
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold text-highlighted">{{ line.name }}</p>
							<p v-if="line.qty > 1" class="text-xs text-muted tabular-nums">{{ formatCurrency(line.unit, line.currency) }} × {{ line.qty }}</p>
							<p class="text-sm font-medium tabular-nums">{{ formatCurrency(line.total, line.currency) }}</p>
						</div>
						<div class="flex items-center gap-1">
							<UButton
								icon="i-heroicons-minus"
								color="neutral"
								variant="soft"
								class="min-h-11 min-w-11 justify-center"
								:aria-label="t('common.delete')"
								@click="changeQty(line.key, -1)"
							/>
							<span class="w-6 text-center text-sm tabular-nums">{{ line.qty }}</span>
							<UButton
								icon="i-heroicons-plus"
								color="neutral"
								variant="soft"
								class="min-h-11 min-w-11 justify-center"
								:aria-label="t('common.add')"
								@click="changeQty(line.key, 1)"
							/>
						</div>
					</li>
				</ul>

				<div class="space-y-3 rounded-lg border border-default bg-elevated/30 p-3">
					<UFormField :label="t('pages.counterSaleFindCustomer')">
						<div class="cursor-pointer" @click="openCustomers">
							<UInput
								readonly
								icon="i-heroicons-magnifying-glass"
								:placeholder="t('pages.counterSaleFindCustomer')"
								:aria-label="t('pages.counterSaleFindCustomer')"
								:ui="{ base: 'cursor-pointer' }"
								@click="openCustomers"
								@keydown.enter.prevent="openCustomers"
								@keydown.space.prevent="openCustomers"
							/>
						</div>
					</UFormField>
					<UFormField :label="t('pages.counterSaleMobile')">
						<ZPhoneInput
							:dial-code="dial"
							:phone-no="mobile"
							:placeholder="t('pages.counterSaleMobile')"
							@update:dial-code="(value: string) => (dial = value)"
							@update:phone-no="(value: string) => (mobile = value)"
						/>
					</UFormField>
					<UInput
						v-model="customerName"
						:placeholder="`${t('pages.counterSaleName')} (${t('pages.counterSaleOptional')})`"
						:aria-label="t('pages.counterSaleName')"
					/>
					<UInput
						v-model="email"
						:placeholder="`${t('pages.counterSaleEmail')} (${t('pages.counterSaleOptional')})`"
						:aria-label="t('pages.counterSaleEmail')"
					/>
					<UFormField :label="t('pages.counterSaleBusinessDate')">
						<UPopover :popper="{ placement: 'bottom-start' }">
							<UButton icon="i-heroicons-calendar-days-20-solid" :label="bizDateLabel" variant="outline" color="neutral" block class="min-h-11 justify-start" />
							<template #content="{ close }">
								<ZDatePicker v-model="bizDateValue" is-required :max-date="bizDateMax" @close="close" />
							</template>
						</UPopover>
					</UFormField>
				</div>
			</template>

			<template v-else-if="step === 2">
				<UFormField v-if="outlets.length > 1" :label="t('pages.counterSaleOutlet')">
					<URadioGroup v-model="outletCode" :items="outletItems" value-key="value" variant="card" @update:model-value="onOutletChange" />
				</UFormField>
				<URadioGroup v-model="paymentMethod" :items="paymentItems" value-key="value" variant="card" :aria-label="t('pages.counterSalePay')" />
				<UInput
					v-if="bankSelected"
					v-model="paymentRef"
					:placeholder="`${t('pages.counterSaleReference')} (${t('pages.counterSaleOptional')})`"
					:aria-label="t('pages.counterSaleReference')"
				/>
				<dl v-if="quote" class="space-y-2 rounded-lg border border-default bg-elevated/40 p-3 text-sm">
					<div class="flex justify-between gap-3">
						<dt>{{ t('pages.counterSaleSubtotal') }}</dt>
						<dd class="tabular-nums">{{ formatCurrency(quote.subtotal, quote.currency_code) }}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt>{{ t('pages.counterSaleTax') }}</dt>
						<dd class="tabular-nums">{{ formatCurrency(quote.tax, quote.currency_code) }}</dd>
					</div>
					<div class="flex justify-between gap-3 border-t border-default pt-2 text-base font-semibold text-highlighted">
						<dt>{{ t('pages.counterSaleTotal') }}</dt>
						<dd class="tabular-nums">{{ formatCurrency(quote.total, quote.currency_code) }}</dd>
					</div>
				</dl>
			</template>

			<template v-else-if="done">
				<div class="flex flex-col items-center gap-1 py-2 text-center">
					<span class="mb-2 flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
						<UIcon name="i-heroicons-check-circle" class="size-8" aria-hidden="true" />
					</span>
					<p class="text-lg font-semibold text-highlighted">{{ t('pages.counterSalePaid') }}</p>
					<p>{{ t('pages.counterSaleInvoice') }} {{ done.inv_no }}</p>
					<p>{{ t('pages.counterSaleOrder') }} {{ done.order_no }}</p>
				</div>
				<div class="flex flex-col gap-2">
					<UButton v-if="email.trim()" block class="min-h-12" :loading="sending" :label="t('pages.counterSaleSendReceipt')" @click="sendReceipt" />
					<UButton block class="min-h-12" color="neutral" variant="soft" :label="t('pages.counterSaleOpenSale')" @click="openSale" />
				</div>
			</template>
		</div>

		<div class="fixed inset-x-0 bottom-0 border-t border-default bg-default p-3">
			<div class="mx-auto w-full max-w-[480px]">
				<UButton v-if="step === 1" block class="min-h-12" :disabled="!canContinue" :loading="busy" :label="t('common.next')" @click="goToPayment" />
				<UButton
					v-else-if="step === 2"
					block
					class="min-h-12"
					:disabled="!paymentMethod || !quote || (outlets.length > 1 && !outletCode)"
					:loading="busy"
					:label="t('pages.counterSaleTakePayment')"
					@click="takePayment"
				/>
				<UButton v-else block class="min-h-12" :label="t('pages.newSale')" @click="resetSale" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { formatCurrency, getFormattedDate, OrderResendEmailAction, PaymentMethodType } from 'yeppi-common';
import type { CounterSaleQuote, CounterSaleResult } from '~/repository/modules/order/order';
import type { PaymentMethod } from '~/utils/types/payment-method';
import type { Product } from '~/utils/types/product';
import type { ProductVariant } from '~/utils/types/product-variant';
import { canContinueCounterSale, catalogUnitPrice, counterSaleErrorMessage, counterSaleLineTotal, mobileDigits } from '~/utils/counter-sale';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';
import type { Outlet } from '~/utils/types/outlet';
import { ZModalOrderCounterSaleCatalogue, ZModalOrderCounterSaleCustomers } from '#components';

type Line = {
	key: string;
	code: string;
	variant?: string;
	name: string;
	image: string;
	qty: number;
	unit: number;
	currency: string;
	total: number;
};

const { t } = useI18n();
const route = useRoute();
const { $api } = useNuxtApp();
const overlay = useOverlay();
let openingCatalogue = false;
let openingCustomers = false;

function localDate(date = new Date()) {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

const step = ref(1);
const lines = ref<Line[]>([]);
const dial = ref('+60');
const mobile = ref('');
const customerName = ref('');
const email = ref('');
const today = localDate();
const bizDate = ref(today);
const bizDateMax = computed(() => {
	const [year = 0, month = 0, day = 0] = today.split('-').map((part) => Number(part));
	return new Date(year, month - 1, day);
});
const bizDateValue = computed<Date | null>({
	get() {
		const [year = 0, month = 0, day = 0] = bizDate.value.split('-').map((part) => Number(part));
		if (!year || !month || !day) return null;
		return new Date(year, month - 1, day);
	},
	set(value) {
		if (!value) return;
		const next = localDate(value);
		if (next > today) return;
		bizDate.value = next;
	},
});
const bizDateLabel = computed(() => (bizDateValue.value ? getFormattedDate(bizDateValue.value, 'dd/MM/yyyy') : t('pages.counterSaleBusinessDate')));
const outlets = ref<Outlet[]>([]);
const outletCode = ref('');
const methods = ref<PaymentMethod[]>([]);
const paymentMethod = ref('');
const paymentRef = ref('');
const quote = ref<CounterSaleQuote | null>(null);
const done = ref<CounterSaleResult | null>(null);
const busy = ref(false);
const sending = ref(false);

const canContinue = computed(() => canContinueCounterSale(lines.value.length, mobile.value));
const stepLabel = computed(() => {
	if (step.value === 1) return t('pages.counterSaleBasket');
	if (step.value === 2) return t('pages.counterSalePay');
	return t('pages.counterSaleDone');
});

function isPayLater(method: PaymentMethod) {
	const kind = String(method.type);
	return kind === String(PaymentMethodType.CASH) || kind === String(PaymentMethodType.BANK_TRANSFER) || kind === 'CASH' || kind === 'BANK_TRANSFER';
}

const payLaterMethods = computed(() => methods.value.filter(isPayLater));
const outletItems = computed(() =>
	outlets.value.map((outlet) => ({
		label: outlet.description || outlet.code,
		value: outlet.code,
	})),
);
const paymentItems = computed(() =>
	payLaterMethods.value.map((method) => ({
		label: method.desc || method.code,
		value: method.code,
	})),
);
const bankSelected = computed(() => {
	const method = payLaterMethods.value.find((item) => item.code === paymentMethod.value);
	if (!method) return false;
	const kind = String(method.type);
	return kind === String(PaymentMethodType.BANK_TRANSFER) || kind === 'BANK_TRANSFER';
});

function errorText(error: unknown) {
	return counterSaleErrorMessage(error, t('pages.counterSaleNothingSaved'));
}

async function openCatalogue() {
	if (openingCatalogue) return;
	openingCatalogue = true;
	try {
		const modal = overlay.create(ZModalOrderCounterSaleCatalogue, { destroyOnClose: true });
		const selection = await modal.open().result;
		if (!selection) return;
		addLine(selection.product, selection.variant);
	} finally {
		openingCatalogue = false;
	}
}

async function openCustomers() {
	if (openingCustomers) return;
	openingCustomers = true;
	try {
		const modal = overlay.create(ZModalOrderCounterSaleCustomers, { destroyOnClose: true });
		const customer = await modal.open().result;
		if (!customer) return;
		const code = mobileDigits(customer.dial_code || '');
		if (code) dial.value = `+${code}`;
		mobile.value = customer.phone_no || '';
		customerName.value = customer.name || '';
		email.value = customer.email_address || '';
	} finally {
		openingCustomers = false;
	}
}

function addLine(product: Product, variant?: ProductVariant) {
	const prices = variant?.price_types?.length ? variant.price_types : (product.price_types ?? []);
	const price = prices[0];
	if (!price || !product.code) {
		failedNotification(t('pages.counterSaleNothingSaved'));
		return;
	}
	const unit = catalogUnitPrice(price);
	const key = `${product.code}:${variant?.variant_code ?? ''}`;
	const existing = lines.value.find((line) => line.key === key);
	if (existing) {
		existing.qty += 1;
		existing.total = counterSaleLineTotal(existing.unit, existing.qty);
	} else {
		lines.value.push({
			key,
			code: product.code,
			variant: variant?.variant_code,
			name: variant?.name ? `${product.name} · ${variant.name}` : (product.name ?? product.code),
			image: product.thumbnail?.url || '',
			qty: 1,
			unit,
			currency: price.currency_code,
			total: unit,
		});
	}
}

function changeQty(key: string, delta: number) {
	const line = lines.value.find((item) => item.key === key);
	if (!line) return;
	line.qty += delta;
	if (line.qty < 1) {
		lines.value = lines.value.filter((item) => item.key !== key);
		return;
	}
	line.total = counterSaleLineTotal(line.unit, line.qty);
}

function payload() {
	return {
		biz_date: bizDate.value,
		outlet_code: outletCode.value || undefined,
		payment_method: paymentMethod.value,
		payment_ref: paymentRef.value.trim() || undefined,
		customer: {
			dial_code: mobileDigits(dial.value),
			phone_no: mobileDigits(mobile.value),
			name: customerName.value.trim() || undefined,
			email_address: email.value.trim() || undefined,
		},
		items: lines.value.map((line) => ({
			prod_code: line.code,
			prod_variant_code: line.variant,
			qty: line.qty,
		})),
	};
}

async function loadCounter() {
	const [outletResp, methodResp] = await Promise.all([$api.outlet.getMany({ $top: 100 }), $api.paymentMethod.getMany({ $top: 100 })]);
	outlets.value = outletResp.data ?? [];
	methods.value = methodResp.data ?? [];
	if (outlets.value.length === 1) outletCode.value = outlets.value[0]?.code ?? '';
	else outletCode.value = outlets.value.find((outlet) => outlet.code === 'HQ')?.code ?? '';
	paymentMethod.value =
		payLaterMethods.value.find((method) => String(method.type) === String(PaymentMethodType.CASH) || String(method.type) === 'CASH')?.code ??
		payLaterMethods.value[0]?.code ??
		'';
}

async function goToPayment() {
	busy.value = true;
	try {
		if (!methods.value.length) await loadCounter();
		if (outlets.value.length > 1 && !outletCode.value) {
			step.value = 2;
			return;
		}
		await refreshQuote();
		step.value = 2;
	} catch (error) {
		failedNotification(errorText(error));
	} finally {
		busy.value = false;
	}
}

async function refreshQuote() {
	quote.value = await $api.order.quoteCounterSale(payload());
}

async function onOutletChange() {
	try {
		await refreshQuote();
	} catch (error) {
		quote.value = null;
		failedNotification(errorText(error));
	}
}

async function takePayment() {
	busy.value = true;
	try {
		done.value = await $api.order.createCounterSale(payload());
		step.value = 3;
	} catch (error) {
		failedNotification(errorText(error));
	} finally {
		busy.value = false;
	}
}

async function sendReceipt() {
	if (!done.value) return;
	sending.value = true;
	try {
		await $api.sale.resendCurrentStatusEmail(done.value.order_no, OrderResendEmailAction.RECEIPT);
		successNotification(t('pages.counterSaleReceiptSent'));
	} catch (error) {
		failedNotification(errorText(error));
	} finally {
		sending.value = false;
	}
}

function openSale() {
	if (!done.value) return;
	navigateTo(`/orders/${done.value.order_no}?type=sale`);
}

function resetSale() {
	step.value = 1;
	lines.value = [];
	quote.value = null;
	done.value = null;
	paymentRef.value = '';
	mobile.value = '';
	customerName.value = '';
	email.value = '';
	bizDate.value = localDate();
}

onMounted(() => {
	const q = route.query;
	if (typeof q.dial_code === 'string') {
		const code = q.dial_code.replace(/\D/g, '');
		if (code) dial.value = `+${code}`;
	}
	if (typeof q.phone_no === 'string') mobile.value = q.phone_no;
	if (typeof q.name === 'string') customerName.value = q.name;
	if (typeof q.email === 'string') email.value = q.email;
	loadCounter().catch((error: unknown) => failedNotification(errorText(error)));
});
</script>
