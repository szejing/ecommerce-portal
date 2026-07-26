<template>
	<UModal
		:title="t('components.zModal.updateBrand')"
		:ui="{
			content: 'w-full sm:max-w-[60%] md:max-w-[40%] lg:max-w-[30%]',
		}"
	>
		<template #body>
			<UForm ref="form" :schema="brandSchema" :state="state.brand" class="space-y-4" @submit="onSubmit">
				<div class="flex-jbetween-icenter gap-4">
					<UFormField :label="t('components.zModal.brandDetail.status')" name="is_active">
						<USwitch
							v-model="state.brand.is_active"
							class="mt-2"
							:label="
								t('components.zModal.brandDetail.currentStatusLabel', {
									status: state.brand.is_active ? t('components.zModal.brandDetail.statusActive') : t('components.zModal.brandDetail.statusDisabled'),
								})
							"
						/>
					</UFormField>
				</div>

				<!-- *********************** General Info *********************** -->
				<ZInputProductBrandGeneralInfo v-model:code="state.brand.code" v-model:description="state.brand.description" />
				<!-- *********************** General Info *********************** -->
			</UForm>
		</template>

		<template #footer>
			<div class="flex-jbetween-icenter w-full">
				<UButton color="error" variant="ghost" class="opacity-50 hover:opacity-100" @click="onDelete">{{ t('components.zModal.delete') }}</UButton>

				<div class="flex-jend gap-4">
					<UButton color="neutral" variant="soft" @click="onCancel">{{ t('common.cancel') }}</UButton>
					<UButton color="primary" variant="solid" :loading="updating" @click="form.submit()">{{ t('components.zModal.update') }}</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { UpdateBrandValidation } from '~/utils/schema';
import type { Brand } from '~/utils/types/brand';

const { t } = useI18n();
const brandSchema = computed(() => UpdateBrandValidation(t));

type Schema = z.infer<ReturnType<typeof UpdateBrandValidation>>;

const props = defineProps({
	brand: {
		type: Object as PropType<Brand> | undefined,
		required: true,
	},
});
const emit = defineEmits(['update', 'delete', 'cancel']);

const form = ref();

const state = reactive({
	brand: props.brand,
});

const brandStore = useBrandStore();
const { updating } = storeToRefs(brandStore);

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { code, description, is_active } = event.data;
	emit('update', { code, description, is_active });
};

const onCancel = () => {
	emit('cancel');
};

const onDelete = () => {
	emit('delete');
};
</script>

<style scoped></style>
