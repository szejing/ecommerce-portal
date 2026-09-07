<template>
	<div class="space-y-6">
		<!-- Product & status -->
		<UCard class="card">
			<div class="flex flex-col gap-4">
				<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div class="flex items-start gap-3 min-w-0">
						<div class="shrink-0 rounded-lg bg-elevated p-2">
							<UIcon :name="ICONS.CUBE" class="w-6 h-6 text-muted" />
						</div>
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<h2 class="font-semibold text-default truncate">#{{ prodCode }}</h2>
								<UBadge
									v-if="showsPreorderBadge"
									data-testid="order-item-preorder"
									color="warning"
									variant="subtle"
									size="sm"
									class="whitespace-nowrap"
								>
									{{ t('components.orderDetail.preorder') }}
								</UBadge>
							</div>
							<p class="text-sm text-muted mt-0.5 truncate">{{ prodName }}</p>
						</div>
					</div>
					<UFormField :label="t('components.orderInput.status')" name="item_status" class="sm:w-40 shrink-0">
						<UTooltip :text="t('components.orderInput.changeItemStatus')" :popper="{ placement: 'bottom' }">
							<USelectMenu v-model="status" :items="itemStatusOptions" value-key="value" size="md" :ui="{ base: 'min-w-full' }">
								<template #default>
									<UBadge :color="getOrderItemStatusColor(status)" variant="subtle" class="truncate w-full justify-center">
										{{ itemStatusLabel }}
									</UBadge>
								</template>
								<template #item="{ item }">
									<UBadge :color="getOrderItemStatusColor(item.value)" variant="subtle" class="truncate">
										{{ item.label }}
									</UBadge>
								</template>
							</USelectMenu>
						</UTooltip>
					</UFormField>
				</div>

				<UFormField
					v-if="prodVariantCode"
					:label="t('components.orderInput.variant')"
					name="prod_variant_code"
					data-testid="order-item-variant"
				>
					<USelectMenu
						:model-value="prodVariantCode"
						:items="prodVariants"
						value-key="variant_code"
						label-key="name"
						:filter-fields="['variant_code', 'name', 'sku']"
						:loading="isLoading"
						:disabled="isLoading || prodVariants.length === 0"
						:search-input="{ placeholder: t('components.orderInput.searchVariant') }"
						class="w-full"
						:ui="{ content: 'min-w-80' }"
						@update:model-value="onVariantSelected"
					>
						<template #default>
							<div class="min-w-0 text-left py-0.5">
								<p class="text-sm text-default truncate">
									<span class="font-medium">{{ prodVariantCode }}</span>
									<span v-if="prodVariantName" class="text-muted"> · {{ prodVariantName }}</span>
								</p>
								<p class="text-xs text-muted truncate">
									{{ t('components.orderInput.sellerSku') }}: {{ prodVariantSku?.trim() || '—' }}
									<span class="mx-1">·</span>
									{{ formatCurrency(unitSellPrice, currencyCode) }}
								</p>
							</div>
						</template>
						<template #item="{ item }">
							<div class="min-w-0 py-0.5">
								<p class="text-sm text-default truncate">
									<span class="font-medium">{{ item.variant_code }}</span>
									<span v-if="item.name" class="text-muted"> · {{ item.name }}</span>
								</p>
								<p class="text-xs text-muted truncate">
									{{ t('components.orderInput.sellerSku') }}: {{ item.sku?.trim() || '—' }}
									<span class="mx-1">·</span>
									{{ formatVariantPrice(item) }}
								</p>
							</div>
						</template>
					</USelectMenu>
				</UFormField>
			</div>
		</UCard>

		<!-- Appointment (optional) -->
		<UCard v-if="appointment" class="card">
			<template #header>
				<div class="flex items-center gap-2">
					<UIcon :name="ICONS.CALENDAR" class="w-5 h-5 text-muted" />
					<h2 class="text-base font-semibold text-default">{{ t('components.orderInput.appointment') }}</h2>
				</div>
			</template>
			<p class="text-sm text-muted mb-4">#{{ appointment.code }}</p>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<UFormField :label="t('components.orderInput.date')" name="appointment_date">
					<ZSelectMenuDateTime
						v-model:date-time="appointmentDate"
						:placeholder="t('components.orderInput.appointmentDate')"
						:min-date="new Date()"
						:max-date="new Date(new Date().setMonth(new Date().getMonth() + 2))"
						class="w-full"
					/>
				</UFormField>
				<UFormField :label="t('common.status')" name="appointment_status">
					<ZSelectMenuAppointmentStatus v-model:status="appointmentStatus" />
				</UFormField>
			</div>
		</UCard>

		<!-- Pricing -->
		<UCard class="card">
			<template #header>
				<div class="flex items-center gap-2">
					<UIcon :name="ICONS.CURRENCY" class="w-5 h-5 text-muted" />
					<h2 class="text-base font-semibold text-default">{{ t('components.orderInput.pricing') }}</h2>
				</div>
			</template>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<UFormField :label="t('components.orderInput.currency')" name="currency" disabled>
					<ZSelectMenuCurrency :currency-code="currencyCode" class="w-full" />
				</UFormField>
				<UFormField v-slot="{ error }" :label="t('components.orderDetail.unitSellPrice')" name="unit_sell_price" disabled>
					<UInput
						:model-value="unitSellPrice.toFixed(2)"
						:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
						:placeholder="t('components.orderInput.unitSellPricePlaceholder')"
						class="w-full"
						disabled
					/>
				</UFormField>
			</div>
			<div class="mt-4 pt-4 border-t border-default/10 flex items-center justify-end gap-2">
				<span class="text-sm text-muted">{{ t('components.orderInput.totalPrice') }}</span>
				<span class="text-lg font-semibold text-default">{{ currencyCode }} {{ netTotal.toFixed(2) }}</span>
			</div>
		</UCard>
	</div>
</template>

<script lang="ts" setup>
import { ZSelectMenuDateTime } from '#components';
import { formatCurrency, OrderItemStatus } from 'yeppi-common';
import type { AppointmentModel } from '~/utils/models';
import type { ProductVariant } from '~/utils/types/product-variant';
import { getOrderItemStatusOptions, getOrderItemStatusColor } from '~/utils/options';
import { ICONS } from '~/utils/icons';
import { mapCatalogVariantToOrderItemFields, resolveCatalogVariantSellPrice } from '~/utils/order-item-variant';
import { failedNotification } from '~/stores/AppUi/AppUi';

const { $api } = useNuxtApp();
const { t } = useI18n();
const isLoading = ref(false);
const prodVariants = ref<ProductVariant[]>([]);

const props = defineProps<{
	status: OrderItemStatus;
	prodCode: string;
	prodName: string;
	prodVariantCode?: string;
	prodVariantName?: string;
	prodVariantSku?: string;
	prodVariantBarcode?: string;
	currencyCode: string;
	orderQty: number;
	unitSellPrice: number;
	origSellPrice?: number;
	isPreorder?: boolean;
	appointment?: AppointmentModel;
}>();

const itemStatusOptions = computed(() => getOrderItemStatusOptions(t).filter((o) => o.value !== 'All'));
const itemStatusLabel = computed(() => itemStatusOptions.value.find((o) => o.value === props.status)?.label ?? props.status);
const showsPreorderBadge = computed(() => !!props.isPreorder && props.status !== OrderItemStatus.VOIDED);

onMounted(async () => {
	if (!props.prodVariantCode) {
		return;
	}

	isLoading.value = true;

	try {
		const { variants } = await $api.productVariant.getVariantsByProdCode(props.prodCode);
		prodVariants.value = variants;
	} catch (error) {
		console.error(error);
		failedNotification(t('components.orderInput.variantLoadFailed'));
	} finally {
		isLoading.value = false;
	}
});

const emit = defineEmits([
	'update:status',
	'update:orderQty',
	'update:appointment',
	'update:prodVariantCode',
	'update:prodVariantName',
	'update:prodVariantSku',
	'update:prodVariantBarcode',
	'update:unitSellPrice',
	'update:origSellPrice',
]);

const status = computed({
	get() {
		return props.status;
	},
	set(value: OrderItemStatus) {
		emit('update:status', value);
	},
});

const orderQty = computed({
	get() {
		return props.orderQty;
	},
	set(value) {
		emit('update:orderQty', value);
	},
});

const appointmentStatus = computed({
	get() {
		return props.appointment?.status;
	},
	set(value) {
		emit('update:appointment', { ...props.appointment, status: value } as AppointmentModel);
	},
});

const appointmentDate = computed({
	get() {
		return props.appointment?.start_date_time;
	},
	set(value) {
		emit('update:appointment', {
			...props.appointment,
			start_date_time: value,
			end_date_time: value,
		} as AppointmentModel);
	},
});

const netTotal = computed(() => {
	return props.unitSellPrice * orderQty.value;
});

function formatVariantPrice(variant: ProductVariant): string {
	const price = resolveCatalogVariantSellPrice(variant);
	if (price == null) {
		return '—';
	}
	const currency = variant.price_types?.[0]?.currency_code ?? props.currencyCode;
	return formatCurrency(price, currency);
}

function onVariantSelected(code: string | undefined) {
	if (!code || code === props.prodVariantCode) {
		return;
	}

	const variant = prodVariants.value.find((entry) => entry.variant_code === code);
	if (!variant) {
		return;
	}

	const mapped = mapCatalogVariantToOrderItemFields(variant);
	if (!mapped) {
		failedNotification(t('components.orderInput.variantPriceMissing'));
		return;
	}

	emit('update:prodVariantCode', mapped.prod_variant_code);
	emit('update:prodVariantName', mapped.prod_variant_name);
	emit('update:prodVariantSku', mapped.prod_variant_sku);
	emit('update:prodVariantBarcode', mapped.prod_variant_barcode);
	emit('update:unitSellPrice', mapped.unit_sell_price);
	emit('update:origSellPrice', mapped.orig_sell_price);
}
</script>

<style scoped>
/* Cards */
.card {
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	transition: box-shadow 0.2s ease;
}

.card:hover {
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
