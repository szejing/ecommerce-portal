<template>
	<div class="w-full">
		<UForm ref="formRef" :schema="courierSchema" :state="formState" class="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-6 lg:mb-6" @submit="submitForm">
			<div class="min-w-0 space-y-3 lg:col-span-9 lg:space-y-6">
				<ZInputCourierDetailsSection :state="formState" />
			</div>

			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-4">
					<FormCourierReviewSummary :summary="reviewSummary" subtitle-key="components.courierForm.reviewSubtitleEdit" />
				</div>
			</div>
		</UForm>
	</div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import type { Courier } from '~/utils/types/courier';
import type { CourierFormFields } from '~/utils/types/form/courier-form';
import { UpdateCourierFormValidation } from '~/utils/schema';

const props = defineProps<{
	courierId: string | number;
	initialCourier: Courier;
}>();

const courierStore = useCourierStore();
const { t } = useI18n();

const courierSchema = computed(() => UpdateCourierFormValidation(t));

type Schema = z.infer<ReturnType<typeof UpdateCourierFormValidation>>;

const formState = reactive<CourierFormFields>({
	name: '',
	description: '',
	is_active: true,
});

const reviewSummary = computed(() => ({
	name: formState.name.trim(),
	description: (formState.description ?? '').trim(),
	statusLabel: t(formState.is_active ? 'common.active' : 'common.inactive'),
}));

const formRef = ref<{ submit: () => void } | null>(null);

const applyFromCourier = (courier: Courier) => {
	formState.name = courier.name;
	formState.description = courier.description ?? '';
	formState.is_active = courier.is_active;
};

watch(
	() => props.initialCourier,
	(courier) => {
		if (courier) {
			applyFromCourier(courier);
		}
	},
	{ immediate: true },
);

const submitForm = async (event: FormSubmitEvent<Schema>) => {
	const { name, description, is_active } = event.data;

	const result = await courierStore.updateCourier(props.courierId, {
		name,
		description,
		is_active,
	});

	if (result) {
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
