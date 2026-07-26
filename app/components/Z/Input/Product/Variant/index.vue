<template>
	<UCard>
		<div class="flex-jbetween-icenter">
			<!-- <h4>{{ prodVariant.id }}</h4> -->

			<div>
				<h4>{{ values }}</h4>
				<h5 v-if="prodVariant.price_types && prodVariant.price_types.length > 0">
					{{ prodVariant?.price_types?.[0]?.currency_code }} {{ formatCurrency((prodVariant?.price_types?.[0]?.orig_sell_price ?? 0) * 100) }}
				</h5>
			</div>

			<UButton variant="ghost" class="flex-none" square :icon="ICONS.VERTICAL_ELLIPSIS" size="sm" color="error" @click="viewVariant" />
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import type { ProductVariantInput } from '~/utils/types/product';
import { formatCurrency } from 'yeppi-common';
import { ICONS } from '~/utils/icons';

const props = defineProps<{ variant: ProductVariantInput | undefined }>();
const emit = defineEmits(['update:productvariant', 'view:productvariant']);

const prodVariant = computed({
	get() {
		return props.variant ?? [];
	},
	set(value) {
		emit('update:productvariant', value);
	},
});

const values = ref(prodVariant.value.options?.map((option) => option.value).join(' · '));

const viewVariant = () => {
	emit('view:productvariant', prodVariant.value);
};
</script>

<style scoped>
h4 {
	font-weight: 700;
}

h5 {
	font-weight: 500;
	font-size: 0.875rem;
	line-height: 1.25rem;
	color: var(--color-main);
}
</style>
