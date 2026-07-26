<template>
	<UForm :schema="CreateProductOptionValidation" :state="new_prod_option" class="space-y-4" @submit="onSubmit">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('components.productForm.generalInformation') }}</h3>
		<p class="text-sm text-neutral-400">{{ t('components.productForm.optionGeneralDesc') }}</p>
		<!-- *********************** General Info *********************** -->
		<ZInputOptionGeneralInfo v-model:name="new_prod_option.name" v-model:values="new_prod_option.options" />
		<!-- *********************** General Info *********************** -->

		<div class="flex-center text-center mt-3">
			<UButton class="w-full sm:w-[50%]" size="md" color="success" variant="solid" type="submit" block :loading="adding">{{
				t('pages.createOption')
			}}</UButton>
		</div>
	</UForm>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { CreateProductOptionValidation } from '~/utils/schema';

const { t } = useI18n();

type Schema = z.output<typeof CreateProductOptionValidation>;

const optionStore = useProductOptionStore();
const { adding, new_prod_option } = storeToRefs(optionStore);

onMounted(() => {
	optionStore.resetProdVariation();
});

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { name, values } = event.data;

	await optionStore.addProductVariation(name, values ?? []);
};
</script>

<style scoped></style>
