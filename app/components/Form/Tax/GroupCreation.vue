<template>
	<div>
		<UForm :schema="taxGroupSchema" :state="state" class="mobile-form-controls space-y-4" @submit="onSubmit">
			<!-- *********************** General Info *********************** -->
			<ZInputTaxGroupGeneralInfo
				v-model:code="state.code"
				v-model:description="state.description"
				v-model:taxes="state.taxes"
			/>

			<!-- *********************** General Info *********************** -->
			<div class="flex-center text-center mt-3">
				<UButton size="md" color="success" variant="solid" type="submit" class="max-lg:min-h-11" block :loading="adding">{{ t('components.taxForm.create') }}</UButton>
			</div>
		</UForm>
	</div>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import type { TaxInput } from '~/utils/types/tax';
import { CreateTaxGroupValidation } from '~/utils/schema';

const { t } = useI18n();
const taxGroupSchema = computed(() => CreateTaxGroupValidation(t));

type Schema = z.output<ReturnType<typeof CreateTaxGroupValidation>>;

const taxGroupStore = useTaxGroupStore();
const { adding, new_tax_group } = storeToRefs(taxGroupStore);

const emit = defineEmits<{ saved: [] }>();
const state = reactive({ code: '', description: '', taxes: [] as TaxInput[] });

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { code, description, taxes } = event.data;

	new_tax_group.value = {
		code,
		description,
		tax_codes: taxes?.map((tax) => tax.code) ?? [],
	};

	if (await taxGroupStore.createTaxGroup()) emit('saved');
};
</script>

<style scoped></style>
