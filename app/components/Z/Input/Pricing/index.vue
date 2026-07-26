<template>
	<div class="p-4 sm:p-6 space-y-6">
		<div class="bg-green-50 border border-green-200 rounded-lg p-4">
			<div class="flex items-start gap-3">
				<UIcon :name="ICONS.INFO" class="text-green-600 w-5 h-5 mt-0.5 shrink-0" />
				<div>
					<h4 class="text-sm font-medium text-green-900">{{ t('components.productUpdate.pricingInformation') }}</h4>
					<p class="text-xs text-green-700 mt-1">{{ t('components.productUpdate.setPricesOptional') }}</p>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-6">
			<UFormField :label="t('components.productUpdate.currency')">
				<p class="text-xs text-neutral-500 my-1">{{ t('components.productUpdate.currency') }}</p>
				<ZSelectMenuCurrency :currency-code="currency_code" class="w-full" @update:currency="updateCurrency" />
			</UFormField>

			<UFormField :label="t('components.productUpdate.originalSellingPrice')" required>
				<p class="text-xs text-neutral-500 my-1">{{ t('components.productUpdate.sellingPrice') }}</p>
				<UInput v-model.number="orig_sell_price" type="number" :placeholder="t('components.productUpdate.pricePlaceholder')" :min="0" :step="0.01" />
			</UFormField>

			<UFormField :label="t('components.productUpdate.costPriceOptional')">
				<p class="text-xs text-neutral-500 my-1">{{ t('components.productUpdate.costForProfit') }}</p>
				<UInput v-model.number="cost_price" type="number" :placeholder="t('components.productUpdate.costPricePlaceholder')" :min="0" :step="0.01" />
			</UFormField>

			<UFormField :label="t('components.productUpdate.salePriceOptional')">
				<p class="text-xs text-neutral-500 my-1">{{ t('components.productUpdate.discountedPrice') }}</p>
				<UInput v-model.number="sale_price" type="number" :placeholder="t('components.productUpdate.salePricePlaceholder')" :min="0" :step="0.01" />
			</UFormField>
		</div>

		<!-- Price Preview -->
		<div v-if="orig_sell_price" class="p-4 bg-neutral-50 rounded-lg">
			<h4 class="text-sm font-medium mb-3">{{ t('components.productUpdate.pricePreview') }}</h4>
			<div class="flex flex-wrap items-center gap-3">
				<div v-if="sale_price && sale_price < orig_sell_price" class="text-2xl font-bold text-green-600">{{ currency_code }} {{ sale_price }}</div>
				<div class="text-lg" :class="sale_price && sale_price < orig_sell_price ? 'line-through text-neutral-500' : 'font-bold text-neutral-900'">
					{{ currency_code }} {{ orig_sell_price }}
				</div>
				<div v-if="sale_price && sale_price < orig_sell_price" class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
					{{ Math.round(((Number(orig_sell_price) - Number(sale_price)) / Number(orig_sell_price)) * 100) }}% {{ t('components.productUpdate.percentOff') }}
				</div>
			</div>
			<div v-if="cost_price && orig_sell_price" class="text-xs text-neutral-600 mt-2">
				{{ t('components.productUpdate.profitMargin') }}: {{ currency_code }} {{ Number(orig_sell_price) - Number(cost_price) }} ({{
					Math.round(((Number(orig_sell_price) - Number(cost_price)) / Number(orig_sell_price)) * 100)
				}}%)
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { fractionDigits } from '~/utils/utils';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const props = defineProps({
	currencyCode: String,
	origSellPrice: Number,
	costPrice: Number,
	salePrice: Number,
});

const emit = defineEmits(['update:currencyCode', 'update:origSellPrice', 'update:costPrice', 'update:salePrice']);

const currency_code = computed({
	get(): string | undefined {
		return props.currencyCode;
	},
	set(value) {
		emit('update:currencyCode', value);
	},
});

const orig_sell_price = computed({
	get(): string | undefined {
		return props.origSellPrice == null ? undefined : props.origSellPrice?.toFixed(fractionDigits);
	},
	set(value) {
		emit('update:origSellPrice', value);
	},
});

const cost_price = computed({
	get(): string | undefined {
		return props.costPrice == null ? undefined : props.costPrice?.toFixed(fractionDigits);
	},
	set(value) {
		emit('update:costPrice', value);
	},
});

const sale_price = computed({
	get(): string | undefined {
		return props.salePrice == null ? undefined : props.salePrice?.toFixed(fractionDigits);
	},
	set(value) {
		emit('update:salePrice', value);
	},
});

const updateCurrency = (currency: any) => {
	currency_code.value = currency.code;
};

if (orig_sell_price.value == undefined) {
	orig_sell_price.value = undefined;
}

if (cost_price.value == undefined) {
	cost_price.value = undefined;
}

if (sale_price.value == undefined) {
	sale_price.value = undefined;
}
</script>

<style scoped></style>
