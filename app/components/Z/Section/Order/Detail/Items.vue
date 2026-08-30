<template>
	<UCard class="items-card">
		<template #header>
			<div class="card-header">
				<h2 class="card-title">
					<UIcon :name="ICONS.PRODUCT" class="w-5 h-5" />
					{{ t('components.orderDetail.orderItems') }}
				</h2>
				<div class="flex items-center gap-2">
					<span v-if="order.status === OrderStatus.PENDING_PAYMENT" class="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
						<UIcon name="i-heroicons-pencil" class="w-3 h-3" />
						{{ t('components.orderDetail.editable') }}
					</span>
					<span v-else-if="order.status === OrderStatus.COMPLETED" class="text-xs text-green-600 font-medium">
						<UIcon name="i-heroicons-pencil" class="w-3 h-3" />
						{{ t('components.orderDetail.editable') }}
					</span>
					<UPopover v-else overlay>
						<UButton color="neutral" :trailing-icon="ICONS.QUESTION_MARK" variant="soft" size="xs" />
						<template #content>
							<div class="p-4 max-w-xs">
								<p class="text-sm">
									{{ t('components.orderDetail.orderNotEditableMessage') }}<br />
									<b class="text-primary">{{ t('components.orderDetail.changeStatusToEdit') }}</b>
								</p>
							</div>
						</template>
					</UPopover>
				</div>
			</div>
		</template>

		<UTable :data="items" :columns="order_detail_item_columns" :meta="order_items_table_meta" class="w-full" @select="onOrderItemRowSelect">
			<template #item-cell="{ row }">
				<div class="flex items-center gap-2">
					<div>
						<div v-if="row.original.status == OrderItemStatus.ACTIVE">
							<UIcon :name="ICONS.CHECK_OUTLINE_ROUNDED" class="text-green-500 w-5 h-5" />
						</div>
						<div v-else-if="row.original.status == OrderItemStatus.REFUNDED">
							<UIcon :name="ICONS.ERROR_OUTLINE" class="text-red-500 w-5 h-5" />
						</div>
						<div v-else-if="row.original.status == OrderItemStatus.VOIDED">
							<UIcon :name="ICONS.ERROR_OUTLINE" class="text-red-500 w-5 h-5" />
						</div>
					</div>

					<div class="ml-2">
						<div
							v-if="productLineText(row.original)"
							class="font-medium"
							:class="{ 'italic text-neutral-300': row.original.status == OrderItemStatus.VOIDED }"
						>
							{{ productLineText(row.original) }}
						</div>
						<div v-if="variantLineText(row.original)" class="text-xs italic text-neutral-300">
							{{ variantLineText(row.original) }}
						</div>

						<div v-if="row.original.appointment" class="flex items-center gap-2 mt-2">
							<UIcon :name="ICONS.CALENDAR" class="w-5 h-5" />
							<div class="flex flex-col text-xs font-bold italic">
								<span class="text-neutral-400">{{ row.original.appointment.code }}</span>
								{{ formatAppointmentDateRange(row.original.appointment.start_date_time, row.original.appointment.end_date_time) }}
							</div>
						</div>
					</div>
				</div>
			</template>
			<template #unitSellPrice-cell="{ row }">
				<span :class="{ 'italic text-neutral-300': row.original.status == OrderItemStatus.VOIDED }">
					{{ formatCurrency(row.original.unit_sell_price, currency_code) }}
				</span>
			</template>
			<template #qty-cell="{ row }">
				<span :class="{ 'italic text-neutral-300': row.original.status == OrderItemStatus.VOIDED }">{{ row.original.qty }}</span>
			</template>
			<template #lineTotal-cell="{ row }">
				<span :class="{ 'italic text-neutral-300': row.original.status == OrderItemStatus.VOIDED }">
					{{ row.original.status == OrderItemStatus.ACTIVE ? formatCurrency(row.original.net_amt, currency_code) : 0 }}
				</span>
			</template>
		</UTable>

		<div class="order-items-bill-summary border-default divide-y divide-default border-t">
			<div class="grid grid-cols-[2fr_1fr_1fr_1fr] items-center">
				<div class="col-span-2" />
				<div class="p-4 text-left text-muted italic font-normal">{{ t('components.orderDetail.subTotal') }}</div>
				<div class="p-4 text-center font-bold text-lg italic">{{ formatCurrency(order.gross_amt ?? 0, currency_code) }}</div>
			</div>
			<div v-if="(order.order_type ?? OrderType.PICKUP) === OrderType.DELIVERY" class="grid grid-cols-[2fr_1fr_1fr_1fr] items-center">
				<div class="col-span-2" />
				<div class="p-4 text-left text-muted italic font-normal">
					{{ t('components.fulfillment.shippingFee') }}
					<span v-if="shipping_fee_method_hint" class="font-bold not-italic">({{ shipping_fee_method_hint }})</span>
				</div>
				<div class="p-4 text-center font-bold text-lg italic">
					<div class="flex flex-col items-center gap-0.5">
						<span>{{ formatCurrency(shipping_fee_total, currency_code) }}</span>
					</div>
				</div>
			</div>
			<div
				v-for="discount in header_discounts"
				:key="`${discount.disc_line}-${discount.disc_code}`"
				class="grid grid-cols-[2fr_1fr_1fr_1fr] items-center"
			>
				<div class="col-span-2" />
				<div class="p-4 text-left text-muted italic font-normal">
					{{ discount.disc_desc }}
					<span v-if="discount.disc_code" class="font-bold not-italic">({{ discount.disc_code }})</span>
				</div>
				<div class="p-4 text-center text-error italic">-{{ formatCurrency(discount.disc_amt, currency_code) }}</div>
			</div>
			<div v-for="tax in order.taxes ?? []" :key="tax.tax_code" class="grid grid-cols-[2fr_1fr_1fr_1fr] items-center">
				<div class="col-span-2" />
				<div class="p-4 text-left text-muted italic font-normal">{{ tax.tax_desc }}</div>
				<div class="p-4 text-center text-error italic">-{{ formatCurrency(tax.tax_amt, currency_code) }}</div>
			</div>
			<div class="grid grid-cols-[2fr_1fr_1fr_1fr] items-center border-b-4 border-double border-default">
				<div class="col-span-2" />
				<div class="p-4 text-left italic font-bold">{{ t('components.orderDetail.netTotal') }}</div>
				<div class="p-4 text-center font-bold text-lg italic">{{ formatCurrency(order.payable_total ?? 0, currency_code) }}</div>
			</div>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import type { TableRow } from '@nuxt/ui';
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

const props = defineProps<{
	order: OrderHistory;
}>();

const emit = defineEmits<{
	refresh: [];
}>();

const { t } = useI18n();
const overlay = useOverlay();
const settingsStore = useSettingStore();

const product_line_identity = computed(
	() => settingsStore.getSetting(GROUP_CODE.PRODUCT, PRODUCT.PRODUCT_LINE_IDENTITY)?.getString() ?? '',
);
const variant_line_identity = computed(
	() => settingsStore.getSetting(GROUP_CODE.PRODUCT, PRODUCT.VARIANT_LINE_IDENTITY)?.getString() ?? '',
);

const productLineText = (item: ItemModel) => formatProductLineIdentity(item, product_line_identity.value);
const variantLineText = (item: ItemModel) => formatVariantLineIdentity(item, variant_line_identity.value);

const items = computed(() => props.order.items ?? []);
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
		tr: (row: Row<ItemModel>) =>
			order_detail_items_editable.value && row.original.status === OrderItemStatus.ACTIVE ? 'cursor-pointer hover:bg-neutral-50' : '',
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

const onOrderItemRowSelect = (_e: Event, row: TableRow<ItemModel>) => {
	const item = row.original;
	if (!item || !order_detail_items_editable.value) return;
	if (item.status !== OrderItemStatus.ACTIVE) return;
	openOrderItemEdit(item);
};
</script>

<style scoped>
.card-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.card-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 1.125rem;
	font-weight: 600;
	color: var(--color-gray-800);
}

.items-card {
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	transition: box-shadow 0.2s ease;
}

.items-card:hover {
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
