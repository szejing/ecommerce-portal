<template>
	<section class="space-y-3">
		<div class="flex items-center justify-between gap-3">
			<h3 class="text-base font-semibold">{{ t('combo.includedItems') }}</h3>
			<UButton icon="i-lucide-plus" :label="t('combo.addItems')" size="sm" @click="open = true" />
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-sm text-left">
				<thead>
					<tr class="border-b">
						<th class="py-2">{{ t('combo.item') }}</th>
						<th class="w-36">{{ t('combo.quantity') }}</th>
						<th class="w-28">{{ t('combo.unitPrice') }}</th>
						<th class="w-28">{{ t('combo.lineTotal') }}</th>
						<th class="w-10" />
					</tr>
				</thead>
				<tbody>
					<tr v-for="(component, index) in rows" :key="`${component.product_code}:${component.variant_code ?? ''}`" class="border-b">
						<td class="py-3 pr-2">
							<div class="font-medium">{{ itemLabel(component).name }}</div>
							<div v-if="itemLabel(component).variant" class="text-xs text-muted">{{ itemLabel(component).variant }}</div>
						</td>
						<td class="pr-2">
							<div class="flex items-center gap-1">
								<UButton
									icon="i-lucide-minus"
									size="xs"
									color="neutral"
									variant="soft"
									:disabled="component.quantity <= 1"
									:aria-label="t('combo.decreaseQty')"
									@click="setQuantity(index, component.quantity - 1)"
								/>
								<span class="min-w-8 text-center tabular-nums" aria-live="polite">{{ component.quantity }}</span>
								<UButton
									icon="i-lucide-plus"
									size="xs"
									color="neutral"
									variant="soft"
									:aria-label="t('combo.increaseQty')"
									@click="setQuantity(index, component.quantity + 1)"
								/>
							</div>
						</td>
						<td class="pr-2 tabular-nums">{{ formatMoney(unitPrice(component)) }}</td>
						<td class="pr-2 tabular-nums">{{ formatLineTotal(component) }}</td>
						<td>
							<UTooltip :text="t('combo.removeItem')">
								<UButton
									icon="i-lucide-trash-2"
									color="error"
									variant="ghost"
									:aria-label="t('combo.removeItem')"
									@click="ensureComponents().splice(index, 1)"
								/>
							</UTooltip>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p class="text-sm text-muted">{{ t('combo.individualPricesHelper') }}</p>
		<p class="text-sm text-muted">
			{{ t('combo.availabilityHelper') }}
			<span class="font-medium text-default">
				{{ availability === null ? t('combo.unlimited') : availability }}
			</span>
		</p>
		<UModal v-model:open="open" :title="t('combo.addItems')">
			<template #body>
				<div class="space-y-4">
					<div class="flex flex-wrap gap-2">
						<UInput v-model="search" icon="i-lucide-search" :placeholder="t('combo.searchProducts')" class="flex-1" />
						<USelect v-model="category" :items="categoryItems" :placeholder="t('combo.category')" class="w-44" />
					</div>
					<p v-if="error" class="text-sm text-error">{{ error }}</p>
					<div :aria-busy="loading" class="min-h-48 max-h-80 overflow-y-auto divide-y">
						<button
							v-for="product in choices"
							:key="product.code"
							type="button"
							class="flex w-full items-center gap-3 py-3 text-left hover:bg-muted"
							@click="
								selected = product;
								variantCode = undefined;
							"
						>
							<img v-if="product.thumbnail?.url" :src="product.thumbnail.url" :alt="product.name" class="size-10 rounded object-cover" />
							<span class="min-w-0 flex-1 break-words">
								{{ product.name }}
								<span class="text-muted">{{ product.code }}</span>
							</span>
							<UIcon v-if="selected?.code === product.code" name="i-lucide-check" />
						</button>
						<p v-if="!loading && !choices.length" class="py-6 text-center text-muted">{{ t('combo.noMatchingProducts') }}</p>
					</div>
					<div class="flex justify-between items-center">
						<UButton icon="i-lucide-chevron-left" variant="ghost" :aria-label="t('combo.prevPage')" :disabled="page === 1 || loading" @click="page--" />
						<span class="text-sm">{{ page }}</span>
						<UButton
							icon="i-lucide-chevron-right"
							variant="ghost"
							:aria-label="t('combo.nextPage')"
							:disabled="page * 25 >= total || loading"
							@click="page++"
						/>
					</div>
					<UFormField v-if="selected?.variants?.length" :label="t('combo.exactVariant')" required>
						<USelect v-model="variantCode" :items="selected.variants.map((v) => ({ label: v.name ?? v.variant_code, value: v.variant_code }))" class="w-full" />
					</UFormField>
				</div>
			</template>
			<template #footer>
				<UButton :label="t('combo.addItems')" icon="i-lucide-plus" :disabled="!selected || (!!selected.variants?.length && !variantCode)" @click="add" />
			</template>
		</UModal>
	</section>
</template>

<script setup lang="ts">
import { formatCurrency, ProductType } from 'yeppi-common';
import { computeComboPriceComparison, resolveComponentUnitPrice } from '~/utils/combo-pricing';
import type { Product, ComboComponent } from '~/utils/types/product';

const components = defineModel<ComboComponent[]>({ default: () => [] });
const referenceTotal = defineModel<number | null>('referenceTotal', { default: null });
const props = defineProps<{ productCode?: string; currencyCode?: string }>();
const rows = computed(() => components.value ?? []);
const { t } = useI18n();
const { $api } = useNuxtApp();
const open = ref(false);
const search = ref('');
const category = ref('all');
const page = ref(1);
const total = ref(0);
const products = ref<Product[]>([]);
const names = reactive(new Map<string, Product>());
const selected = ref<Product>();
const variantCode = ref<string>();
const loading = ref(false);
const error = ref('');
let generation = 0;

const categoryItems = computed(() => [
	{ label: t('combo.allCategories'), value: 'all' },
	...Array.from(
		new Map(
			[...names.values()]
				.flatMap((p) => p.categories ?? [])
				.filter((c) => !!c.code)
				.map((c) => [c.code, { label: c.description ?? c.code ?? '', value: c.code ?? '' }]),
		).values(),
	),
]);

const choices = computed(() =>
	products.value.filter((p) => p.code !== props.productCode && p.is_active !== false && p.type === ProductType.ITEM && p.composition !== 'fixed_combo'),
);

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

function setQuantity(index: number, next: number) {
	const row = ensureComponents()[index];
	if (!row) return;
	row.quantity = Math.max(1, Math.floor(next));
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

async function load() {
	const current = ++generation;
	loading.value = true;
	error.value = '';
	try {
		const searchTerm = search.value.trim();
		const response = await $api.product.getMany({
			$top: 25,
			$skip: (page.value - 1) * 25,
			$count: true,
			...(searchTerm ? { $search: searchTerm } : {}),
			$expand: 'type,variants,variants.price_types,thumbnail,categories,price_types',
			$filter: `is_active eq true${category.value !== 'all' ? ` and categories/code eq '${category.value.replaceAll("'", "''")}'` : ''}`,
		});
		if (current !== generation) return;
		products.value = response.data ?? response.value ?? [];
		total.value = response['@odata.count'] ?? response.count ?? 0;
		for (const product of products.value) {
			if (product.code) names.set(product.code, product);
		}
		refreshReferenceTotal();
	} catch (cause) {
		if (current === generation) error.value = cause instanceof Error ? cause.message : t('combo.loadComponentsFailed');
	} finally {
		if (current === generation) loading.value = false;
	}
}

function add() {
	if (!selected.value?.code) return;
	const list = ensureComponents();
	const existing = list.find((c) => c.product_code === selected.value!.code && (c.variant_code || '') === (variantCode.value || ''));
	if (existing) existing.quantity += 1;
	else {
		list.push({
			product_code: selected.value.code,
			variant_code: variantCode.value,
			quantity: 1,
		});
	}
	if (selected.value.code) names.set(selected.value.code, selected.value);
	selected.value = undefined;
	variantCode.value = undefined;
	open.value = false;
	refreshReferenceTotal();
}

watch([search, category], () => {
	page.value = 1;
});
watch([open, search, category, page], () => {
	if (open.value) void load();
});
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
			error.value = t('combo.componentsUnavailable');
		}
	}
	refreshReferenceTotal();
});
</script>
