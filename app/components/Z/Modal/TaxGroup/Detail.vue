<template>
	<UModal
		:title="t('components.zModal.updateTaxGroup')"
		:ui="{
			content: 'w-full sm:max-w-[60%] md:max-w-[40%] lg:max-w-[30%]',
		}"
	>
		<template #body>
			<UForm :schema="taxGroupSchema" :state="state.tax" class="space-y-4" @submit="onSubmit">
				<ZInputTaxGroupGeneralInfo v-model:code="state.tax.code" v-model:description="state.tax.description" v-model:taxes="state.tax.taxes" is-update />
			</UForm>
		</template>

		<template #footer>
			<div class="flex-jbetween-icenter w-full">
				<UButton color="error" variant="ghost" class="opacity-50 hover:opacity-100" @click="onDelete">{{ t('components.zModal.delete') }}</UButton>

				<div class="flex-jend gap-4">
					<UButton color="neutral" variant="soft" @click="onCancel">{{ t('common.cancel') }}</UButton>
					<UButton color="primary" variant="solid" :loading="updating" type="submit">{{ t('components.zModal.update') }}</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { UpdateTaxGroupValidation } from '~/utils/schema';
import type { TaxGroup } from '~/utils/types/tax-group';

const { t } = useI18n();
const taxGroupSchema = computed(() => UpdateTaxGroupValidation(t));

type Schema = z.output<ReturnType<typeof UpdateTaxGroupValidation>>;

const props = defineProps({
	taxGroup: {
		type: Object as PropType<TaxGroup> | undefined,
		required: true,
	},
});
const emit = defineEmits(['update', 'delete', 'cancel']);

const state = reactive({
	tax: {
		code: props.taxGroup.code,
		description: props.taxGroup.description,
		taxes: props.taxGroup.taxes,
	},
});

const taxStore = useTaxStore();
const { updating } = storeToRefs(taxStore);

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { description, taxes } = event.data;

	emit('update', { description, taxes });
};

const onDelete = () => {
	emit('delete');
};

const onCancel = () => {
	emit('cancel');
};
</script>

<style scoped></style>
