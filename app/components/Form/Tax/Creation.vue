<template>
	<div>
		<UForm :schema="taxSchema" :state="new_tax" class="space-y-4" @submit="onSubmit">
			<!-- *********************** General Info *********************** -->
			<ZInputTaxGeneralInfo
				v-model:code="new_tax.code"
				v-model:description="new_tax.description"
				v-model:is-inclusive="new_tax.is_inclusive"
				v-model:is-active="new_tax.is_active"
			/>

			<!-- *********************** General Info *********************** -->
			<div class="flex-center text-center mt-3">
				<UButton size="md" color="success" variant="solid" type="submit" block :loading="adding">{{ t('components.taxForm.create') }}</UButton>
			</div>
		</UForm>
	</div>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { CreateTaxValidation } from '~/utils/schema';

const { t } = useI18n();
const taxSchema = computed(() => CreateTaxValidation(t));

type Schema = z.output<ReturnType<typeof CreateTaxValidation>>;

const taxStore = useTaxStore();
const { adding, new_tax } = storeToRefs(taxStore);

onMounted(() => {
	taxStore.resetNewTax();
});

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { code, description, is_inclusive, is_active } = event.data;

	new_tax.value = {
		code,
		description,
		is_inclusive,
		is_active,
		metadata: undefined,
	};

	await taxStore.createTax();
};
</script>

<style scoped></style>
