<template>
	<UTabs :items="product_additional_info">
		<template #default="{ item }">
			<div class="flex items-center gap-2">
				<span class="text-sm font-medium hidden sm:block">{{ item.label }}</span>
			</div>
		</template>

		<template #variations>
			<div class="space-y-6 pt-4">
				<ZInputProductAdditionalInfoTabSectionHeader
					:icon="ICONS.LAYERS"
					title-key="components.productUpdate.productVariants"
					description-key="components.productUpdate.addOptionsVariations"
					tooltip-key="components.productUpdate.variantsTooltip"
				/>

				<!-- Variations Input -->
				<ZInputProductVariations :variations="product.variations" @update:variations="updateProductVariations" />

				<!-- Variant List (auto-generated) -->
				<ZInputProductVariantList
					:variations="product.variations"
					:variants="product.variants"
					:product="product"
					@delete:variant="deleteProductVariant"
					@update:variants="updateProductVariants"
				/>
			</div>
		</template>

		<template #service>
			<div class="space-y-4 pt-4">
				<ZInputProductAdditionalInfoTabSectionHeader
					:icon="ICONS.SETTINGS_ROUNDED"
					title-key="components.productUpdate.serviceSettings"
					description-key="components.productUpdate.configureBookingRequirements"
					tooltip-key="components.productUpdate.setUpServiceTooltip"
				/>

				<ZInputProductService v-model:metadata="product.metadata" @update:product-metadata="updateProductMetadata" />
			</div>
		</template>

		<template #tax>
			<div class="space-y-4 pt-4">
				<ZInputProductAdditionalInfoTabSectionHeader
					:icon="ICONS.TAX"
					title-key="components.productUpdate.taxSettings"
					description-key="components.productUpdate.configureTaxRulesProduct"
					tooltip-key="components.productUpdate.setUpTaxTooltipProduct"
				/>

				<div class="text-center py-12 text-neutral-500">
					<UIcon :name="ICONS.SETTINGS_ROUNDED" class="w-12 h-12 mx-auto mb-3 text-neutral-300" />
					<p class="text-sm">{{ t('components.productUpdate.taxConfigurationComingSoon') }}</p>
				</div>
			</div>
		</template>
	</UTabs>
</template>

<script lang="ts" setup>
import type { ProductCreate } from '~/utils/types/form/product-creation';
import type { Product, ProductVariantInput } from '~/utils/types/product';
import type { ProductVariationInput } from '~/utils/types/product-variation';
import { ProductType } from 'yeppi-common';
import { ICONS } from '~/utils/icons';

const props = defineProps({
	product: {
		type: Object as PropType<ProductCreate | Product>,
		required: true,
	},
});

const emit = defineEmits(['update:variations', 'update:variants', 'delete:variant', 'update:metadata']);
const { t } = useI18n();
const productTypeStore = useProductTypeStore();

const product = computed({
	get() {
		return props.product;
	},
	set(_) {},
});

// Show service tab when canonical kind is SERVICE (merchant type matched by enum value).
const shouldShowService = computed(() => {
	const p = product.value as ProductCreate | Product;
	let kind: string | undefined;

	if ('type_id' in p && p.type_id != null) {
		kind = productTypeStore.prod_types.find((pt) => pt.id === p.type_id)?.value;
	} else if ('type' in p && typeof p.type === 'string') {
		kind = p.type as string;
	}
	return kind === ProductType.SERVICE;
});

// Build tabs array with dynamic badges
const product_additional_info = computed(() => {
	const tabs = [];

	tabs.push({
		label: t('components.productUpdate.variationsTab'),
		slot: 'variations',
		icon: ICONS.LAYERS,
	});

	// Conditionally add service for kind SERVICE
	if (shouldShowService.value) {
		tabs.push({
			label: t('components.productUpdate.serviceTab'),
			slot: 'service',
			icon: ICONS.SETTINGS_ROUNDED,
		});
	}

	// Always add tax
	tabs.push({
		label: t('nav.tax'),
		slot: 'tax',
		icon: ICONS.TAX,
	});

	return tabs;
});

// Event handlers
const updateProductVariations = (value: ProductVariationInput[]) => {
	emit('update:variations', value);
};

const updateProductVariants = (value: ProductVariantInput[]) => {
	emit('update:variants', value);
};

const deleteProductVariant = (value: ProductVariantInput) => {
	emit('delete:variant', value);
};

const updateProductMetadata = (value: Record<string, unknown>) => {
	emit('update:metadata', value);
};
</script>

<style scoped>
/* Smooth transitions for tab content */
:deep(.ui-tabs-container) {
	transition: all 0.2s ease-out;
}

/* Improve scrollbar appearance if content overflows */
:deep(.ui-tabs-container) {
	scrollbar-width: thin;
	scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
}

:deep(.ui-tabs-container)::-webkit-scrollbar {
	width: 6px;
	height: 6px;
}

:deep(.ui-tabs-container)::-webkit-scrollbar-track {
	background: transparent;
}

:deep(.ui-tabs-container)::-webkit-scrollbar-thumb {
	background-color: rgba(0, 0, 0, 0.1);
	border-radius: 3px;
}

:deep(.ui-tabs-container)::-webkit-scrollbar-thumb:hover {
	background-color: rgba(0, 0, 0, 0.2);
}
</style>
