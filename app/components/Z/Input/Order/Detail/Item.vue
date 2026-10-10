<template>
	<div class="space-y-6">
		<!-- Product & status -->
		<UCard class="card">
			<div class="flex flex-col gap-4">
				<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div class="flex items-start gap-3 min-w-0">
						<div class="shrink-0 rounded-lg bg-elevated p-2">
							<UIcon :name="ICONS.CUBE" class="w-6 h-6 text-muted" aria-hidden="true" />
						</div>
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<h2 class="font-semibold text-default truncate">#{{ prodCode }}</h2>
								<div
									v-if="showsPreorderBadge"
									data-testid="order-item-preorder"
									class="status-split text-inverted bg-warning-500"
									:title="t('components.orderDetail.preorder')"
								>
									<span class="status-pill-label">{{ t('components.orderDetail.preorder') }}</span>
								</div>
							</div>
							<p class="text-sm text-muted mt-0.5 truncate">{{ prodName }}</p>
						</div>
					</div>
					<div class="status-control shrink-0" data-testid="order-item-status">
						<div class="status-split text-inverted" :class="itemStatusPillClass" :title="itemStatusLabel">
							<ZSelectMenuOrderItemStatus appearance="pill" :allow-all="false" :status="status" @update:status="onItemStatusSelected" />
						</div>
					</div>
				</div>

				<div v-if="comboItems.length" data-testid="order-item-combo-nested" class="space-y-1.5">
					<p class="text-xs font-medium text-muted">{{ t('components.orderInput.includes') }}</p>
					<div
						v-for="child in comboItems"
						:key="child.item_line"
						data-testid="order-item-combo-child"
						class="flex items-start gap-2 rounded-md bg-elevated/50 py-1.5 pl-2 pr-2"
					>
						<img
							:src="resolvedThumbnailUrl(child)"
							:alt="child.prod_name || t('table.productThumbnail')"
							width="32"
							height="32"
							class="size-8 rounded object-cover shrink-0 bg-elevated"
							@error="onThumbnailError(child)"
						/>
						<p class="min-w-0 flex-1 text-xs text-muted wrap-break-word">
							{{ child.prod_name }}<template v-if="child.prod_variant_name"> ({{ child.prod_variant_name }})</template>
						</p>
						<span class="shrink-0 text-xs font-medium tabular-nums text-muted">×{{ child.qty }}</span>
					</div>
				</div>

				<UFormField
					v-if="prodVariantCode && !isComboHeader"
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
					<UIcon :name="ICONS.CALENDAR" class="w-5 h-5 text-muted" aria-hidden="true" />
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
					<UIcon :name="ICONS.CURRENCY" class="w-5 h-5 text-muted" aria-hidden="true" />
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
import { formatCurrency, LineType, OrderItemStatus } from 'yeppi-common';
import type { AppointmentModel } from '~/utils/models';
import type { ItemModel } from '~/utils/models/item.model';
import type { ProductVariant } from '~/utils/types/product-variant';
import { getOrderItemStatusOptions, getOrderItemStatusColor } from '~/utils/options';
import { ICONS } from '~/utils/icons';
import { mapCatalogVariantToOrderItemFields, resolveCatalogVariantSellPrice } from '~/utils/order-item-variant';
import { failedNotification } from '~/stores/AppUi/AppUi';

const PRODUCT_THUMBNAIL_FALLBACK = '/svg/product-holder.svg';

const { $api } = useNuxtApp();
const { t } = useI18n();
const isLoading = ref(false);
const prodVariants = ref<ProductVariant[]>([]);
const brokenThumbnailLines = ref(new Set<number>());

const props = withDefaults(
	defineProps<{
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
		lineType?: LineType;
		comboItems?: ItemModel[];
	}>(),
	{
		comboItems: () => [],
	},
);

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

const itemStatusLabel = computed(() => getOrderItemStatusOptions(t).find((o) => o.value === props.status)?.label ?? props.status);
const itemStatusPillClass = computed(() => pillClassForColor(getOrderItemStatusColor(props.status)));
const showsPreorderBadge = computed(() => !!props.isPreorder && props.status !== OrderItemStatus.VOIDED);
const isComboHeader = computed(() => props.lineType === LineType.COMBO_HEADER);

const itemThumbnailUrl = (item: ItemModel) => {
	const fromThumb = item.thumbnail?.url?.trim();
	if (fromThumb) return fromThumb;

	const nested = item.metadata?.thumbnail;
	if (nested && typeof nested === 'object' && 'url' in nested) {
		const url = String((nested as { url?: unknown }).url ?? '').trim();
		if (url) return url;
	}

	return PRODUCT_THUMBNAIL_FALLBACK;
};

const resolvedThumbnailUrl = (item: ItemModel) => {
	if (brokenThumbnailLines.value.has(item.item_line)) return PRODUCT_THUMBNAIL_FALLBACK;
	return itemThumbnailUrl(item);
};

const onThumbnailError = (item: ItemModel) => {
	if (brokenThumbnailLines.value.has(item.item_line)) return;
	const next = new Set(brokenThumbnailLines.value);
	next.add(item.item_line);
	brokenThumbnailLines.value = next;
};

onMounted(async () => {
	if (!props.prodVariantCode || isComboHeader.value) {
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

function onItemStatusSelected(value: OrderItemStatus | undefined) {
	if (!value || value === props.status) {
		return;
	}
	emit('update:status', value);
}

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

.status-pill-label {
	display: inline-flex;
	align-items: center;
	min-width: 0;
	padding: 0.25rem 0.625rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 0.6875rem;
	font-weight: 600;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: inherit;
}
</style>
