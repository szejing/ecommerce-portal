<template>
	<UCard :ui="cardUi">
		<template #header>
			<div class="w-full flex-between items-center">
				<h2>{{ t('components.zInput.generalInfo') }}</h2>
			</div>
		</template>

		<div class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center gap-4">
				<UCheckbox
					v-model="variantDetail.manage_inventory"
					name="manageInventory"
					:label="t('components.zInput.manageInventory')"
					color="success" />
				<UCheckbox
					v-model="variantDetail.allow_preorder"
					name="allowPreorder"
					:label="t('components.zInput.allowPreorder')"
					color="success" />
			</div>

			<div v-if="variantDetail.manage_inventory" class="section-grid-basic-details">
				<UFormField v-slot="{ error }" :label="t('components.zInput.quantity')" name="quantity">
					<UInput
						v-model.number="variantDetail.inventory_quantity"
						:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
						type="number"
						:min="0"
						step="1" />
				</UFormField>
			</div>
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
