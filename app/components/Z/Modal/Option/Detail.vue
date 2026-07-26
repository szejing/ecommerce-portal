<template>
	<UModal
		:title="t('components.zModal.updateProductOption')"
		:ui="{
			content: 'w-full sm:max-w-[60%] md:max-w-[40%] lg:max-w-[30%]',
		}"
	>
		<template #body>
			<UForm ref="formRef" :schema="UpdateProductOptionValidation" :state="state.option" class="space-y-4" @submit="onSubmit">
				<UFormField v-slot="{ error }" :label="t('common.name')" name="name" required>
					<UInput v-model="state.option.name" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('common.name')" disabled />
				</UFormField>

				<div class="mt-4">
					<h6 class="text-secondary-700 text-sm font-bold">{{ t('common.values') }}</h6>
					<UInputTags v-model="values" :placeholder="t('components.zInput.enterValues')" class="w-full" color="primary" :duplicate="false" />
				</div>
			</UForm>
		</template>

		<template #footer>
			<div class="flex-jbetween-icenter w-full">
				<UButton color="error" variant="ghost" class="opacity-50 hover:opacity-100" @click="onDelete">{{ t('components.zModal.delete') }}</UButton>

				<div class="flex-jend gap-4">
					<UButton color="neutral" variant="soft" :loading="updating" :disabled="updating" @click="onCancel">{{ t('common.cancel') }}</UButton>
					<UButton color="primary" variant="solid" :loading="updating" :disabled="updating" @click="submitForm">{{ t('components.zModal.update') }}</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { UpdateProductOptionValidation } from '~/utils/schema';
import type { ProductVariation } from '~/utils/types/product-variation';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

type Schema = z.output<typeof UpdateProductOptionValidation>;
const formRef = ref();

const props = defineProps({
	productOption: {
		type: Object as PropType<ProductVariation> | undefined,
		required: true,
	},
});
const emit = defineEmits(['update', 'delete', 'cancel']);

const state = reactive({
	option: { name: props.productOption.name, values: props.productOption.options },
});

const tagStore = useProductTagStore();
const { updating } = storeToRefs(tagStore);

const values = computed({
	get() {
		return state.option.values?.map((value) => value.value) ?? [];
	},
	set(value) {
		state.option.values = value.map((v) => ({ id: 0, option_id: props.productOption.id!, value: v, metadata: {} }));
	},
});

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { name, values } = event.data;

	if (name === '' || name === undefined) {
		return;
	}

	const newValues = values?.map((v) => {
		return {
			...v,
			option_id: props.productOption.id!,
		};
	});

	emit('update', name, newValues ?? []);
};

const submitForm = () => {
	formRef.value?.submit();
};

const onDelete = () => {
	emit('delete');
};

const onCancel = () => {
	emit('cancel');
};
</script>

<style scoped></style>
