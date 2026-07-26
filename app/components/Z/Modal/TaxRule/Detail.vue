<template>
	<UModal
		:title="t('components.zModal.updateTaxRuleDetail')"
		:ui="{
			content: 'w-full sm:max-w-[60%] md:max-w-[40%] lg:max-w-[30%]',
		}"
	>
		<template #body>
			<UForm :schema="detailSchema" :state="state.detail" class="space-y-4" @submit="onSubmit">
				<!-- *********************** Tax Detail *********************** -->
				<div class="space-y-4">
					<div class="flex-jbetween-icenter">
						<h4 class="text-neutral-700 text-sm">{{ t('common.code') }} <span class="text-red-500">*</span></h4>

						<UFormField name="code" required>
							<ZSelectMenuTax :tax="state.detail.tax_code" @update:tax="updateTax" />
						</UFormField>
					</div>

					<div class="flex-jbetween-icenter">
						<h4 class="text-neutral-700 text-sm">{{ t('common.description') }} <span class="text-red-500">*</span></h4>

						<UFormField v-slot="{ error }" name="description" required>
							<UInput v-model="state.detail.description" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('common.description')" />
						</UFormField>
					</div>
				</div>
				<!-- *********************** Tax Detail *********************** -->

				<!-- *********************** Tax Rule Condition *********************** -->
				<ZInputTaxRuleCondition
					v-model:start-date="state.detail.tax_condition.starts_at"
					v-model:end-date="state.detail.tax_condition.ends_at"
					v-model:amount-type="state.detail.tax_condition.amount_type"
					v-model:rate="state.detail.tax_condition.rate"
					class="mt-4"
				/>
			</UForm>
		</template>

		<template #footer>
			<div class="flex-jbetween-icenter w-full">
				<UButton color="error" variant="ghost" class="opacity-50 hover:opacity-100" @click="onDelete">{{ t('components.zModal.delete') }}</UButton>

				<div class="flex-jend gap-4">
					<UButton color="neutral" variant="soft" @click="onCancel">{{ t('common.cancel') }}</UButton>
					<UButton color="primary" variant="solid" type="submit">{{ t('components.zModal.update') }}</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { TaxDetailValidation } from '~/utils/schema';
import type { Tax } from '~/utils/types/tax';
import type { TaxRuleDetail } from '~/utils/types/tax-rule-detail';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const detailSchema = computed(() => TaxDetailValidation(t));

type Schema = z.infer<ReturnType<typeof TaxDetailValidation>>;

const props = defineProps({
	detail: {
		type: Object as PropType<TaxRuleDetail | undefined>,
		required: false,
		default: undefined,
	},
});
const emit = defineEmits(['update', 'delete', 'cancel']);

const state = reactive({
	detail: {
		description: props.detail?.description ?? undefined,
		tax_code: props.detail?.tax?.code ?? undefined,
		tax_condition: props.detail?.tax_condition ?? {
			tax_code: undefined,
			starts_at: undefined,
			ends_at: undefined,
			amount_type: undefined,
			rate: undefined,
			min_amount: undefined,
			max_amount: undefined,
			filters: [],
		},
	},
});

const updateTax = (tax: Tax) => {
	state.detail.tax_code = tax.code;
	state.detail.tax_condition.tax_code = tax.code;
};

// const updateStartDate = (startDate: string) => {
// 	if (state.detail.condition) {
// 		state.detail.condition.starts_at = startDate;
// 	}
// };

// const updateEndDate = (endDate: string) => {
// 	if (state.detail.condition) {
// 		state.detail.condition.ends_at = endDate;
// 	}
// };

// const updateAmountType = (amountType: string) => {
// 	if (state.detail.condition) {
// 		state.detail.condition.amount_type = amountType;
// 	}
// };

// const updateRate = (rate: number) => {
// 	if (state.detail.condition) {
// 		state.detail.condition.rate = rate;
// 	}
// };

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { description, tax_condition, tax_code } = event.data;

	emit('update', { description, tax_condition, tax_code });
};

const onDelete = () => {
	emit('delete');
};

const onCancel = () => {
	emit('cancel');
};
</script>

<style scoped></style>
