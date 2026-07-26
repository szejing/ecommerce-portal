<template>
	<UModal
		:ui="{
			content: 'w-full sm:max-w-[60%]',
		}"
	>
		<template #header>
			<h1>{{ product.name }} - [{{ variantDetail?.name?.replace('_', ' · ') }}]</h1>
		</template>

		<template #body>
			<!-- *********************** Pricing *********************** -->
			<div v-if="variantDetail.price_types && variantDetail.price_types.length > 0">
				<div v-for="price_type in variantDetail.price_types" :key="price_type.id">
					<ZInputPricing
						v-model:orig-sell-price.number="price_type.orig_sell_price"
						v-model:cost-price.number="price_type.cost_price"
						v-model:sale-price.number="price_type.sale_price"
						v-model:currency-code="price_type.currency_code"
					/>
				</div>
			</div>
			<div v-else>
				<ZInputPricing
					v-model:orig-sell-price.number="price.orig_sell_price"
					v-model:cost-price.number="price.cost_price"
					v-model:sale-price.number="price.sale_price"
					v-model:currency-code="price.currency_code"
				/>
			</div>
			<!-- *********************** Pricing *********************** -->
		</template>

		<template #footer>
			<div class="flex justify-between gap-4 w-full">
				<UButton color="error" variant="ghost" @click="onDelete">{{ t('components.zInput.delete') }}</UButton>

				<div class="flex-jend gap-4">
					<UButton color="neutral" variant="soft" @click="onCancel">{{ t('common.cancel') }}</UButton>
					<UButton color="primary" variant="solid" @click="onUpdate">{{ t('modal.confirm') }}</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { ProductCreate } from '~/utils/types/form/product-creation';
import type { PriceInput } from '~/utils/types/price';
import type { Product, ProductVariantInput } from '~/utils/types/product';

const { t } = useI18n();

const props = defineProps({
	product: {
		type: Object as PropType<Product | ProductCreate>,
		required: true,
	},
	details: {
		type: Object as PropType<ProductVariantInput>,
		required: true,
	},
});

const price = ref<PriceInput>({
	orig_sell_price: props.product.price_types?.[0]?.orig_sell_price ?? 0,
	cost_price: props.product.price_types?.[0]?.cost_price ?? 0,
	sale_price: props.product.price_types?.[0]?.sale_price ?? 0,
	currency_code: props.product.price_types?.[0]?.currency_code ?? 'MYR',
	id: undefined,
});

const emit = defineEmits(['update', 'cancel', 'delete']);

const variantDetail = computed({
	get() {
		return JSON.parse(JSON.stringify(props.details));
	},
	set(_) {},
});

const onUpdate = () => {
	if (variantDetail.value.price_types?.length == 0) {
		variantDetail.value.price_types = [price.value];
	}

	emit('update', variantDetail.value);
};

const onDelete = () => {
	emit('delete', variantDetail.value);
};

const onCancel = () => {
	emit('cancel');
};
</script>

<style scoped></style>
