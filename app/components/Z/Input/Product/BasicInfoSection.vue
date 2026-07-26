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
						<USwitch v-model="state.is_active" :label="t(state.is_active ? 'components.productUpdate.showInStore' : 'components.productUpdate.hideInStore')" />
					</UFormField>
				</div>

				<UFormField name="type_id" :label="t('components.productUpdate.productType')" required>
					<ZSelectMenuProductType v-model:type-id="state.type_id" />
				</UFormField>

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
					<UInput v-model="state.short_desc" :placeholder="t('components.productUpdate.shortDescPlaceholder')" />
				</UFormField>
			</div>

			<hr class="my-6" />

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
							<UTooltip :text="t('pages.moreImagesTooltip')" :popper="{ placement: 'right' }">
								<UIcon :name="ICONS.HELP" class="text-neutral-400 w-4 h-4 cursor-help" />
							</UTooltip>
						</div>
						<p class="text-xs text-neutral-500 mb-3">{{ t('components.productUpdate.max3Images') }}</p>
						<ZDropzone
							multiple
							:max-images="3"
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
import type { ProductStatus } from 'yeppi-common';
import type { Image } from '~/utils/types/image';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

export type ProductBasicInfoState = {
	status?: ProductStatus;
	is_active?: boolean;
	type_id?: number;
	code?: string;
	name?: string;
	short_desc?: string;
	thumbnail?: File | Image;
	images?: File[] | Image[];
};

const props = withDefaults(
	defineProps<{
		state: ProductBasicInfoState;
		codeDisabled?: boolean;
	}>(),
	{ codeDisabled: false },
);

const emit = defineEmits<{
	'update:thumbnail': [files: File[]];
	'update:images': [files: File[]];
	'delete:thumbnail': [];
	'delete:image': [image: Image];
}>();

const state = toRef(props, 'state');

function onCodeInput(value: string | number | null | undefined) {
	if (props.codeDisabled) return;
	const str = value != null ? String(value) : '';
	state.value.code = str.toUpperCase();
}
</script>
