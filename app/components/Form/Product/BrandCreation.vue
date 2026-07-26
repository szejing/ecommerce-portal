<template>
	<UForm :schema="brandSchema" :state="new_brand" class="space-y-4" @submit="onSubmit">
		<!-- *********************** General Info *********************** -->
		<div class="space-y-2">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('components.productForm.generalInformation') }}</h3>
			<p class="text-sm text-neutral-400">{{ t('components.productForm.brandGeneralDesc') }}</p>
			<ZInputProductBrandGeneralInfo v-model:code="new_brand.code" v-model:description="new_brand.description" />
		</div>

		<!-- Submit Button -->
		<div class="flex justify-center pt-4">
			<UButton color="success" size="md" :loading="adding" type="submit">
				<UIcon :name="ICONS.CHECK_ROUNDED" class="w-4 h-4" />
				<span class="text-sm">{{ t('pages.createBrand') }}</span>
			</UButton>
		</div>
	</UForm>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { CreateBrandValidation } from '~/utils/schema';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const brandSchema = computed(() => CreateBrandValidation(t));
type Schema = z.infer<ReturnType<typeof CreateBrandValidation>>;

const brandStore = useBrandStore();
const { adding, new_brand } = storeToRefs(brandStore);

onMounted(() => {
	brandStore.resetNewProductBrand();
});

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { code, description, is_active } = event.data;

	new_brand.value = {
		code,
		description,
		is_active,
	};

	const brand = await brandStore.createBrand();

	if (brand) {
		useRouter().back();
	}
};
</script>

<style scoped></style>
