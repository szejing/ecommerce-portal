<template>
	<UModal
		v-model:open="open"
		:title="title"
		:ui="{
			content: 'w-full sm:max-w-lg',
		}"
	>
		<template #body>
			<div class="space-y-4">
				<UFormField :label="t('components.variantList.sku')" name="sku" :error="skuError">
					<UInput v-model="draft.sku" :placeholder="t('components.variantList.skuPlaceholder')" />
				</UFormField>

				<UFormField :label="t('components.variantList.barcode')" name="barcode">
					<UInput v-model="draft.barcode" :placeholder="t('components.variantList.barcodePlaceholder')" />
				</UFormField>

				<UFormField :label="t('components.variantList.costPrice')" name="cost_price">
					<UInput
						v-model.number="draft.cost_price"
						type="number"
						:min="0"
						:step="0.01"
						:placeholder="t('components.variantList.costPricePlaceholder')"
						:ui="{ base: 'ps-12' }"
					>
						<template #leading>
							<span class="text-xs text-neutral-400">{{ currencyCode }}</span>
						</template>
					</UInput>
				</UFormField>
			</div>
		</template>

		<template #footer>
			<div class="flex justify-end gap-4 w-full">
				<UButton color="neutral" variant="soft" @click="onCancel">{{ t('common.cancel') }}</UButton>
				<UButton color="primary" variant="solid" :disabled="!!skuError" @click="onConfirm">{{ t('common.confirm') }}</UButton>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { ProductVariantInput } from '~/utils/types/product';
import { isDuplicateVariantSku, normalizeVariantSku } from '~/utils/product-variant-list';

const { t } = useI18n();

const open = defineModel<boolean>('open', { default: false });

const props = defineProps<{
	title: string;
	variant: ProductVariantInput;
	otherSkus: Array<string | null | undefined>;
	currencyCode: string;
}>();

const emit = defineEmits<{
	confirm: [payload: { sku?: string; barcode?: string; cost_price?: number }];
	cancel: [];
}>();

const draft = reactive({
	sku: '',
	barcode: '',
	cost_price: undefined as number | undefined,
});

const skuError = computed(() => {
	if (!isDuplicateVariantSku(draft.sku, props.otherSkus)) return undefined;
	return t('validation.product.variantSkuDuplicate');
});

watch(
	() => open.value,
	(isOpen) => {
		if (!isOpen) return;
		draft.sku = props.variant.sku ?? '';
		draft.barcode = props.variant.barcode ?? '';
		draft.cost_price = props.variant.price_types?.[0]?.cost_price;
	},
	{ immediate: true },
);

const onCancel = () => {
	open.value = false;
	emit('cancel');
};

const onConfirm = () => {
	if (skuError.value) return;
	emit('confirm', {
		sku: normalizeVariantSku(draft.sku),
		barcode: draft.barcode?.trim() ? draft.barcode.trim() : undefined,
		cost_price: draft.cost_price,
	});
	open.value = false;
};
</script>
