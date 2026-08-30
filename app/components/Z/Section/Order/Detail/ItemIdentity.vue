<template>
	<div class="order-item-identity">
		<p
			v-if="productText"
			data-testid="order-item-product-line"
			class="order-item-product-line"
			:class="{ 'is-voided': isVoided }"
		>
			{{ productText }}
		</p>
		<div
			v-if="variantText"
			data-testid="order-item-variant-line"
			class="order-item-variant-line ring ring-inset"
			:class="isVoided ? 'is-voided bg-elevated ring-default' : 'bg-info/5 ring-info/15'"
		>
			<UBadge color="info" variant="subtle" size="xs" class="shrink-0">
				{{ t('components.orderDetail.variant') }}
			</UBadge>
			<p data-testid="order-item-variant-value" class="order-item-variant-value">
				{{ variantText }}
			</p>
		</div>
	</div>
</template>

<script lang="ts" setup>
defineProps<{
	productText: string;
	variantText: string;
	isVoided?: boolean;
}>();

const { t } = useI18n();
</script>

<style scoped>
.order-item-identity {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
	min-width: 0;
}

.order-item-product-line {
	font-size: 0.875rem;
	font-weight: 600;
	line-height: 1.25rem;
	color: var(--ui-text-highlighted);
	overflow-wrap: anywhere;
}

.order-item-variant-line {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.375rem 0.5rem;
	max-width: 100%;
	padding: 0.25rem 0.5rem;
	border-radius: 0.375rem;
}

.order-item-variant-value {
	min-width: 0;
	flex: 1 1 8rem;
	margin: 0;
	font-size: 0.8rem;
	font-weight: 500;
	line-height: 1.25rem;
	color: var(--ui-text);
	overflow-wrap: anywhere;
}

.order-item-product-line.is-voided,
.order-item-variant-line.is-voided .order-item-variant-value {
	text-decoration: line-through;
	color: var(--ui-text-muted);
}
</style>
