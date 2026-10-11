<template>
	<div class="space-y-3">
		<div class="flex items-center justify-between gap-3">
			<div class="min-w-0">
				<h3 id="combo-included-items-heading" class="text-lg font-semibold">{{ t('combo.includedItems') }}</h3>
				<p class="text-xs text-neutral-500 mt-0.5">{{ t('combo.includedItemsHint') }}</p>
			</div>
			<UButton icon="i-lucide-plus" :label="t('combo.addItems')" size="sm" class="shrink-0" @click="openAddItems" />
		</div>
		<UTable
			:data="rows"
			:columns="columns"
			:get-row-id="rowId"
			:ui="{
				root: 'relative overflow-x-auto',
				base: 'w-full text-sm',
				td: 'align-middle whitespace-normal',
			}"
		>
			<template #item-cell="{ row }">
				<div class="font-medium">{{ itemLabel(row.original).name }}</div>
				<div v-if="itemLabel(row.original).variant" class="text-xs text-muted">{{ itemLabel(row.original).variant }}</div>
			</template>
			<template #quantity-cell="{ row }">
				<div class="flex items-center gap-1">
					<UButton
						icon="i-lucide-minus"
						size="xs"
						color="neutral"
						variant="soft"
						:disabled="row.original.quantity <= 1"
						:aria-label="t('combo.decreaseQty')"
						@click="setQuantity(rowId(row.original), row.original.quantity - 1)"
					/>
					<span class="min-w-8 text-center tabular-nums" aria-live="polite">{{ row.original.quantity }}</span>
					<UButton
						icon="i-lucide-plus"
						size="xs"
						color="neutral"
						variant="soft"
						:aria-label="t('combo.increaseQty')"
						@click="setQuantity(rowId(row.original), row.original.quantity + 1)"
					/>
				</div>
			</template>
			<template #unitPrice-cell="{ row }">
				{{ formatMoney(unitPrice(row.original)) }}
			</template>
			<template #lineTotal-cell="{ row }">
				{{ formatLineTotal(row.original) }}
			</template>
			<template #actions-cell="{ row }">
				<UTooltip :text="t('combo.removeItem')">
					<UButton
						icon="i-lucide-trash-2"
						color="error"
						variant="ghost"
						:aria-label="t('combo.removeItem')"
						@click="removeComponent(rowId(row.original))"
					/>
				</UTooltip>
			</template>
		</UTable>
		<p class="text-sm text-muted">{{ t('combo.individualPricesHelper') }}</p>
		<p class="text-sm text-muted">
			{{ t('combo.availabilityHelper') }}
			<span class="font-medium text-default">
				{{ availability === null ? t('combo.unlimited') : availability }}
			</span>
		</p>
	</div>
</template>

<script setup lang="ts">
import { formatCurrency } from 'yeppi-common';
import { ZModalComboAddItems } from '#components';
import { computeComboPriceComparison, resolveComponentUnitPrice } from '~/utils/combo-pricing';
import { getComboComponentColumns } from '~/utils/table-columns';
import type { ComboAddItemsPayload } from '~/components/Z/Modal/Combo/AddItems.vue';
import type { Product, ComboComponent } from '~/utils/types/product';

const components = defineModel<ComboComponent[]>({ default: () => [] });
const referenceTotal = defineModel<number | null>('referenceTotal', { default: null });
const props = defineProps<{ productCode?: string; currencyCode?: string }>();
const rows = computed(() => components.value ?? []);
const { t } = useI18n();
const { $api } = useNuxtApp();
const overlay = useOverlay();
const names = reactive(new Map<string, Product>());
const columns = computed(() => getComboComponentColumns(t));

const rowId = (component: ComboComponent) => `${component.product_code}:${component.variant_code ?? ''}`;

const availability = computed(() => {
	if (!rows.value.length) return 0;
	let limit: number | null = null;
	for (const component of rows.value) {
		const product = names.get(component.product_code);
		if (!product) return 0;
		const grain = component.variant_code ? product.variants?.find((v) => v.variant_code === component.variant_code) : product;
		if (!grain) return 0;
		if (grain.manage_inventory) {
			limit = Math.min(limit ?? Infinity, Math.max(0, Math.floor((grain.inventory_quantity ?? 0) / component.quantity)));
		}
	}
	return limit;
});

function priceTypeFor(component: ComboComponent) {
	const product = names.get(component.product_code);
	if (!product) return null;
	const priceTypes = component.variant_code ? product.variants?.find((v) => v.variant_code === component.variant_code)?.price_types : product.price_types;
	if (!priceTypes?.length) return null;
	const expected = props.currencyCode;
	if (expected) {
		const match = priceTypes.find((pt) => pt.currency_code === expected);
		return match ?? null;
	}
	return priceTypes[0] ?? null;
}

function unitPrice(component: ComboComponent): number | null {
	const pt = priceTypeFor(component);
	if (!pt) return null;
	if (props.currencyCode && pt.currency_code && pt.currency_code !== props.currencyCode) return null;
	return resolveComponentUnitPrice(pt);
}

function formatMoney(amount: number | null): string {
	if (amount == null) return '—';
	try {
		return formatCurrency(amount, props.currencyCode || 'MYR');
	} catch {
		return '—';
	}
}

function formatLineTotal(component: ComboComponent): string {
	const unit = unitPrice(component);
	if (unit == null) return '—';
	return formatMoney(unit * component.quantity);
}

function itemLabel(component: ComboComponent) {
	const product = names.get(component.product_code);
	const variant = component.variant_code ? product?.variants?.find((v) => v.variant_code === component.variant_code) : undefined;
	return {
		name: product?.name ?? component.product_code,
		variant: variant?.name ?? component.variant_code ?? '',
	};
}

function ensureComponents(): ComboComponent[] {
	if (!components.value) components.value = [];
	return components.value;
}

function findIndex(id: string) {
	return ensureComponents().findIndex((component) => rowId(component) === id);
}

function setQuantity(id: string, next: number) {
	const index = findIndex(id);
	const row = ensureComponents()[index];
	if (!row) return;
	row.quantity = Math.max(1, Math.floor(next));
}

function removeComponent(id: string) {
	const index = findIndex(id);
	if (index < 0) return;
	ensureComponents().splice(index, 1);
}

function refreshReferenceTotal() {
	const lines = rows.value.map((component) => {
		const pt = priceTypeFor(component);
		return {
			unitPrice: unitPrice(component),
			quantity: component.quantity,
			currencyCode: pt?.currency_code ?? null,
		};
	});
	referenceTotal.value = computeComboPriceComparison(lines, null, props.currencyCode).referenceTotal;
}

function onAddItem({ product, variant_code }: ComboAddItemsPayload) {
	if (!product.code) return;
	const list = ensureComponents();
	const existing = list.find((c) => c.product_code === product.code && (c.variant_code || '') === (variant_code || ''));
	if (existing) existing.quantity += 1;
	else {
		list.push({
			product_code: product.code,
			variant_code,
			quantity: 1,
		});
	}
	names.set(product.code, product);
	refreshReferenceTotal();
}

async function openAddItems() {
	const modal = overlay.create(ZModalComboAddItems);
	const instance = modal.open({
		excludeProductCode: props.productCode,
	});
	const payload = await instance.result;
	if (!payload) return;
	onAddItem(payload);
}

watch(components, () => refreshReferenceTotal(), { deep: true });
watch(
	() => props.currencyCode,
	() => refreshReferenceTotal(),
);

onMounted(async () => {
	for (const code of new Set(rows.value.map((c) => c.product_code))) {
		try {
			const response = await $api.product.getSingle(code);
			if (response.product) names.set(code, response.product);
		} catch {
			// Keep existing rows; labels fall back to product_code until a later refresh.
		}
	}
	refreshReferenceTotal();
});
</script>
