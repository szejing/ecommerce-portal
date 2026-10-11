<template>
	<div class="space-y-4">
		<ZInputProductPricingSection
			:currency-code="currencyCode"
			:orig-sell-price="origSellPrice"
			:cost-price="costPrice"
			:sale-price="salePrice"
			@update:currency="emit('update:currency', $event)"
			@update:orig-sell-price="emit('update:origSellPrice', $event)"
			@update:cost-price="emit('update:costPrice', $event)"
			@update:sale-price="emit('update:salePrice', $event)"
		/>

		<div v-if="comparison.referenceTotal != null" class="rounded-lg border border-default bg-elevated/40 px-4 py-3 space-y-2">
			<p class="text-sm">
				<span class="text-muted">{{ t('combo.boughtSeparately') }}:</span>
				<span class="ml-2 font-semibold tabular-nums">{{ formatMoney(comparison.referenceTotal) }}</span>
			</p>
			<p v-if="comparison.showSavings" class="text-sm text-success">
				<span>{{ t('combo.customerSaves') }}:</span>
				<span class="ml-2 font-semibold tabular-nums">{{ formatMoney(comparison.savings!) }}</span>
			</p>
			<p v-if="comparison.comboAtOrAboveReference" class="text-sm text-warning">
				{{ t('combo.noSavingsNotice') }}
			</p>
			<p class="text-xs text-muted">{{ t('combo.fixedPriceHelper') }}</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { formatCurrency } from 'yeppi-common';
import { computeComboPriceComparison } from '~/utils/combo-pricing';

const props = defineProps<{
	currencyCode: string;
	origSellPrice?: number | null;
	costPrice?: number | null;
	salePrice?: number | null;
	referenceTotal?: number | null;
}>();

const emit = defineEmits<{
	'update:currency': [value: { code: string }];
	'update:origSellPrice': [value: number | undefined];
	'update:costPrice': [value: number | undefined];
	'update:salePrice': [value: number | undefined];
}>();

const { t } = useI18n();

const comparison = computed(() => {
	if (props.referenceTotal == null) {
		return computeComboPriceComparison([], props.origSellPrice, props.currencyCode);
	}
	return computeComboPriceComparison(
		[{ unitPrice: props.referenceTotal, quantity: 1, currencyCode: props.currencyCode }],
		props.origSellPrice,
		props.currencyCode,
	);
});

function formatMoney(amount: number): string {
	try {
		return formatCurrency(amount, props.currencyCode || 'MYR');
	} catch {
		return String(amount);
	}
}
</script>
