<template>
	<UModal
		:title="t('pages.counterSaleSearch')"
		:dismissible="!choosing"
		:close="choosing ? false : { onClick: () => settle(undefined) }"
		:ui="{
			content: 'w-[calc(100vw-1rem)] max-w-lg lg:max-w-3xl',
			body: 'max-lg:px-3',
			footer: 'max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]',
		}"
		@update:open="onOpenChange"
	>
		<template #body>
			<div class="space-y-3">
				<UInput
					v-model="query"
					type="search"
					icon="i-heroicons-magnifying-glass"
					:loading="searching"
					:placeholder="t('pages.counterSaleSearch')"
					:aria-label="t('pages.counterSaleSearch')"
					@update:model-value="onSearch"
				/>
				<div :aria-busy="searching">
					<ul v-if="searching" class="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
						<li v-for="row in 6" :key="row" class="overflow-hidden rounded-lg border border-default">
							<USkeleton class="aspect-square w-full rounded-none" />
							<div class="space-y-2 p-2">
								<USkeleton class="h-4 w-4/5" />
								<USkeleton class="h-3 w-1/2" />
							</div>
						</li>
					</ul>
					<p v-else-if="showEmpty" class="py-10 text-center text-sm text-muted">{{ t('pages.noProductsFound') }}</p>
					<ul v-else class="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
						<li v-for="product in results" :key="product.code">
							<UButton
								color="neutral"
								variant="outline"
								class="relative h-auto w-full flex-col items-stretch gap-0 overflow-hidden p-0 text-left"
								:disabled="choosing"
								@click="chooseProduct(product.code)"
							>
								<span class="block aspect-square w-full overflow-hidden bg-elevated">
									<ZImage :src="product.thumbnail?.url || ''" alt="" fill />
								</span>
								<span class="flex min-w-0 flex-col gap-0.5 p-2">
									<span class="line-clamp-2 text-sm font-semibold text-highlighted">{{ product.name || product.code }}</span>
									<span class="truncate text-xs text-muted">{{ product.code }}</span>
									<span v-if="listingPrice(product)" class="text-sm font-medium tabular-nums text-highlighted">
										{{ priceLabel(listingPrice(product)) }}
									</span>
								</span>
								<span
									v-if="choosingCode === product.code"
									class="absolute inset-0 flex items-center justify-center bg-default/60"
								>
									<UIcon name="i-heroicons-arrow-path" class="size-6 animate-spin text-highlighted" />
								</span>
							</UButton>
						</li>
					</ul>
				</div>
			</div>
		</template>
		<template v-if="total > PAGE_SIZE" #footer>
			<div class="flex w-full justify-center lg:justify-end">
				<ZPagination v-model:page="page" :items-per-page="PAGE_SIZE" :total="total" :disabled="searching" />
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import { formatCurrency } from 'yeppi-common';
import type { Product } from '~/utils/types/product';
import type { ProductVariant } from '~/utils/types/product-variant';
import { catalogUnitPrice, counterSaleErrorMessage } from '~/utils/counter-sale';
import { failedNotification } from '~/stores/AppUi/AppUi';
import { ZModalOrderCounterSaleVariant } from '#components';

export type CounterSaleCatalogueSelection = {
	product: Product;
	variant?: ProductVariant;
};

type ListedPrice = {
	amount: number;
	currency: string;
	varied: boolean;
};

const PAGE_SIZE = 12;

const emit = defineEmits<{
	close: [selection: CounterSaleCatalogueSelection | undefined];
}>();

const { t } = useI18n();
const { $api } = useNuxtApp();
const overlay = useOverlay();

const query = ref('');
const results = ref<Product[]>([]);
const page = ref(1);
const total = ref(0);
const searching = ref(false);
const searchSettled = ref(false);
const choosingCode = ref('');
const choosing = ref(false);
let settled = false;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let searchGeneration = 0;

const showEmpty = computed(() => searchSettled.value && !searching.value && !results.value.length);

function settle(selection: CounterSaleCatalogueSelection | undefined) {
	if (settled) return;
	settled = true;
	emit('close', selection);
}

function onOpenChange(open: boolean) {
	if (!open) settle(undefined);
}

function listingPrice(product: Product): ListedPrice | null {
	const source = product.variants?.length ? product.variants.flatMap((variant) => variant.price_types ?? []) : (product.price_types ?? []);
	const priced = source.filter((price) => !!price.currency_code).map((price) => ({ amount: catalogUnitPrice(price), currency: price.currency_code }));
	if (!priced.length) return null;
	const currency = priced[0]?.currency ?? '';
	const same = priced.filter((price) => price.currency === currency);
	const amount = Math.min(...same.map((price) => price.amount));
	return { amount, currency, varied: same.some((price) => price.amount !== amount) };
}

function priceLabel(price: ListedPrice | null) {
	if (!price) return '';
	const amount = formatCurrency(price.amount, price.currency);
	return price.varied ? t('pages.counterSaleFrom', { amount }) : amount;
}

async function loadCatalogue() {
	const generation = ++searchGeneration;
	const term = query.value.trim();
	results.value = [];
	searchSettled.value = false;
	searching.value = true;
	try {
		const response = await $api.product.getMany({
			$top: PAGE_SIZE,
			$skip: (page.value - 1) * PAGE_SIZE,
			$count: true,
			$orderby: 'name asc,code asc',
			$expand: 'thumbnail,price_types,variants,variants.price_types',
			...(term ? { $search: term } : {}),
		});
		if (generation !== searchGeneration) return;
		results.value = response.data ?? response.value ?? [];
		total.value = response['@odata.count'] ?? response.count ?? results.value.length;
		searchSettled.value = true;
	} catch (error) {
		if (generation !== searchGeneration) return;
		results.value = [];
		total.value = 0;
		searchSettled.value = true;
		failedNotification(counterSaleErrorMessage(error, t('pages.counterSaleNothingSaved')));
	} finally {
		if (generation === searchGeneration) searching.value = false;
	}
}

function onSearch() {
	clearTimeout(searchTimer);
	searchTimer = setTimeout(() => {
		if (page.value !== 1) {
			page.value = 1;
			return;
		}
		void loadCatalogue();
	}, 300);
}

async function chooseProduct(code?: string) {
	if (!code || choosing.value || settled) return;
	choosingCode.value = code;
	choosing.value = true;
	try {
		const { product } = await $api.product.getSingle(code);
		if (settled) return;
		if (!product.variants?.length) {
			settle({ product });
			return;
		}
		choosingCode.value = '';
		const variantModal = overlay.create(ZModalOrderCounterSaleVariant, { destroyOnClose: true });
		const variant = await variantModal.open({ product }).result;
		if (variant && !settled) settle({ product, variant });
	} catch (error) {
		if (!settled) failedNotification(counterSaleErrorMessage(error, t('pages.counterSaleNothingSaved')));
	}
	if (!settled) {
		choosingCode.value = '';
		choosing.value = false;
	}
}

watch(page, () => {
	void loadCatalogue();
});

onMounted(() => {
	void loadCatalogue();
});

onUnmounted(() => {
	clearTimeout(searchTimer);
	searchGeneration += 1;
});
</script>
