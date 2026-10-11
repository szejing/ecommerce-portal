<template>
	<UCard id="section-basic-info" class="shadow-md scroll-mt-4">
		<template #header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<UIcon :name="ICONS.INFO" class="text-primary-500 w-6 h-6" />
						<h2 class="text-xl font-semibold">{{ t('combo.basicInformation') }}</h2>
						<span class="text-red-500 text-sm">*</span>
					</div>
					<p class="text-sm text-neutral-500 mt-1">{{ t('combo.essentialDetails') }}</p>
				</div>
				<UTooltip :text="t('pages.essentialInfoTooltip')" :popper="{ placement: 'bottom' }">
					<UIcon :name="ICONS.HELP" class="text-neutral-400 hover:text-primary-500 w-5 h-5 cursor-help" />
				</UTooltip>
			</div>
		</template>

		<div class="space-y-6 py-2 px-4">
			<div class="w-full flex flex-wrap items-center gap-4 justify-end">
				<UFormField>
					<USwitch v-model="published" :label="t(published ? 'combo.showInStore' : 'combo.hideInStore')" />
				</UFormField>
			</div>

			<section
				aria-labelledby="combo-included-items-heading"
				class="rounded-xl border border-default/15 bg-elevated/60 p-4 sm:p-5"
			>
				<ZInputComboComponents
					v-model="state.combo_components"
					v-model:reference-total="referenceTotal"
					:product-code="state.code"
					:currency-code="currencyCode"
				/>
			</section>

			<hr class="border-default/15" />

			<div class="space-y-4">
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<UFormField name="code" :label="t('combo.code')">
						<p class="text-xs text-neutral-500 my-1">{{ t('combo.uniqueIdentifier') }}</p>
						<UInput
							:model-value="state.code"
							:placeholder="t('combo.codePlaceholder')"
							:disabled="codeDisabled"
							@update:model-value="onCodeInput($event)"
						/>
					</UFormField>
					<UFormField name="name" :label="t('combo.name')" required>
						<p class="text-xs text-neutral-500 my-1">{{ t('combo.nameCustomersSee') }}</p>
						<UInput v-model="state.name" :placeholder="t('combo.namePlaceholder')" />
					</UFormField>
				</div>

				<UFormField name="short_desc" :label="t('combo.shortDescription')" required>
					<p class="text-xs text-neutral-500 my-1">{{ t('combo.briefDescription') }}</p>
					<UInput
						v-model="state.short_desc"
						:maxlength="PRODUCT_SHORT_DESC_MAX"
						:placeholder="t('combo.shortDescPlaceholder')"
					/>
					<p class="mt-1 text-xs text-muted text-right">
						{{
							t('combo.shortDescCounter', {
								n: (state.short_desc ?? '').length,
								max: PRODUCT_SHORT_DESC_MAX,
							})
						}}
					</p>
				</UFormField>

				<UFormField v-if="showLongDescription" name="long_desc" :label="t('combo.longDescription')">
					<p class="text-xs text-neutral-500 my-1">{{ t('combo.longDescriptionHint') }}</p>
					<ZInputProductLongDescriptionEditor
						:model-value="state.long_desc ?? ''"
						:placeholder="t('combo.longDescPlaceholder')"
						@update:model-value="state.long_desc = $event"
					/>
				</UFormField>
			</div>

			<hr class="border-default/15" />

			<div class="space-y-4">
				<h3 class="text-lg font-semibold">{{ t('combo.images') }}</h3>
				<div class="flex flex-col gap-6 sm:flex-row sm:justify-between">
					<div class="flex flex-col w-full">
						<div class="flex items-center gap-2 mb-2">
							<h4 class="text-md font-medium">{{ t('combo.thumbnail') }}</h4>
							<UTooltip :text="t('pages.mainImageTooltip')" :popper="{ placement: 'right' }">
								<UIcon :name="ICONS.HELP" class="text-neutral-400 w-4 h-4 cursor-help" />
							</UTooltip>
						</div>
						<p class="text-xs text-neutral-500 mb-3">{{ t('combo.recommendedRatio') }}</p>
						<ZDropzone
							class="max-w-full sm:max-w-62.5"
							:existing-images="state.thumbnail ? [state.thumbnail] : []"
							@files-selected="emit('update:thumbnail', $event)"
							@delete-image="emit('delete:thumbnail')"
						/>
					</div>

					<div class="flex flex-col w-full">
						<div class="flex items-center gap-2 mb-2">
							<h4 class="text-md font-medium">{{ t('combo.additionalImages') }}</h4>
							<UTooltip :text="t('pages.moreImagesTooltip', { count: PRODUCT_GALLERY_MAX })" :popper="{ placement: 'right' }">
								<UIcon :name="ICONS.HELP" class="text-neutral-400 w-4 h-4 cursor-help" />
							</UTooltip>
						</div>
						<p class="text-xs text-neutral-500 mb-3">{{ t('combo.maxGalleryImages', { count: PRODUCT_GALLERY_MAX }) }}</p>
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
import { PRODUCT_GALLERY_MAX, PRODUCT_SHORT_DESC_MAX, ProductStatus } from 'yeppi-common';
import type { ComboComponent } from '~/utils/types/product';
import type { Image } from '~/utils/types/image';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

export type ComboBasicInfoState = {
	composition?: 'single' | 'fixed_combo';
	combo_components?: ComboComponent[];
	status?: ProductStatus;
	is_active?: boolean;
	type_id?: number;
	code?: string;
	name?: string;
	short_desc?: string;
	long_desc?: string | null;
	thumbnail?: File | Image;
	images?: File[] | Image[];
};

const referenceTotal = defineModel<number | null>('referenceTotal', { default: null });

const props = withDefaults(
	defineProps<{
		state: ComboBasicInfoState;
		codeDisabled?: boolean;
		showLongDescription?: boolean;
		currencyCode?: string;
	}>(),
	{ codeDisabled: false, showLongDescription: true, currencyCode: 'MYR' },
);

const emit = defineEmits<{
	'update:thumbnail': [files: File[]];
	'update:images': [files: File[]];
	'delete:thumbnail': [];
	'delete:image': [image: Image];
}>();

const state = toRef(props, 'state');
const published = computed({
	get: () => state.value.status === ProductStatus.PUBLISHED && state.value.is_active !== false,
	set: (value: boolean) => {
		state.value.status = value ? ProductStatus.PUBLISHED : ProductStatus.DRAFT;
		if (value) state.value.is_active = true;
	},
});

function onCodeInput(value: string | number | null | undefined) {
	if (props.codeDisabled) return;
	const str = value != null ? String(value) : '';
	state.value.code = str.toUpperCase();
}
</script>
