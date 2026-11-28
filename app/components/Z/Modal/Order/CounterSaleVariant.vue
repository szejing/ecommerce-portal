<template>
	<UModal
		:title="t('pages.counterSaleChooseVariant')"
		:close="{ onClick: () => settle(undefined) }"
		:ui="{ content: 'w-[calc(100vw-1rem)] max-w-md', body: 'max-lg:px-3', footer: 'max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]' }"
		@update:open="onOpenChange"
	>
		<template #body>
			<div class="space-y-3">
				<div class="flex items-center gap-3">
					<ZImage :src="product.thumbnail?.url || ''" alt="" :width="48" :height="48" />
					<div class="min-w-0">
						<p class="truncate text-sm font-semibold text-highlighted">{{ product.name || product.code }}</p>
						<p class="truncate text-xs text-muted">{{ product.code }}</p>
					</div>
				</div>
				<div class="flex flex-col gap-2">
					<UButton
						v-for="variant in product.variants"
						:key="variant.variant_code"
						color="neutral"
						variant="soft"
						block
						class="min-h-12 justify-between"
						@click="settle(variant)"
					>
						<span class="min-w-0 truncate">{{ variant.name || variant.variant_code }}</span>
						<span v-if="variantPrice(variant)" class="shrink-0 tabular-nums">{{ variantPrice(variant) }}</span>
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import { formatCurrency } from 'yeppi-common';
import type { Product } from '~/utils/types/product';
import type { ProductVariant } from '~/utils/types/product-variant';
import { catalogUnitPrice } from '~/utils/counter-sale';

defineProps<{
	product: Product;
}>();

const emit = defineEmits<{
	close: [variant: ProductVariant | undefined];
}>();

const { t } = useI18n();
let settled = false;

function settle(variant: ProductVariant | undefined) {
	if (settled) return;
	settled = true;
	emit('close', variant);
}

function onOpenChange(open: boolean) {
	if (!open) settle(undefined);
}

function variantPrice(variant: ProductVariant) {
	const price = variant.price_types?.[0];
	if (!price?.currency_code) return '';
	return formatCurrency(catalogUnitPrice(price), price.currency_code);
}
</script>
