<template>
	<UModal
		:title="t('combo.addItems')"
		:close="{ onClick: () => settle(undefined) }"
		:ui="{ content: 'w-full sm:max-w-2xl md:max-w-3xl', footer: 'max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]' }"
		@update:open="onOpenChange"
	>
		<template #body>
			<div class="space-y-4">
				<div class="flex flex-col gap-2 lg:flex-row lg:flex-wrap">
					<UInput v-model="search" type="search" :aria-label="t('combo.searchProducts')" icon="i-lucide-search" :placeholder="t('combo.searchProducts')" class="flex-1" />
					<USelect v-model="category" :items="categoryItems" :placeholder="t('combo.category')" class="min-h-11 w-full lg:min-h-0 lg:w-44" :aria-label="t('combo.category')" />
				</div>
				<p v-if="error" class="text-sm text-error">{{ error }}</p>
				<div class="overflow-hidden rounded-lg border border-default">
					<div class="max-h-[min(38dvh,20rem)] overflow-y-auto overscroll-contain lg:hidden" :aria-busy="loading">
						<ZLoading v-if="loading" />
						<p v-else-if="!choices.length" class="py-6 text-center text-sm text-muted">{{ t('combo.noMatchingProducts') }}</p>
						<ul v-else class="divide-y divide-default">
							<li v-for="product in choices" :key="rowId(product)">
								<button
									type="button"
									class="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-start focus-visible:outline-2 focus-visible:outline-primary"
									:aria-pressed="selected?.code === product.code"
									:class="{ 'bg-elevated': selected?.code === product.code }"
									@click="selectProduct(product)"
								>
									<ZImage :src="product.thumbnail?.url || ''" :width="36" :height="36" />
									<span class="min-w-0 flex-1 wrap-anywhere">
										<span class="block text-sm font-semibold">{{ product.name || product.code }}</span>
										<span v-if="product.name" class="block text-xs text-muted">{{ product.code }}</span>
									</span>
									<UIcon v-if="selected?.code === product.code" name="i-lucide-check" class="size-5 shrink-0 text-primary" aria-hidden="true" />
								</button>
							</li>
						</ul>
					</div>

					<UTable
						class="hidden lg:block"
						:data="choices"
						:columns="columns"
						:loading="loading"
						:get-row-id="rowId"
						:ui="{
							root: 'relative max-h-80 overflow-auto',
							base: 'w-full text-sm',
							tr: 'cursor-pointer',
							td: 'align-middle whitespace-normal',
						}"
						@select="onSelectRow"
					>
						<template #select-cell="{ row }">
							<UIcon
								v-if="selected?.code === row.original.code"
								name="i-lucide-check"
								class="size-4 text-primary"
							/>
						</template>
						<template #empty>
							<p class="py-6 text-center text-sm text-muted">{{ t('combo.noMatchingProducts') }}</p>
						</template>
					</UTable>
				</div>
				<div v-if="total > 0" class="flex justify-end">
					<ZPagination v-model:page="page" :items-per-page="PAGE_SIZE" :total="total" />
				</div>
				<UFormField v-if="selected?.variants?.length" :label="t('combo.exactVariant')" required>
					<USelect
						v-model="variantCode"
						:items="selected.variants.map((v) => ({ label: v.name ?? v.variant_code, value: v.variant_code }))"
						class="min-h-11 w-full lg:min-h-0"
					/>
				</UFormField>
			</div>
		</template>
		<template #footer>
			<UButton class="max-lg:min-h-11 max-lg:w-full max-lg:justify-center" :label="t('combo.addItems')" icon="i-lucide-plus" :disabled="!canAdd" @click="confirmAdd" />
		</template>
	</UModal>
</template>

<script setup lang="ts">
import { ProductType } from 'yeppi-common';
import type { TableRow } from '@nuxt/ui';
import { getComboAddItemColumns } from '~/utils/table-columns';
import type { Product } from '~/utils/types/product';

export type ComboAddItemsPayload = {
	product: Product;
	variant_code?: string;
};

const PAGE_SIZE = 25;

const props = defineProps<{
	excludeProductCode?: string;
}>();

const emit = defineEmits<{
	close: [payload: ComboAddItemsPayload | undefined];
}>();

const { t } = useI18n();
const { $api } = useNuxtApp();

const search = ref('');
const category = ref('all');
const page = ref(1);
const total = ref(0);
const products = ref<Product[]>([]);
const seen = reactive(new Map<string, Product>());
const selected = ref<Product>();
const variantCode = ref<string>();
const loading = ref(false);
const error = ref('');
let generation = 0;
let settled = false;

const columns = computed(() => getComboAddItemColumns(t));
const rowId = (product: Product) => product.code ?? '';

const categoryItems = computed(() => [
	{ label: t('combo.allCategories'), value: 'all' },
	...Array.from(
		new Map(
			[...seen.values()]
				.flatMap((p) => p.categories ?? [])
				.filter((c) => !!c.code)
				.map((c) => [c.code, { label: c.description ?? c.code ?? '', value: c.code ?? '' }]),
		).values(),
	),
]);

const choices = computed(() =>
	products.value.filter(
		(p) => p.code !== props.excludeProductCode && p.is_active !== false && p.type === ProductType.ITEM && p.composition !== 'fixed_combo',
	),
);

const canAdd = computed(() => !!selected.value && !(!!selected.value.variants?.length && !variantCode.value));

function settle(payload: ComboAddItemsPayload | undefined) {
	if (settled) return;
	settled = true;
	emit('close', payload);
}

function onOpenChange(value: boolean) {
	if (!value) settle(undefined);
}

function selectProduct(product: Product) {
	selected.value = product;
	variantCode.value = undefined;
}

function onSelectRow(_event: Event, row: TableRow<Product>) {
	if (!row.original) return;
	selectProduct(row.original);
}

async function load() {
	const current = ++generation;
	loading.value = true;
	error.value = '';
	try {
		const searchTerm = search.value.trim();
		const response = await $api.product.getMany({
			$top: PAGE_SIZE,
			$skip: (page.value - 1) * PAGE_SIZE,
			$count: true,
			...(searchTerm ? { $search: searchTerm } : {}),
			$expand: 'type,variants,variants.price_types,thumbnail,categories,price_types',
			$filter: `is_active eq true${category.value !== 'all' ? ` and categories/code eq '${category.value.replaceAll('\'', '\'\'')}'` : ''}`,
		});
		if (current !== generation) return;
		products.value = response.data ?? response.value ?? [];
		total.value = response['@odata.count'] ?? response.count ?? 0;
		for (const product of products.value) {
			if (product.code) seen.set(product.code, product);
		}
	} catch (cause) {
		if (current === generation) error.value = cause instanceof Error ? cause.message : t('combo.loadComponentsFailed');
	} finally {
		if (current === generation) loading.value = false;
	}
}

function confirmAdd() {
	if (!selected.value?.code || !canAdd.value) return;
	settle({
		product: selected.value,
		variant_code: variantCode.value,
	});
}

watch([search, category], () => {
	page.value = 1;
});

watch([search, category, page], () => {
	void load();
});

onMounted(() => {
	void load();
});
</script>
