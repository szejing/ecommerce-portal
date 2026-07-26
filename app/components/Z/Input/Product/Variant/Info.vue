<template>
	<UCard :ui="cardUi">
		<template #header>
			<div class="w-full flex-between items-center">
				<h2>{{ t('components.zInput.generalInfo') }}</h2>
				<div class="w-[50%] flex-jend items-center gap-4">
					<!-- <UCheckbox v-model="variantDetail.manage_inventory" name="manageInventory" :label="t('components.zInput.manageInventory')" color="success" /> -->
					<UCheckbox v-model="variantDetail.allow_backorder" name="allowBackorder" :label="t('components.zInput.allowBackorder')" color="success" />

					<!-- <UCheckbox v-model="is_discountable" name="isDiscountable" label="Discountable" color="success" />
					<UCheckbox v-model="is_giftcard" name="isGiftCard" label="Giftcard" color="success" /> -->
				</div>
			</div>
		</template>

		<div class="section-grid-basic-details">
			<!-- <UFormField v-slot="{ error }" label="Short Description" name="short_desc">
				<UInput v-model="variantDetail.barcode" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" />
			</UFormField> -->

			<!-- <UFormField v-slot="{ error }" label="Subtitle" name="subtitle">
				<UInput v-model="variantDetail.ean" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" />
			</UFormField> -->
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import type { ProductVariant } from '~/utils/types/product-variant';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const props = defineProps({
	details: {
		type: Object as PropType<ProductVariant>,
		required: true,
	},
	cardUi: Object,
});
const emit = defineEmits(['update:variantDetail']);

const variantDetail = computed({
	get() {
		return props.details ?? [];
	},
	set(value) {
		emit('update:variantDetail', value);
	},
});
</script>

<style scoped>
.section-grid-basic-details {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;
}
</style>
