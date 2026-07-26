<template>
	<UForm :schema="tagSchema" :state="new_tag" class="space-y-4" @submit="onSubmit">
		<!-- *********************** General Info *********************** -->
		<div class="space-y-2">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('components.productForm.generalInformation') }}</h3>
			<p class="text-sm text-neutral-400">{{ t('components.productForm.tagGeneralDesc') }}</p>
			<ZInputProductTagGeneralInfo v-model:value="new_tag.value" />
		</div>

		<!-- Submit Button -->
		<div class="flex justify-center pt-4">
			<UButton color="success" size="md" :loading="adding" type="submit">
				<UIcon :name="ICONS.CHECK_ROUNDED" class="w-4 h-4" />
				<span class="text-sm">{{ t('pages.createTag') }}</span>
			</UButton>
		</div>
	</UForm>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { CreateTagValidation } from '~/utils/schema';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const tagSchema = computed(() => CreateTagValidation(t));

type Schema = z.infer<ReturnType<typeof CreateTagValidation>>;

const tagStore = useProductTagStore();
const { adding, new_tag } = storeToRefs(tagStore);

onMounted(() => {
	tagStore.resetNewTag();
});

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { value } = event.data;
	const tag = await tagStore.addTag(value);

	if (tag) {
		useRouter().back();
	}
};
</script>

<style scoped></style>
