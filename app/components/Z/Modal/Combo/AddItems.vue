<template>
	<UModal
		:title="t('combo.addItems')"
		:close="{ onClick: () => settle(undefined) }"
		@update:open="onOpenChange"
	>
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
						@click="selectProduct(product)"
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
					<USelect
						v-model="variantCode"
						:items="selected.variants.map((v) => ({ label: v.name ?? v.variant_code, value: v.variant_code }))"
						class="w-full"
					/>
				</UFormField>
			</div>
		</template>
		<template #footer>
			<UButton :label="t('combo.addItems')" icon="i-lucide-plus" :disabled="!canAdd" @click="confirmAdd" />
		</template>
	</UModal>
</template>

<script setup lang="ts">
import { ProductType } from 'yeppi-common';
import type { Product } from '~/utils/types/product';

export type ComboAddItemsPayload = {
	product: Product;
	variant_code?: string;
};

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
