<template>
	<UCard :ui="{ body: 'p-0 sm:p-0' }">
		<template #header>
			<div class="card-header gap-3">
				<div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
					<h2 class="card-title">
						<UIcon :name="ICONS.PRODUCT" class="w-5 h-5" aria-hidden="true" />
						{{ t('components.orderDetail.orderItems') }}
					</h2>
					<p data-testid="order-item-workload" class="text-sm text-muted tabular-nums">
						{{ t('components.orderDetail.activeItemWorkload', { lines: workload.activeLineCount, units: workload.activeUnitCount }) }}
					</p>
				</div>
				<div class="flex flex-wrap items-center justify-end gap-2">
					<UBadge v-if="workload.excludedLineCount" data-testid="order-item-excluded-count" color="neutral" variant="subtle">
						{{ t('components.orderDetail.excludedItemCount', { count: workload.excludedLineCount }) }}
					</UBadge>
					<span v-if="order_detail_items_editable" class="inline-flex items-center gap-1 text-xs text-success font-medium">
						<UIcon name="i-heroicons-pencil" class="size-3" aria-hidden="true" />
						{{ t('components.orderDetail.editable') }}
					</span>
				</div>
			</div>
		</template>

		<div data-testid="order-item-mobile-list" class="divide-y divide-default md:hidden">
			<template v-for="(item, index) in ordered_items" :key="item.item_line">
				<div v-if="workload.excludedLineCount && index === workload.activeLineCount" class="flex items-center justify-between gap-3 bg-elevated/40 px-4 py-2.5">
					<p class="text-xs font-semibold uppercase tracking-wide text-muted">
						{{ t('components.orderDetail.excludedFromFulfillment') }}
					</p>
					<UBadge color="neutral" variant="subtle" size="sm">{{ workload.excludedLineCount }}</UBadge>
				</div>
				<article data-testid="order-item-mobile-card" class="px-4 py-4" :class="item.status === OrderItemStatus.ACTIVE ? 'bg-default' : 'bg-elevated/25'">
					<div class="flex items-start gap-3">
						<img
							:src="itemThumbnailUrl(item)"
							:alt="item.prod_name || t('table.productThumbnail')"
							width="56"
							height="56"
							class="size-14 rounded-lg object-cover shrink-0 bg-elevated"
						/>
						<div class="min-w-0 flex-1 space-y-1">
							<p
								v-if="productLineText(item)"
								class="text-sm font-semibold leading-5 text-highlighted wrap-anywhere"
								:class="{ 'line-through text-muted': item.status === OrderItemStatus.VOIDED }"
							>
								{{ productLineText(item) }}
							</p>
							<p
								v-if="variantLineText(item)"
								data-testid="order-item-variant-line"
								class="order-item-variant-line"
								:class="{ 'is-voided': item.status === OrderItemStatus.VOIDED }"
							>
								{{ variantLineText(item) }}
							</p>
							<UBadge v-if="item.status !== OrderItemStatus.ACTIVE" :color="getOrderItemStatusColor(item.status)" variant="subtle" size="sm">
								{{ itemStatusLabel(item.status) }}
							</UBadge>
						</div>
						<div class="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1.5 text-center text-primary ring ring-inset ring-primary/20">
							<p class="text-[0.625rem] font-semibold uppercase leading-3 tracking-wide">{{ t('components.orderDetail.qty') }}</p>
							<p class="text-lg font-bold leading-5 tabular-nums">×{{ item.qty }}</p>
						</div>
					</div>

					<div v-if="item.appointment" class="mt-3 flex items-start gap-2 rounded-lg bg-info/5 px-3 py-2 ring ring-inset ring-info/15">
						<UIcon :name="ICONS.CALENDAR" class="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
						<div class="min-w-0 text-xs">
							<p v-if="item.appointment.code" class="font-mono text-muted">{{ item.appointment.code }}</p>
							<p class="text-default">{{ formatAppointmentDateRange(item.appointment.start_date_time, item.appointment.end_date_time) }}</p>
						</div>
					</div>

					<div class="mt-3 flex items-end justify-between gap-3 border-t border-default pt-3">
						<div class="grid min-w-0 flex-1 grid-cols-2 gap-3">
							<div>
								<p class="text-xs text-muted">{{ t('components.orderDetail.unitPrice') }}</p>
								<p class="text-sm tabular-nums text-default">{{ formatCurrency(item.unit_sell_price, currency_code) }}</p>
							</div>
							<div class="text-right">
								<p class="text-xs text-muted">{{ t('components.orderDetail.price') }}</p>
								<p class="text-sm font-semibold tabular-nums text-highlighted">
									{{ item.status === OrderItemStatus.ACTIVE ? formatCurrency(item.net_amt, currency_code) : formatCurrency(0, currency_code) }}
								</p>
							</div>
						</div>
						<UButton
							v-if="order_detail_items_editable && item.status === OrderItemStatus.ACTIVE"
							data-testid="order-item-edit"
							color="primary"
							variant="soft"
							size="sm"
							icon="i-heroicons-pencil-square"
							class="min-h-11 shrink-0"
							:aria-label="t('components.orderDetail.editOrderItem', { item: productLineText(item) || item.prod_name })"
							@click="openOrderItemEdit(item)"
						>
							{{ t('components.orderDetail.edit') }}
						</UButton>
					</div>
				</article>
			</template>
		</div>

		<UTable
			data-testid="order-item-table"
			:data="ordered_items"
			:columns="order_detail_item_columns"
			:meta="order_items_table_meta"
			:ui="{ td: 'align-top whitespace-normal' }"
			class="hidden w-full md:block"
		>
			<template #item-cell="{ row }">
				<div class="flex items-start gap-3 min-w-0" :class="{ 'opacity-60': row.original.status !== OrderItemStatus.ACTIVE }">
					<img
						:src="itemThumbnailUrl(row.original)"
						:alt="row.original.prod_name || t('table.productThumbnail')"
						width="48"
						height="48"
						class="size-12 rounded-md object-cover shrink-0 bg-elevated"
					/>
					<div class="min-w-0 flex-1 space-y-1">
						<p
							v-if="productLineText(row.original)"
							class="font-medium text-sm text-highlighted leading-5 wrap-anywhere"
							:class="{ 'line-through text-muted': row.original.status === OrderItemStatus.VOIDED }"
						>
							{{ productLineText(row.original) }}
						</p>
						<p
							v-if="variantLineText(row.original)"
							data-testid="order-item-variant-line"
							class="order-item-variant-line"
							:class="{ 'is-voided': row.original.status === OrderItemStatus.VOIDED }"
						>
							{{ variantLineText(row.original) }}
						</p>
						<UBadge v-if="row.original.status !== OrderItemStatus.ACTIVE" :color="getOrderItemStatusColor(row.original.status)" variant="subtle" size="sm">
							{{ itemStatusLabel(row.original.status) }}
						</UBadge>
						<div v-if="row.original.appointment" class="flex items-start gap-1.5 pt-0.5">
							<UIcon :name="ICONS.CALENDAR" class="size-4 shrink-0 mt-0.5 text-muted" aria-hidden="true" />
							<div class="min-w-0 flex flex-col text-xs">
								<span v-if="row.original.appointment.code" class="font-mono text-muted">{{ row.original.appointment.code }}</span>
								<span class="text-default">
									{{ formatAppointmentDateRange(row.original.appointment.start_date_time, row.original.appointment.end_date_time) }}
								</span>
							</div>
						</div>
						<UButton
							v-if="order_detail_items_editable && row.original.status === OrderItemStatus.ACTIVE"
							data-testid="order-item-edit"
							color="primary"
							variant="link"
							size="sm"
							icon="i-heroicons-pencil-square"
							class="min-h-11 px-0"
							:aria-label="t('components.orderDetail.editOrderItem', { item: productLineText(row.original) || row.original.prod_name })"
							@click="openOrderItemEdit(row.original)"
						>
							{{ t('components.orderDetail.edit') }}
						</UButton>
					</div>
				</div>
			</template>
			<template #unitSellPrice-cell="{ row }">
				<span class="tabular-nums" :class="row.original.status === OrderItemStatus.VOIDED ? 'text-muted line-through' : 'text-default'">
					{{ formatCurrency(row.original.unit_sell_price, currency_code) }}
				</span>
			</template>
			<template #qty-cell="{ row }">
				<span class="tabular-nums font-medium" :class="row.original.status === OrderItemStatus.VOIDED ? 'text-muted line-through' : 'text-highlighted'">
					{{ row.original.qty }}
				</span>
			</template>
			<template #lineTotal-cell="{ row }">
				<span class="tabular-nums font-medium" :class="row.original.status === OrderItemStatus.VOIDED ? 'text-muted line-through' : 'text-highlighted'">
					{{ row.original.status == OrderItemStatus.ACTIVE ? formatCurrency(row.original.net_amt, currency_code) : 0 }}
				</span>
			</template>
		</UTable>

		<div class="order-items-bill-summary border-t border-default">
			<dl class="ms-auto w-full max-w-md divide-y divide-default">
				<div class="flex items-start justify-between gap-6 px-4 py-3">
					<dt class="text-sm text-muted">{{ t('components.orderDetail.subTotal') }}</dt>
					<dd class="text-sm font-semibold tabular-nums text-highlighted">{{ formatCurrency(order.gross_amt ?? 0, currency_code) }}</dd>
				</div>
				<div v-if="(order.order_type ?? OrderType.PICKUP) === OrderType.DELIVERY" class="flex items-start justify-between gap-6 px-4 py-3">
					<dt class="min-w-0 text-sm text-muted">
						{{ t('components.fulfillment.shippingFee') }}
						<span v-if="shipping_fee_method_hint" class="font-bold not-italic text-default">({{ shipping_fee_method_hint }})</span>
					</dt>
					<dd class="shrink-0 text-sm font-semibold tabular-nums text-highlighted">
						{{ formatCurrency(shipping_fee_total, currency_code) }}
					</dd>
				</div>
				<div v-for="discount in header_discounts" :key="`${discount.disc_line}-${discount.disc_code}`" class="flex items-start justify-between gap-6 px-4 py-3">
					<dt class="min-w-0 text-sm text-muted">
						{{ discount.disc_desc }}
						<span v-if="discount.disc_code" class="font-bold not-italic">({{ discount.disc_code }})</span>
					</dt>
					<dd class="shrink-0 tabular-nums text-error">-{{ formatCurrency(discount.disc_amt, currency_code) }}</dd>
				</div>
				<div v-for="tax in order.taxes ?? []" :key="tax.tax_code" class="flex items-start justify-between gap-6 px-4 py-3">
					<dt class="text-sm text-muted">{{ tax.tax_desc }}</dt>
					<dd class="tabular-nums text-error">-{{ formatCurrency(tax.tax_amt, currency_code) }}</dd>
				</div>
				<div class="flex items-start justify-between gap-6 px-4 py-3.5">
					<dt class="text-sm font-semibold text-highlighted">{{ t('components.orderDetail.netTotal') }}</dt>
					<dd class="text-base font-semibold tabular-nums text-highlighted">{{ formatCurrency(order.payable_total ?? 0, currency_code) }}</dd>
				</div>
			</dl>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import type { TableMeta, Row } from '@tanstack/vue-table';
import { ZModalInformation, ZModalOrderDetailItem } from '#components';
import { OrderItemStatus, OrderStatus, OrderType, formatCurrency, GROUP_CODE, PRODUCT } from 'yeppi-common';
import { ICONS } from '~/utils/icons';
import type { ItemModel } from '~/utils/models/item.model';
import type { OrderHistory } from '~/utils/types/order-history';
import { getOrderDetailItemColumns } from '~/utils/table-columns';
import { getFulfillmentMethodDescriptions, sumFulfillmentShippingFees } from '~/utils/fulfillment';
import { formatAppointmentDateRange } from '~/utils/utils';
import { visibleOrderHeaderDiscounts } from '~/utils/order-header-discounts';
import { formatProductLineIdentity, formatVariantLineIdentity } from '~/utils/line-identity';
import { getOrderItemStatusColor, getOrderItemStatusOptions } from '~/utils/options';
import { getOrderItemWorkload } from '~/utils/order-workbench';

const PRODUCT_THUMBNAIL_FALLBACK = '/svg/product-holder.svg';

const props = defineProps<{
	order: OrderHistory;
}>();

const emit = defineEmits<{
	refresh: [];
}>();

const { t } = useI18n();
const overlay = useOverlay();
const settingsStore = useSettingStore();

const product_line_identity = computed(() => settingsStore.getSetting(GROUP_CODE.PRODUCT, PRODUCT.PRODUCT_LINE_IDENTITY)?.getString() ?? '');
const variant_line_identity = computed(() => settingsStore.getSetting(GROUP_CODE.PRODUCT, PRODUCT.VARIANT_LINE_IDENTITY)?.getString() ?? '');

const productLineText = (item: ItemModel) => formatProductLineIdentity(item, product_line_identity.value);
const variantLineText = (item: ItemModel) => formatVariantLineIdentity(item, variant_line_identity.value);

const itemStatusLabel = (status: OrderItemStatus) => getOrderItemStatusOptions(t).find((option) => option.value === status)?.label ?? status;

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

const workload = computed(() => getOrderItemWorkload(props.order.items ?? []));
const ordered_items = computed(() => [...workload.value.activeItems, ...workload.value.excludedItems]);
const currency_code = computed(() => props.order.currency?.code);
const header_discounts = computed(() => visibleOrderHeaderDiscounts(props.order.discounts));

const shipping_fee_method_hint = computed(() => {
	return getFulfillmentMethodDescriptions(props.order.fulfillments ?? []).join(', ');
});

const shipping_fee_total = computed(() => sumFulfillmentShippingFees(props.order.fulfillments ?? []));

const order_detail_items_editable = computed(() => props.order.status === OrderStatus.PENDING_PAYMENT);

const order_detail_item_columns = computed(() => getOrderDetailItemColumns(t));

const order_items_table_meta = computed<TableMeta<ItemModel>>(() => ({
	class: {
		tr: (row: Row<ItemModel>) => {
			if (row.original === workload.value.excludedItems[0]) return 'border-t-2 border-default bg-elevated/30';
			return row.original.status === OrderItemStatus.ACTIVE ? '' : 'bg-elevated/30';
		},
	},
}));

const openOrderItemEdit = (item: ItemModel) => {
	if (item.status === OrderItemStatus.ACTIVE) {
		const itemModal = overlay.create(ZModalOrderDetailItem, {
			props: {
				order: props.order,
				item: JSON.parse(JSON.stringify(item)),
				onCancel: () => {
					itemModal.close();
				},
				onUpdate: (requiresRefresh: boolean) => {
					if (requiresRefresh) {
						emit('refresh');
					}
					itemModal.close();
				},
			},
		});

		itemModal.open();
	} else {
		const infoModal = overlay.create(ZModalInformation, {
			props: {
				title: 'Warning',
				message: 'Unable to edit this item because it is already voided by customer.',
				action: 'confirm',
				onConfirm: () => {
					infoModal.close();
				},
			},
		});

		infoModal.open();
	}
};
</script>

<style scoped>
.card-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	flex-wrap: wrap;
}

.card-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--ui-text-highlighted);
}

.order-item-variant-line {
	font-size: 1rem;
	font-weight: 500;
	line-height: 1.25rem;
	color: var(--ui-text-highlighted);
	overflow-wrap: anywhere;
}

.order-item-variant-line.is-voided {
	text-decoration: line-through;
	color: var(--ui-text-muted);
}
</style>
