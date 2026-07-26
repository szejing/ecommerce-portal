<template>
	<div>
		<UForm :schema="taxRuleSchema" :state="new_tax_rule" class="space-y-4" @submit="onSubmit">
			<!-- *********************** General Info *********************** -->
			<ZInputTaxRuleGeneralInfo v-model:code="new_tax_rule.code" v-model:description="new_tax_rule.description" />

			<!-- *********************** Details *********************** -->

			<div class="flex items-center justify-between mt-6">
				<h3 class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ t('components.taxForm.taxRuleDetails') }}</h3>
				<UButton size="sm" color="success" variant="ghost" @click="emits('select-detail', undefined)">{{ t('components.taxForm.addRuleDetail') }}</UButton>
			</div>

			<div v-if="new_tax_rule.details && new_tax_rule.details.length > 0" class="space-y-3 mt-4">
				<div class="space-y-2">
					<div
						v-for="(detail, index) in new_tax_rule.details"
						:key="index"
						class="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
						@click="emits('select-detail', detail)"
					>
						<div class="flex-1 min-w-0">
							<div class="flex items-center space-x-4">
								<p class="text-sm font-medium text-neutral-900 dark:text-white truncate">
									{{ detail.tax_code ?? t('components.taxForm.noTaxCode') }}
								</p>

								<UBadge v-if="detail.tax_condition?.amount_type" :label="`${detail.tax_condition.amount_type}`" size="xs" color="info" variant="soft" />
								<UBadge v-if="detail.tax_condition?.rate" :label="`${detail.tax_condition.rate}%`" size="xs" color="success" variant="soft" />
								<UBadge
									v-if="detail.tax_condition?.min_amount"
									:label="t('components.taxForm.minAmount', { amount: detail.tax_condition.min_amount })"
									size="xs"
									color="neutral"
									variant="soft"
								/>
							</div>
							<p class="text-xs text-neutral-500 dark:text-neutral-400 truncate">
								{{ detail.description || t('components.taxForm.noDescription') }}
							</p>
							<div class="flex items-center space-x-2">
								<p v-if="detail.tax_condition?.starts_at" class="text-xs text-neutral-500 dark:text-neutral-400 truncate">
									{{ t('components.taxForm.startsAt') }}: {{ getFormattedDate(detail.tax_condition?.starts_at, 'dd MMM yyyy') }}
								</p>
								<p v-if="detail.tax_condition?.ends_at" class="text-xs text-neutral-500 dark:text-neutral-400 truncate">
									{{ t('components.taxForm.endsAt') }}: {{ getFormattedDate(detail.tax_condition?.ends_at, 'dd MMM yyyy') }}
								</p>
							</div>
						</div>
						<UButton icon="i-heroicons-trash" size="xs" color="error" variant="ghost" @click="emits('delete-detail', index)" />
					</div>
				</div>
			</div>

			<!-- Empty state when no details -->
			<div v-else class="text-center py-8 bg-neutral-50 dark:bg-neutral-800 rounded-lg mt-4">
				<div class="max-w-sm mx-auto">
					<h3 class="mt-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">{{ t('components.taxForm.noTaxRuleDetails') }}</h3>
					<p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ t('components.taxForm.noTaxRuleDetailsDesc') }}</p>
				</div>
			</div>

			<!-- *********************** Details *********************** -->

			<!-- *********************** General Info *********************** -->
			<div class="flex-center text-center mt-3">
				<UButton size="md" color="success" variant="solid" type="submit" block :loading="adding">{{ t('components.taxForm.create') }}</UButton>
			</div>
		</UForm>
	</div>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { CreateTaxRuleValidation } from '~/utils/schema';
import { getFormattedDate } from 'yeppi-common';
import type { TaxRuleCreate } from '~/utils/types/form/tax/tax-rule-creation';

const { t } = useI18n();
const taxRuleSchema = computed(() => CreateTaxRuleValidation(t));

type Schema = z.output<ReturnType<typeof CreateTaxRuleValidation>>;

const props = defineProps<{
	adding: boolean;
	newTaxRule: TaxRuleCreate;
}>();

const emits = defineEmits(['create-tax-rule', 'select-detail', 'delete-detail']);
const new_tax_rule = computed(() => {
	return {
		...props.newTaxRule,
		details: props.newTaxRule.details.map((detail) => ({
			...detail,
		})),
	};
});

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { code, description, details } = event.data;

	emits('create-tax-rule', {
		code,
		description,
		details,
	});
};
</script>

<style scoped></style>
