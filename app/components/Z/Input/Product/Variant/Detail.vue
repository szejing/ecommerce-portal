<template>
	<UModal
		:title="modalTitle"
		:ui="{
			content: 'w-full sm:max-w-lg',
		}"
		:close="{ onClick: () => settle(undefined) }"
		@update:open="onOpenChange"
	>
		<template #body>
			<div class="space-y-4">
				<UFormField :label="t('components.variantList.sku')" name="sku" :error="skuError">
					<UInput v-model="draft.sku" :placeholder="t('components.variantList.skuPlaceholder')" />
				</UFormField>

				<UFormField :label="t('components.variantList.barcode')" name="barcode">
					<UInput v-model="draft.barcode" :placeholder="t('components.variantList.barcodePlaceholder')" />
				</UFormField>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<UFormField :label="t('components.variantList.price')" name="orig_sell_price">
						<UInput
							v-model.number="draft.orig_sell_price"
							type="number"
							:min="0"
							:step="0.01"
							:placeholder="t('components.variantList.pricePlaceholder')"
							:ui="{ base: 'ps-12' }"
						>
							<template #leading>
								<span class="text-xs text-neutral-400">{{ currencyCode }}</span>
							</template>
						</UInput>
					</UFormField>

					<UFormField :label="t('components.variantList.salePrice')" name="sale_price">
						<UInput
							v-model.number="draft.sale_price"
							type="number"
							:min="0"
							:step="0.01"
							:placeholder="t('components.variantList.salePricePlaceholder')"
							:ui="{ base: 'ps-12' }"
							@blur="draft.sale_price = normalizeSalePrice(draft.sale_price)"
						>
							<template #leading>
								<span class="text-xs text-neutral-400">{{ currencyCode }}</span>
							</template>
						</UInput>
					</UFormField>
				</div>

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

				<div class="space-y-3 pt-1 border-t border-default">
					<p class="text-sm font-medium text-highlighted">{{ t('components.zInput.inventory') }}</p>
					<div class="flex flex-wrap items-center gap-4">
						<UCheckbox
							v-model="draft.manage_inventory"
							name="manageInventory"
							:label="t('components.zInput.manageInventory')"
							color="success"
						/>
						<UCheckbox
							v-model="draft.allow_preorder"
							name="allowPreorder"
							:label="t('components.zInput.allowPreorder')"
							color="success"
						/>
					</div>
					<UFormField
						v-if="draft.manage_inventory"
						:label="t('components.zInput.quantity')"
						name="inventory_quantity"
					>
						<UInput
							v-model.number="draft.inventory_quantity"
							type="number"
							:min="0"
							step="1"
						/>
					</UFormField>
				</div>
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
import type { VariantDetailPayload } from '~/utils/product-variant-list';
import { isDuplicateVariantSku, normalizeSalePrice, normalizeVariantSku } from '~/utils/product-variant-list';

const { t } = useI18n();

const props = defineProps<{
	variant: ProductVariantInput;
	otherSkus: Array<string | null | undefined>;
	currencyCode: string;
}>();

const emit = defineEmits<{
	close: [payload: VariantDetailPayload | undefined];
}>();

const modalTitle = computed(() => {
	const parts = [props.variant.product_code, props.variant.variant_code]
		.map((value) => value?.trim())
		.filter((value): value is string => !!value);
	return parts.join(' · ');
});

const draft = reactive({
	sku: props.variant.sku ?? '',
	barcode: props.variant.barcode ?? '',
	orig_sell_price: props.variant.price_types?.[0]?.orig_sell_price ?? 0,
	sale_price: props.variant.price_types?.[0]?.sale_price as number | undefined,
	cost_price: props.variant.price_types?.[0]?.cost_price as number | undefined,
	manage_inventory: props.variant.manage_inventory ?? false,
	allow_preorder: props.variant.allow_preorder ?? false,
	inventory_quantity: props.variant.inventory_quantity ?? 0,
});

const skuError = computed(() => {
	if (!isDuplicateVariantSku(draft.sku, props.otherSkus)) return undefined;
	return t('validation.product.variantSkuDuplicate');
});

let settled = false;
const settle = (payload: VariantDetailPayload | undefined) => {
	if (settled) return;
	settled = true;
	emit('close', payload);
};

const onOpenChange = (value: boolean) => {
	if (!value) settle(undefined);
};

const onCancel = () => {
	settle(undefined);
};

const onConfirm = () => {
	if (skuError.value) return;
	settle({
		sku: normalizeVariantSku(draft.sku),
		barcode: draft.barcode?.trim() ? draft.barcode.trim() : undefined,
		orig_sell_price: draft.orig_sell_price,
		sale_price: normalizeSalePrice(draft.sale_price),
		cost_price: draft.cost_price,
		manage_inventory: draft.manage_inventory,
		allow_preorder: draft.allow_preorder,
		inventory_quantity: draft.inventory_quantity,
	});
};
</script>
