<template>
	<UModal
		:title="t('components.zModal.updateCategory')"
		:ui="{
			content: 'w-full sm:max-w-[60%] md:max-w-[40%] lg:max-w-[30%]',
		}"
	>
		<template #body>
			<UForm ref="formRef" :schema="categorySchema" :state="state.category" class="space-y-4" @submit="onSubmit">
				<div class="w-full">
					<ZDropzone class="mt-2" :existing-images="[state.category.thumbnail]" @files-selected="updateThumbnail" />
				</div>

				<div class="w-full hidden">
					<ZDropzone class="mt-2" multiple :existing-images="state.category.images" @files-selected="updateImages" />
				</div>

				<div class="flex justify-end">
					<USwitch
						v-model="state.category.is_active"
						class="mt-2"
						:label="
							t('components.zModal.categoryDetail.currentStatusLabel', {
								status: state.category.is_active ? t('components.zModal.categoryDetail.statusActive') : t('components.zModal.categoryDetail.statusDisabled'),
							})
						"
					/>
				</div>

				<!-- *********************** General Info *********************** -->
				<ZInputProductCategoryGeneralInfo v-model:code="state.category.code" v-model:description="state.category.description" is-update />
				<!-- *********************** General Info *********************** -->

				<div class="w-full">
					<h4 class="text-sm font-medium text-neutral-900 dark:text-neutral-100">{{ t('components.zModal.parentCategory') }}</h4>
					<ZSelectMenuCategory v-model:category="state.category.parent_category" :ignore-codes="[state.category.code]" class="mt-2 w-full" />
				</div>
			</UForm>
		</template>

		<template #footer>
			<div class="flex-jbetween-icenter w-full">
				<UButton color="error" variant="ghost" class="opacity-50 hover:opacity-100" @click="onDelete">{{ t('components.zModal.delete') }}</UButton>

				<div class="flex-jend gap-4">
					<UButton color="neutral" variant="soft" @click="onCancel">{{ t('common.cancel') }}</UButton>
					<UButton color="primary" variant="solid" :loading="updating" @click="submitForm">{{ t('components.zModal.update') }}</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { UpdateCategoryValidation } from '~/utils/schema';
import type { Category } from '~/utils/types/category';

const { t } = useI18n();
const categorySchema = computed(() => UpdateCategoryValidation(t));

type Schema = z.infer<ReturnType<typeof UpdateCategoryValidation>>;

const props = defineProps({
	category: {
		type: Object as PropType<Category>,
		required: true,
	},
});
const emit = defineEmits(['update', 'delete', 'cancel']);

const state = reactive({
	category: props.category,
});

const categoryStore = useProductCategoryStore();
const { updating } = storeToRefs(categoryStore);
const newThumbnail = ref<File>();
const newImages = ref<File[]>();
const formRef = ref();

const updateThumbnail = (files: File[]) => {
	newThumbnail.value = files[0];
};

const updateImages = (files: File[]) => {
	newImages.value = files;
};

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { code, description, is_active, is_internal, parent_category } = event.data;

	emit('update', { code, description, is_active, is_internal, parent_category, thumbnail: newThumbnail.value, images: newImages.value });
};

const submitForm = () => {
	formRef.value?.submit();
};

const onCancel = () => {
	emit('cancel');
};

const onDelete = () => {
	emit('delete');
};
</script>

<style scoped></style>
