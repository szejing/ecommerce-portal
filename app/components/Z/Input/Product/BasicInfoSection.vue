<template>
	<UCard id="section-basic-info" class="shadow-md scroll-mt-4">
		<template #header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<UIcon :name="ICONS.INFO" class="text-primary-500 w-6 h-6" />
						<h2 class="text-xl font-semibold">{{ t('components.productUpdate.basicInformation') }}</h2>
						<span class="text-red-500 text-sm">*</span>
					</div>
					<p class="text-sm text-neutral-500 mt-1">{{ t('components.productUpdate.essentialProductDetails') }}</p>
				</div>
				<UTooltip :text="t('pages.essentialInfoTooltip')" :popper="{ placement: 'bottom' }">
					<UIcon :name="ICONS.HELP" class="text-neutral-400 hover:text-primary-500 w-5 h-5 cursor-help" />
				</UTooltip>
			</div>
		</template>

		<div class="space-y-6 py-2 px-4">
			<!-- Product Basic Fields -->
			<div class="space-y-4">
				<div class="w-full flex flex-wrap items-center gap-4 justify-end">
					<!-- <UFormField name="status" :label="t('components.selectMenu.selectProductStatus')" class="min-w-0 flex-1 sm:flex-initial">
						<ZSelectMenuProductStatus v-model:status="state.status" />
					</UFormField> -->
					<UFormField>
            <USwitch v-model="published" :label="t(published ? 'components.productUpdate.showInStore' : 'components.productUpdate.hideInStore')" />
					</UFormField>
				</div>

        <UFormField name="type_id" :label="t('components.productUpdate.productType')" required>
					<ZSelectMenuProductType v-model:type-id="state.type_id" />
        </UFormField>
        <UFormField v-if="isGoods" label="Composition" name="composition">
          <USelect v-model="state.composition" :items="[{ label: 'Single item', value: 'single' }, { label: 'Fixed combo', value: 'fixed_combo' }]" :disabled="!!state.variants?.length" class="w-full sm:w-64" @update:model-value="onCompositionChange" />
        </UFormField>
        <ZInputProductComboComponents v-if="isGoods && state.composition === 'fixed_combo'" v-model="state.combo_components" :product-code="state.code" />

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<UFormField name="code" :label="t('components.productUpdate.productCode')">
						<p class="text-xs text-neutral-500 my-1">{{ t('components.productUpdate.uniqueIdentifier') }}</p>
						<UInput
							:model-value="state.code"
							:placeholder="t('components.productUpdate.productCodePlaceholder')"
							:disabled="codeDisabled"
							@update:model-value="onCodeInput($event)"
						/>
					</UFormField>
					<UFormField name="name" :label="t('components.productUpdate.productName')" required>
						<p class="text-xs text-neutral-500 my-1">{{ t('components.productUpdate.nameCustomersSee') }}</p>
						<UInput v-model="state.name" :placeholder="t('components.productUpdate.productNamePlaceholder')" />
					</UFormField>
				</div>

				<UFormField name="short_desc" :label="t('components.productUpdate.shortDescription')" required>
					<p class="text-xs text-neutral-500 my-1">{{ t('components.productUpdate.briefDescription') }}</p>
					<UInput
						v-model="state.short_desc"
						:maxlength="PRODUCT_SHORT_DESC_MAX"
						:placeholder="t('components.productUpdate.shortDescPlaceholder')"
					/>
					<p class="mt-1 text-xs text-muted text-right">
						{{
							t('components.productUpdate.shortDescCounter', {
								n: (state.short_desc ?? '').length,
								max: PRODUCT_SHORT_DESC_MAX,
							})
						}}
					</p>
				</UFormField>

				<UFormField v-if="showLongDescription" name="long_desc" :label="t('components.productUpdate.longDescription')">
					<p class="text-xs text-neutral-500 my-1">{{ t('components.productUpdate.longDescriptionHint') }}</p>
					<ZInputProductLongDescriptionEditor
						:model-value="state.long_desc ?? ''"
						:placeholder="t('components.productUpdate.longDescPlaceholder')"
						@update:model-value="state.long_desc = $event"
					/>
				</UFormField>
			</div>

			<hr class="my-6" />

			<!-- Simple Product inventory (goods only; hidden when Variants exist or Service) -->
      <div v-if="showInventory && state.composition !== 'fixed_combo'" class="space-y-4">
				<h3 class="text-lg font-semibold">{{ t('components.zInput.inventory') }}</h3>
				<div class="flex flex-wrap items-center gap-4">
					<UCheckbox
						v-model="state.manage_inventory"
						name="manageInventory"
						:label="t('components.zInput.manageInventory')"
						color="success"
						@update:model-value="onManageInventoryChange"
					/>
					<UCheckbox
						v-model="state.allow_preorder"
						name="allowPreorder"
						:label="t('components.zInput.allowPreorder')"
						color="success"
						:disabled="!state.manage_inventory"
					/>
				</div>
				<div v-if="state.manage_inventory" class="max-w-xs">
          <UFormField name="inventory_quantity" label="Available Quantity">
						<UInput v-model.number="state.inventory_quantity" type="number" :min="0" step="1" />
					</UFormField>
					<ZInputProductStockAddition v-if="codeDisabled && state.code" :product-code="state.code" class="mt-3" @received="updateStockBalance" />
				</div>
			</div>

			<hr v-if="showInventory" class="my-6" />

			<!-- Product Images -->
			<div class="space-y-4">
				<h3 class="text-lg font-semibold">{{ t('components.productUpdate.productImages') }}</h3>
				<div class="flex flex-col gap-6 sm:flex-row sm:justify-between">
					<div class="flex flex-col w-full">
						<div class="flex items-center gap-2 mb-2">
							<h4 class="text-md font-medium">{{ t('components.productUpdate.thumbnail') }}</h4>
							<UTooltip :text="t('pages.mainImageTooltip')" :popper="{ placement: 'right' }">
								<UIcon :name="ICONS.HELP" class="text-neutral-400 w-4 h-4 cursor-help" />
							</UTooltip>
						</div>
						<p class="text-xs text-neutral-500 mb-3">{{ t('components.productUpdate.recommendedRatio') }}</p>
						<ZDropzone
							class="max-w-full sm:max-w-62.5"
							:existing-images="state.thumbnail ? [state.thumbnail] : []"
							@files-selected="emit('update:thumbnail', $event)"
							@delete-image="emit('delete:thumbnail')"
						/>
					</div>

					<div class="flex flex-col w-full">
						<div class="flex items-center gap-2 mb-2">
							<h4 class="text-md font-medium">{{ t('components.productUpdate.additionalImages') }}</h4>
							<UTooltip :text="t('pages.moreImagesTooltip', { count: PRODUCT_GALLERY_MAX })" :popper="{ placement: 'right' }">
								<UIcon :name="ICONS.HELP" class="text-neutral-400 w-4 h-4 cursor-help" />
							</UTooltip>
						</div>
						<p class="text-xs text-neutral-500 mb-3">{{ t('components.productUpdate.maxGalleryImages', { count: PRODUCT_GALLERY_MAX }) }}</p>
						<ZDropzone
							multiple
							:max-images="PRODUCT_GALLERY_MAX"
							class="max-w-full sm:max-w-62.5"
							:existing-images="state.images ?? []"
							@files-selected="emit('update:images', $event)"
							@delete-image="emit('delete:image', $event)"
						/>
					</div>
				</div>
			</div>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import { PRODUCT_GALLERY_MAX, PRODUCT_SHORT_DESC_MAX, ProductStatus, ProductType } from 'yeppi-common';
import type { ComboComponent } from '~/utils/types/product';
import type { Image } from '~/utils/types/image';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

export type ProductBasicInfoState = {
  composition?: 'single' | 'fixed_combo';
  combo_components?: ComboComponent[];
  variants?: unknown[];
  variations?: unknown[];
	status?: ProductStatus;
	is_active?: boolean;
	type_id?: number;
	code?: string;
	name?: string;
	short_desc?: string;
	long_desc?: string | null;
	thumbnail?: File | Image;
	images?: File[] | Image[];
	manage_inventory?: boolean;
	allow_preorder?: boolean;
	inventory_quantity?: number;
	expected_inventory_quantity?: number;
};

const props = withDefaults(
	defineProps<{
		state: ProductBasicInfoState;
		codeDisabled?: boolean;
		showLongDescription?: boolean;
		showInventory?: boolean;
	}>(),
	{ codeDisabled: false, showLongDescription: true, showInventory: false },
);

const emit = defineEmits<{
	'update:thumbnail': [files: File[]];
	'update:images': [files: File[]];
	'delete:thumbnail': [];
	'delete:image': [image: Image];
}>();

const state = toRef(props, 'state');
const productTypeStore = useProductTypeStore();
const isGoods = computed(() => productTypeStore.prod_types.find((type) => type.id === state.value.type_id)?.value === ProductType.ITEM);
const published = computed({
  get: () => state.value.status === ProductStatus.PUBLISHED && state.value.is_active !== false,
  set: (value: boolean) => { state.value.status = value ? ProductStatus.PUBLISHED : ProductStatus.DRAFT; if (value) state.value.is_active = true; },
});
function onCompositionChange(value: string) {
  if (value === 'fixed_combo') { state.value.manage_inventory = false; state.value.allow_preorder = false; state.value.inventory_quantity = 0; state.value.variations = []; }
}
function updateStockBalance(quantity: number) {
  state.value.inventory_quantity = quantity;
  state.value.expected_inventory_quantity = quantity;
}

function onManageInventoryChange(value: boolean | 'indeterminate') {
	if (value !== true) {
		state.value.allow_preorder = false;
	}
}

function onCodeInput(value: string | number | null | undefined) {
	if (props.codeDisabled) return;
	const str = value != null ? String(value) : '';
	state.value.code = str.toUpperCase();
}
</script>
