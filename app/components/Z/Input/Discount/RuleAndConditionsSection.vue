<template>
	<UCard id="section-discount-rule-conditions" class="shadow-md scroll-mt-4">
		<template #header>
			<div class="flex items-center gap-2">
				<UIcon :name="ICONS.INFO" class="text-primary-500 w-6 h-6" />
				<h2 class="text-xl font-semibold">{{ t('components.discountForm.ruleAndConditionsSection') }}</h2>
				<span class="text-red-500 text-sm">*</span>
			</div>
		</template>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 px-4">
			<UFormField :label="t('components.discountForm.discType')" :name="fieldName('disc_type')" required>
				<USelect :model-value="state.disc_type" :items="discTypeItems" value-attribute="value" class="w-full" @update:model-value="ondiscTypeSelect" />
			</UFormField>
			<UFormField
				v-if="state.disc_type !== DiscountType.FREE_SHIPPING"
				:label="t('components.discountForm.discValue')"
				:name="fieldName('disc_value')"
				required
			>
				<UInput v-model.number="state.disc_value" type="number" min="0" :max="state.disc_type === DiscountType.PERCENTAGE ? 100 : undefined" step="0.01">
					<template #trailing>
						<span class="text-muted text-sm pe-2 tabular-nums">{{ discValueSuffix }}</span>
					</template>
				</UInput>
				<p v-if="state.disc_type === DiscountType.PERCENTAGE" class="text-xs text-muted mt-1">
					{{ t('components.discountForm.discValuePercentHint') }}
				</p>
			</UFormField>
		</div>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 px-4">
			<UFormField :label="t('components.discountForm.usageLimit')" :name="fieldName('usage_limit')">
				<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.discountForm.usageLimitHint') }}</p>
				<UInput v-model.number="usageLimitModel" type="number" min="1" :placeholder="t('components.discountForm.usageLimitPlaceholder')" />
			</UFormField>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 px-4">
			<UFormField :label="t('components.discountForm.minOrderAmt')" :name="fieldName('min_order_amt')">
				<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.discountForm.minOrderAmtHint') }}</p>
				<UInput v-model.number="state.min_order_amt" type="number" min="0" step="0.10">
					<template #leading>
						<span class="text-muted text-sm tabular-nums select-none">{{ discValueCurrencyCode }}</span>
					</template>
				</UInput>
			</UFormField>
			<UFormField :label="t('components.discountForm.maxDiscAmt')" :name="fieldName('max_disc_amt')">
				<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.discountForm.maxDiscAmtHint') }}</p>
				<UInput v-model.number="state.max_disc_amt" type="number" min="0" step="0.10">
					<template #leading>
						<span class="text-muted text-sm tabular-nums select-none">{{ discValueCurrencyCode }}</span>
					</template>
				</UInput>
			</UFormField>
		</div>

		<div v-if="state.allocation !== AllocationType.BILL" class="border-t border-default mt-2 pt-6 pb-2">
			<div class="flex flex-wrap items-center justify-between gap-3 px-4">
				<div class="flex items-center gap-2">
					<UIcon :name="ICONS.LAYERS" class="text-primary-500 w-5 h-5" />
					<h3 class="text-lg font-semibold">{{ t('components.discountForm.conditionsSection') }}</h3>
				</div>
				<UButton v-if="canAddCondition" color="primary" variant="soft" size="sm" icon="i-lucide-plus" @click="addCondition">
					{{ t('components.discountForm.addCondition') }}
				</UButton>
			</div>
			<p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1 px-4 mb-2">{{ t('components.discountForm.conditionsHelp') }}</p>

			<div v-if="!state.conditions?.length" class="py-4 px-4 text-sm text-muted">
				{{ t('components.discountForm.noConditions') }}
			</div>

			<div v-else class="space-y-6 py-2 px-4">
				<div v-for="(cond, index) in state.conditions" :key="index" class="space-y-4">
					<div class="flex items-center justify-between gap-2">
						<span class="text-sm font-medium text-highlighted">{{ t('components.discountForm.conditionRow', { n: index + 1 }) }}</span>
						<UButton color="error" variant="ghost" size="xs" icon="i-lucide-trash-2" :label="t('common.delete')" @click="removeCondition(index)" />
					</div>
					<div class="border-t border-default pt-4 space-y-4">
						<p class="text-xs font-medium uppercase tracking-wide text-muted">{{ t('components.discountForm.filterOptional') }}</p>
						<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<UFormField :label="t('components.discountForm.filterOperator')" :name="fieldName(`conditions.${index}.filter_operator`)">
								<ZSelectMenuDiscountFilterOperator v-model="cond.filter_operator" />
							</UFormField>
							<UFormField :label="t('components.discountForm.filterCondition')" :name="fieldName(`conditions.${index}.filter_condition`)">
								<ZSelectMenuDiscountFilterCondition v-model="cond.filter_condition" @update:model-value="onFilterConditionChange(cond)" />
							</UFormField>
							<UFormField :label="t('components.discountForm.filterValue')" :name="fieldName(`conditions.${index}.filter_value`)">
								<ZInputDiscountFilterValuePicker v-model="cond.filter_value" :filter-condition="cond.filter_condition" />
							</UFormField>
						</div>
					</div>
				</div>
			</div>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import { AllocationType, DiscountType } from 'yeppi-common';
import type { CreateDiscountConditionReq } from '~/repository/modules/discount/models/request/create-discount.req';
import type { DiscountCreate } from '~/utils/types/form/discount-creation';
import { ICONS } from '~/utils/icons';

const props = withDefaults(
	defineProps<{
		state: DiscountCreate;
		/** Dot-prefix for UFormField names (e.g. `discount` → `discount.disc_type`). */
		formFieldPrefix?: string;
	}>(),
	{ formFieldPrefix: '' },
);

const { t } = useI18n();
const state = toRef(props, 'state');

const fieldName = (segment: string) => (props.formFieldPrefix ? `${props.formFieldPrefix}.${segment}` : segment);

const MAX_CONDITIONS = 1;

const canAddCondition = computed(() => (state.value.conditions?.length ?? 0) < MAX_CONDITIONS);

/** Hardcoded until merchant currency is wired into this form. */
const discValueCurrencyCode = 'RM';

const discTypeLabel = (rt: DiscountType) =>
	t(
		{
			[DiscountType.FIXED]: 'components.discountForm.discTypeOptionFixed',
			[DiscountType.PERCENTAGE]: 'components.discountForm.discTypeOptionPercentage',
			[DiscountType.FREE_SHIPPING]: 'components.discountForm.discTypeOptionFreeShipping',
		}[rt],
	);

const discTypeItems = computed(() => Object.values(DiscountType).map((v) => ({ label: discTypeLabel(v), value: v })));

const discValueSuffix = computed(() => {
	const rt = state.value.disc_type;
	if (rt === DiscountType.FIXED) return discValueCurrencyCode;
	if (rt === DiscountType.PERCENTAGE) return '%';
	return '';
});

const ondiscTypeSelect = (v: DiscountType) => {
	const prev = state.value.disc_type;
	state.value.disc_type = v;
	if (v === DiscountType.FREE_SHIPPING) {
		state.value.disc_value = 0;
	} else if (prev === DiscountType.FREE_SHIPPING) {
		const rv = state.value.disc_value ?? 0;
		if (v === DiscountType.PERCENTAGE && (rv <= 0 || rv > 100)) {
			state.value.disc_value = 10;
		} else if (v === DiscountType.FIXED && rv <= 0) {
			state.value.disc_value = 1;
		}
	}
};

const usageLimitModel = computed({
	get() {
		return state.value.usage_limit ?? '';
	},
	set(v: number | string) {
		if (v === '' || v === null || v === undefined) {
			state.value.usage_limit = undefined;
			return;
		}
		const n = typeof v === 'number' ? v : Number(v);
		state.value.usage_limit = Number.isNaN(n) ? undefined : n;
	},
});

const emptyCondition = (): CreateDiscountConditionReq => {
	return {
		filter_operator: undefined,
		filter_condition: undefined,
		filter_value: '',
	};
};

const addCondition = () => {
	const list = state.value.conditions ?? [];
	if (list.length >= MAX_CONDITIONS) return;
	state.value.conditions = [...list, emptyCondition()];
};

const removeCondition = (index: number) => {
	const list = [...(state.value.conditions ?? [])];
	list.splice(index, 1);
	state.value.conditions = list;
};

const onFilterConditionChange = (condition: CreateDiscountConditionReq) => {
	condition.filter_value = '';
};
</script>
