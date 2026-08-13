<template>
	<UModal :title="t('components.zModal.updateCustomer')" :ui="{ content: 'w-full sm:max-w-[60%] md:max-w-[40%] lg:max-w-[30%]' }">
		<template #body>
			<UForm :schema="customerSchema" :state="state.customer" class="space-y-4" @submit="onSubmit">
				<!-- *********************** General Info *********************** -->
				<ZInputOrderDetailCustomer
					v-model:name="state.customer.name"
					v-model:email-address="state.customer.email_address"
					v-model:phone-no="state.customer.phone_no"
					v-model:shipping-address="state.customer.shipping_address"
					v-model:billing-address="state.customer.billing_address"
				/>
				<!-- *********************** General Info *********************** -->

				<div class="flex-jend gap-4">
					<UButton color="neutral" variant="ghost" @click="onCancel">{{ t('common.cancel') }}</UButton>
					<UButton color="primary" variant="solid" :loading="is_loading" :disabled="is_loading" type="submit">{{ t('components.zModal.update') }}</UButton>
				</div>
			</UForm>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import type { CustomerModel } from '~/utils/models/customer.model';
import { UpdateOrderCustomerValidation } from '~/utils/schema';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';

const { t } = useI18n();
const customerSchema = computed(() => UpdateOrderCustomerValidation(t));

type Schema = z.infer<ReturnType<typeof UpdateOrderCustomerValidation>>;

const orderStore = useOrderStore();
const is_loading = ref(false);

const props = defineProps({
	orderNo: {
		type: String,
		required: true,
	},
	customer: {
		type: Object as PropType<CustomerModel>,
		required: true,
	},
});
const emit = defineEmits(['update', 'cancel']);
const state = reactive({
	customer: props.customer,
});

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	try {
		is_loading.value = true;

		const outcome = await orderStore.updateCustomer(JSON.parse(JSON.stringify(event.data)));
		if (outcome.status === 'completed') {
			successNotification(t('orderHistory.notifications.customerUpdated'));
			emit('update', true);
		} else {
			if (outcome.status === 'failed') failedNotification(outcome.failure.message);
			emit('update', false);
		}
	} finally {
		is_loading.value = false;
	}
};

const onCancel = () => {
	emit('cancel');
};
</script>

<style scoped></style>
