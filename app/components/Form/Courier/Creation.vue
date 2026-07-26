<template>
	<div class="w-full">
		<UForm ref="formRef" :schema="courierSchema" :state="new_courier" class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6" @submit="submitForm">
			<div class="lg:col-span-9 space-y-6">
				<ZInputCourierDetailsSection :state="new_courier" />
			</div>

			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-4">
					<FormCourierReviewSummary :summary="reviewSummary" subtitle-key="components.courierForm.reviewSubtitleCreate" />
				</div>
			</div>
		</UForm>
	</div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { CreateCourierValidation } from '~/utils/schema';

const { t } = useI18n();
const courierStore = useCourierStore();
const { new_courier } = storeToRefs(courierStore);

const courierSchema = computed(() => CreateCourierValidation(t));

type Schema = z.infer<ReturnType<typeof CreateCourierValidation>>;

const reviewSummary = computed(() => ({
	name: new_courier.value.name.trim(),
	description: (new_courier.value.description ?? '').trim(),
	statusLabel: t(new_courier.value.is_active ? 'common.active' : 'common.inactive'),
}));

onMounted(() => {
	courierStore.resetNewCourier();
});

const formRef = ref<{ submit: () => void } | null>(null);

const submitForm = async (event: FormSubmitEvent<Schema>) => {
	const { name, description, is_active } = event.data;

	const success = await courierStore.createCourier({
		name,
		description,
		is_active,
	});

	if (success) {
		navigateTo('/settings/shipping/couriers');
	}
};

const submit = () => {
	formRef.value?.submit();
};

defineExpose({ submit });
</script>

<style scoped>
html {
	scroll-behavior: smooth;
}

@media (max-width: 640px) {
	.space-y-6 > * + * {
		margin-top: 1.5rem;
	}
}
</style>
