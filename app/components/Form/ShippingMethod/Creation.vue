<template>
	<div class="w-full">
		<UForm ref="formRef" :schema="shippingMethodSchema" :state="new_shipping_method" class="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-6 lg:mb-6" @submit="submitForm">
			<div class="min-w-0 space-y-3 lg:col-span-9 lg:space-y-6">
				<ZInputShippingMethodDetailsSection :state="new_shipping_method" :currency-code="currencyCode" />
			</div>

			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-4">
					<FormShippingMethodReviewSummary :summary="reviewSummary" subtitle-key="components.shippingMethodForm.reviewSubtitleCreate" />
				</div>
			</div>
		</UForm>
	</div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { CreateShippingMethodValidation } from '~/utils/schema';

const shippingStore = useShippingMethodStore();
const { t } = useI18n();
const { new_shipping_method } = storeToRefs(shippingStore);

const shippingMethodSchema = computed(() => CreateShippingMethodValidation(t));

type Schema = z.infer<ReturnType<typeof CreateShippingMethodValidation>>;

const currencyCode = 'MYR';

const reviewSummary = computed(() => ({
	description: new_shipping_method.value.description.trim(),
	priorityLabel: String(Number(new_shipping_method.value.priority) || 1),
	statusLabel: t(new_shipping_method.value.is_active ? 'common.active' : 'common.inactive'),
}));

onMounted(() => {
	shippingStore.resetNewShippingMethod();
});

const formRef = ref<{ submit: () => void } | null>(null);

const submitForm = async (event: FormSubmitEvent<Schema>) => {
	const { description, priority, is_active } = event.data;

	const success = await shippingStore.createShippingMethod({
		description,
		priority,
		is_active,
	});

	if (success) {
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
