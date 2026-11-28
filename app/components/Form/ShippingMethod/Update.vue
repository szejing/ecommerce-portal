<template>
	<div class="w-full">
		<UForm ref="formRef" :schema="shippingMethodSchema" :state="formState" class="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-6 lg:mb-6" @submit="submitForm">
			<div class="min-w-0 space-y-3 lg:col-span-9 lg:space-y-6">
				<ZInputShippingMethodDetailsSection :state="formState" :currency-code="currencyCode" />
			</div>

			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-4">
					<FormShippingMethodReviewSummary :summary="reviewSummary" subtitle-key="components.shippingMethodForm.reviewSubtitleEdit" />
				</div>
			</div>
		</UForm>
	</div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import type { ShippingMethodOption } from '~/utils/types/order-fulfillment-shipping';
import type { ShippingMethodFormFields } from '~/utils/types/form/shipping-method-form';
import { UpdateShippingMethodFormValidation } from '~/utils/schema';

const props = defineProps<{
	methodId: string | number;
	initialMethod: ShippingMethodOption;
}>();

const shippingStore = useShippingMethodStore();
const { t } = useI18n();

const shippingMethodSchema = computed(() => UpdateShippingMethodFormValidation(t));

type Schema = z.infer<ReturnType<typeof UpdateShippingMethodFormValidation>>;

const formState = reactive<ShippingMethodFormFields>({
	description: '',
	priority: 1,
	is_active: true,
});

const currencyCode = computed(() => props.initialMethod.currency_code ?? 'MYR');

const reviewSummary = computed(() => ({
	description: formState.description.trim(),
	priorityLabel: String(Number(formState.priority) || 1),
	statusLabel: t(formState.is_active ? 'common.active' : 'common.inactive'),
}));

const formRef = ref<{ submit: () => void } | null>(null);

const applyFromMethod = (m: ShippingMethodOption) => {
	formState.description = m.description;
	formState.priority = m.priority ?? 1;
	formState.is_active = m.is_active;
};

watch(
	() => props.initialMethod,
	(m) => {
		if (m) {
			applyFromMethod(m);
		}
	},
	{ immediate: true },
);

const submitForm = async (event: FormSubmitEvent<Schema>) => {
	const { description, priority, is_active } = event.data;

	const result = await shippingStore.updateShippingMethod(props.methodId, {
		description,
		priority,
		is_active,
	});

	if (result) {
		navigateTo(`/settings/shipping/methods`);
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
