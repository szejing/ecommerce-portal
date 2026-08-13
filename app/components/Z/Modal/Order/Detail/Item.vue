<template>
	<UModal
		:title="t('components.zModal.updateItem')"
		:ui="{
			content: 'w-full sm:max-w-[60%] md:max-w-[55%] lg:max-w-[50%]',
		}"
	>
		<template #body>
			<UForm :schema="itemSchema" :state="state.item" class="space-y-4" @submit="onSubmit">
				<!-- *********************** General Info *********************** -->
				<ZInputOrderDetailItem
					v-model:status="state.item.status"
					v-model:prod-code="state.item.prod_code"
					v-model:prod-name="state.item.prod_name"
					v-model:prod-variant-code="state.item.prod_variant_code"
					v-model:prod-variant-name="state.item.prod_variant_name"
					v-model:prod-variant-sku="state.item.prod_variant_sku"
					v-model:currency-code="state.item.currency_code"
					v-model:order-qty="state.item.qty"
					v-model:unit-sell-price="state.item.unit_sell_price"
					v-model:appointment="state.item.appointment"
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
import type { ItemModel } from '~/utils/models/item.model';
import type { Order } from '~/utils/types/order';
import { UpdateOrderItemValidation } from '~/utils/schema';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';

const { t } = useI18n();
const itemSchema = computed(() => UpdateOrderItemValidation(t));

type Schema = z.infer<ReturnType<typeof UpdateOrderItemValidation>>;

const orderStore = useOrderStore();
const is_loading = ref(false);

const props = defineProps({
	order: {
		type: Object as PropType<Order>,
		required: true,
	},
	item: {
		type: Object as PropType<ItemModel>,
		required: true,
	},
});

const emit = defineEmits(['update', 'cancel']);
const state = reactive({
	item: props.item,
});

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	try {
		is_loading.value = true;

		const outcome = await orderStore.updateItems(
			JSON.parse(JSON.stringify(event.data)) as ItemModel,
			props.order.items as ItemModel[],
		);
		if (outcome.status === 'completed') {
			successNotification(t('orderHistory.notifications.itemUpdated'));
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
