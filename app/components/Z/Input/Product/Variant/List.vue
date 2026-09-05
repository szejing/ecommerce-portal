<template>
	<div v-if="validVariations.length > 0 && variantRows.length > 0" class="space-y-4">
		<h4 class="text-sm font-semibold text-neutral-900">{{ t('components.variantList.title') }}</h4>

		<!-- Apply to All -->
		<div class="space-y-2 mb-2">
			<div class="flex flex-wrap items-center gap-3">
				<UInput
					v-model="applyAll.orig"
					:placeholder="t('components.variantList.pricePlaceholder')"
					type="number"
					size="sm"
					class="max-w-44"
					:ui="{ base: 'ps-12' }"
					:aria-label="t('components.variantList.price')"
				>
					<template #leading>
						<span class="text-xs text-neutral-400">{{ currencyCode }}</span>
					</template>
				</UInput>
				<UInput
					v-model="applyAll.sale"
					:placeholder="t('components.variantList.salePricePlaceholder')"
					type="number"
					size="sm"
					class="max-w-44"
					:ui="{ base: 'ps-12' }"
					:aria-label="t('components.variantList.salePrice')"
				>
					<template #leading>
						<span class="text-xs text-neutral-400">{{ currencyCode }}</span>
					</template>
				</UInput>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<UCheckbox
					v-model="applyAll.manage_inventory"
					name="applyAllManageInventory"
					:label="t('components.zInput.manageInventory')"
					color="success"
					@update:model-value="onApplyAllManageChange"
				/>
				<UCheckbox
					v-model="applyAll.allow_preorder"
					name="applyAllAllowPreorder"
					:label="t('components.zInput.allowPreorder')"
					color="success"
					:disabled="!applyAll.manage_inventory"
				/>
				<UInput
					v-if="applyAll.manage_inventory"
					v-model="applyAll.inventory_quantity"
					:placeholder="t('components.zInput.quantity')"
					type="number"
					size="sm"
					class="max-w-36"
					:min="0"
					step="1"
					:aria-label="t('components.zInput.quantity')"
				/>
				<UButton color="primary" variant="soft" size="sm" @click="applyToAll">
					{{ t('components.variantList.applyToAll') }}
				</UButton>
			</div>
		</div>

		<!-- Variants Table -->
		<div class="border border-neutral-200 rounded-lg overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="bg-neutral-50 border-b border-neutral-200">
					<tr>
						<th v-for="(variation, vIdx) in validVariations" :key="'header-' + vIdx" class="text-left px-3 py-2 text-xs font-semibold text-neutral-700">
							<div class="flex items-center gap-1">
								<span class="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
								{{ variationDisplayName(variation, vIdx) }}
							</div>
						</th>
						<th class="text-left px-3 py-2 text-xs font-semibold text-neutral-700">
							<span class="text-red-500">*</span> {{ t('components.variantList.price') }}
						</th>
						<th class="text-left px-3 py-2 text-xs font-semibold text-neutral-700">
							{{ t('components.variantList.salePrice') }}
						</th>
						<th v-if="showStockColumn" class="text-left px-3 py-2 text-xs font-semibold text-neutral-700">
							{{ t('components.variantList.stock') }}
						</th>
						<th class="w-12 px-3 py-2">
							<span class="sr-only">{{ t('components.variantList.edit') }}</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<template v-for="(row, rowIdx) in variantRows" :key="row.key">
						<tr class="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/50">
							<!-- Single variation -->
							<template v-if="validVariations.length === 1">
								<td class="px-3 py-2 text-neutral-900 font-medium">
									{{ row.optionLabels[0] }}
								</td>
							</template>
							<!-- Two variations with rowspan grouping -->
							<template v-else>
								<td v-if="isFirstInGroup(rowIdx)" :rowspan="groupSize" class="px-3 py-2 text-neutral-900 font-medium align-top border-r border-neutral-100">
									{{ row.optionLabels[0] }}
								</td>
								<td class="px-3 py-2 text-neutral-700">
									{{ row.optionLabels[1] }}
								</td>
							</template>

							<!-- Original Sell Price -->
							<td class="px-3 py-2 align-top">
								<UFormField
									v-slot="{ error }"
									:name="`variants.${rowIdx}.price_types.0.orig_sell_price`"
									:label="undefined"
									class="[&_.ui-form-field-label]:sr-only"
								>
									<div class="flex flex-col gap-0.5">
										<UInput
											v-model.number="row.variant.price_types![0]!.orig_sell_price"
											type="number"
											size="sm"
											class="max-w-44"
											:ui="{ base: 'ps-12' }"
											:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
											@update:model-value="emitVariants"
										>
											<template #leading>
												<span class="text-xs text-neutral-400">{{ currencyCode }}</span>
											</template>
										</UInput>
									</div>
								</UFormField>
							</td>

							<!-- Sale Price -->
							<td class="px-3 py-2 align-top">
								<UInput
									v-model.number="row.variant.price_types![0]!.sale_price"
									type="number"
									size="sm"
									class="max-w-44"
									:ui="{ base: 'ps-12' }"
									@blur="clearInvalidSale(row.variant)"
									@update:model-value="emitVariants"
								>
									<template #leading>
										<span class="text-xs text-neutral-400">{{ currencyCode }}</span>
									</template>
								</UInput>
							</td>

							<!-- Stock (On Hand) when Manage Inventory is on -->
							<td v-if="showStockColumn" class="px-3 py-2 align-top">
								<UInput
									v-if="row.variant.manage_inventory"
									v-model.number="row.variant.inventory_quantity"
									type="number"
									size="sm"
									class="max-w-28"
									:min="0"
									step="1"
									:placeholder="t('components.variantList.stockPlaceholder')"
									:aria-label="t('components.variantList.stock')"
									@update:model-value="emitVariants"
								/>
								<span v-else class="text-neutral-400">—</span>
							</td>
						</tr>
					</template>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ZInputProductVariantDetail } from '#components';
import type { ProductCreate } from '~/utils/types/form/product-creation';
import type { Product, ProductVariantInput } from '~/utils/types/product';
import type { ProductOptionInput } from '~/utils/types/product-option';
import type { ProductVariationInput } from '~/utils/types/product-variation';
import {
	applyVariantDetailPayload,
	applyVariantListInventoryToAll,
	applyVariantListPricesToAll,
	getValidProductOptions,
	getValidProductVariations,
	normalizeSalePrice,
	resolveProductVariationId,
} from '~/utils/product-variant-list';
import { ICONS } from '~/utils/icons';
import { successNotification } from '~/stores/AppUi/AppUi';

const { t } = useI18n();
const overlay = useOverlay();

const props = defineProps<{
	product: Product | ProductCreate;
	variations: ProductVariationInput[] | undefined;
	variants: ProductVariantInput[] | undefined;
}>();

const emit = defineEmits(['update:variants', 'delete:variant']);

const applyAll = reactive({
	orig: undefined as number | undefined,
	sale: undefined as number | undefined,
	manage_inventory: false,
	allow_preorder: false,
	inventory_quantity: undefined as number | undefined,
});

const onApplyAllManageChange = (value: boolean | 'indeterminate') => {
	if (value !== true) {
		applyAll.allow_preorder = false;
		applyAll.inventory_quantity = undefined;
	}
};

type VariantRow = {
	key: string;
	optionLabels: string[];
	options: ProductOptionInput[];
	variant: ProductVariantInput;
};

const variantRows = ref<VariantRow[]>([]);

const showStockColumn = computed(() => variantRows.value.some((row) => row.variant.manage_inventory));

const validVariations = computed(() => getValidProductVariations(props.variations));

const validOptions = (variation: ProductVariationInput) => getValidProductOptions(variation);

const variationDisplayName = (variation: ProductVariationInput, index: number) => {
	const trimmed = variation.name?.trim();
	return trimmed || t('components.variations.variationLabel', { index: index + 1 });
};

const groupSize = computed(() => {
	const second = validVariations.value[1];
	if (validVariations.value.length < 2 || !second) return 1;
	return validOptions(second).length;
});

const isFirstInGroup = (rowIdx: number) => {
	if (validVariations.value.length < 2) return true;
	return rowIdx % groupSize.value === 0;
};

const currencyCode = computed(() => {
	return props.product.price_types?.[0]?.currency_code ?? 'MYR';
});

const createDefaultVariant = (name: string, options: ProductOptionInput[]): ProductVariantInput => {
	const basePrice = props.product.price_types?.[0];
	return {
		name,
		variant_code: props.product.code ? `${props.product.code}_${name}` : name,
		product_code: props.product.code,
		options,
		inventory_quantity: 0,
		price_types: [
			{
				orig_sell_price: basePrice?.orig_sell_price ?? 0,
				cost_price: basePrice?.cost_price ?? 0,
				sale_price: normalizeSalePrice(basePrice?.sale_price),
				currency_code: basePrice?.currency_code ?? 'MYR',
			},
		],
	};
};

const emitVariants = () => {
	const variants = variantRows.value.map((row) => JSON.parse(JSON.stringify(row.variant)));
	emit('update:variants', variants);
};

const clearInvalidSale = (variant: ProductVariantInput) => {
	const priceType = variant.price_types?.[0];
	if (!priceType) return;
	priceType.sale_price = normalizeSalePrice(priceType.sale_price);
	emitVariants();
};

const openVariantDetail = async (rowIdx: number) => {
	const row = variantRows.value[rowIdx];
	if (!row) return;

	const otherSkus = variantRows.value.filter((_, index) => index !== rowIdx).map((r) => r.variant.sku);
	const modal = overlay.create(ZInputProductVariantDetail);
	const instance = modal.open({
		variant: JSON.parse(JSON.stringify(row.variant)) as ProductVariantInput,
		otherSkus,
		currencyCode: currencyCode.value,
	});

	const payload = await instance.result;
	if (!payload) return;

	applyVariantDetailPayload(row.variant, payload);
	emitVariants();
};

// Rebuild variant rows when variations change, preserving existing variant data.
// Do not watch props.variants here — emitVariants() updates the parent, which would re-trigger the watch and loop.
const hasInitializedVariantRows = ref(false);

watch(
	validVariations,
	(vars) => {
		if (vars.length === 0) {
			variantRows.value = [];
			if (hasInitializedVariantRows.value) {
				emitVariants();
			} else {
				hasInitializedVariantRows.value = true;
			}
			return;
		}

		const oldMap = new Map<string, VariantRow>();
		for (const row of variantRows.value) {
			oldMap.set(row.key, row);
		}

		const propsMap = new Map<string, ProductVariantInput>();
		(props.variants ?? []).forEach((v) => {
			if (v.name) propsMap.set(v.name, v);
		});

		const newRows: VariantRow[] = [];
		const first = vars[0];
		const second = vars[1];

		if (!first) return;

		if (vars.length === 1) {
			for (const opt of validOptions(first)) {
				const key = opt.value;
				const existing = oldMap.get(key);
				if (existing) {
					newRows.push(existing);
				} else {
					const propsVariant = propsMap.get(key);
					const options: ProductOptionInput[] = [{ variation_id: resolveProductVariationId(first, opt), value: opt.value }];
					newRows.push({
						key,
						optionLabels: [opt.value],
						options,
						variant: propsVariant ? JSON.parse(JSON.stringify(propsVariant)) : createDefaultVariant(key, options),
					});
				}
			}
		} else if (second) {
			for (const opt1 of validOptions(first)) {
				for (const opt2 of validOptions(second)) {
					const key = `${opt1.value}_${opt2.value}`;
					const existing = oldMap.get(key);
					if (existing) {
						newRows.push(existing);
					} else {
						const propsVariant = propsMap.get(key);
						const options: ProductOptionInput[] = [
							{ variation_id: resolveProductVariationId(first, opt1), value: opt1.value },
							{ variation_id: resolveProductVariationId(second, opt2), value: opt2.value },
						];
						newRows.push({
							key,
							optionLabels: [opt1.value, opt2.value],
							options,
							variant: propsVariant ? JSON.parse(JSON.stringify(propsVariant)) : createDefaultVariant(key, options),
						});
					}
				}
			}
		}

		variantRows.value = newRows;
		if (hasInitializedVariantRows.value) {
			emitVariants();
		} else {
			hasInitializedVariantRows.value = true;
		}
	},
	{ immediate: true, deep: true },
);

const applyToAll = () => {
	const variants = variantRows.value.map((row) => row.variant);
	applyVariantListPricesToAll(variants, applyAll.orig, applyAll.sale);
	applyVariantListInventoryToAll(variants, applyAll.manage_inventory, applyAll.allow_preorder, applyAll.inventory_quantity);
	emitVariants();
	successNotification(t('components.variantList.applyToAllSuccess'));
};
</script>
