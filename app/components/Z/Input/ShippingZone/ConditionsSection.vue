<template>
	<div class="space-y-3">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<div>
				<h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
					{{ t('components.shippingZoneForm.conditionsTitle') }}
				</h3>
				<p class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
					{{ t('components.shippingZoneForm.fieldHints.conditions') }}
				</p>
			</div>
			<UButton v-if="canAddCondition" color="primary" variant="soft" size="sm" icon="i-lucide-plus" @click="addCondition">
				{{ t('components.shippingZoneForm.addCondition') }}
			</UButton>
		</div>

		<UAlert v-if="!includeCountryPresent" color="warning" variant="subtle" :title="t('components.shippingZoneForm.worldwideWarning')" />

		<div v-if="!state.conditions.length" class="text-sm text-muted">
			{{ t('components.shippingZoneForm.noConditions') }}
		</div>

		<div v-for="(cond, index) in state.conditions" :key="`${cond.filter_operator}-${cond.field}-${index}`" class="border border-default rounded-lg p-4 space-y-3">
			<div class="flex items-center justify-between gap-2">
				<span class="text-sm font-medium">{{ t('components.shippingZoneForm.conditionRow', { n: index + 1 }) }}</span>
				<UButton color="error" variant="ghost" size="xs" icon="i-lucide-trash-2" :label="t('common.delete')" @click="removeCondition(index)" />
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<UFormField :name="`conditions.${index}.filter_operator`" :label="t('components.shippingZoneForm.conditionOperator')">
					<USelect v-model="cond.filter_operator" :items="operatorItems" value-key="value" class="w-full" />
				</UFormField>
				<UFormField :name="`conditions.${index}.field`" :label="t('components.shippingZoneForm.conditionField')">
					<USelect v-model="cond.field" :items="fieldItems" value-key="value" class="w-full" @update:model-value="() => onFieldChange(cond)" />
				</UFormField>
				<UFormField :name="`conditions.${index}.values`" :label="t('components.shippingZoneForm.conditionValues')">
					<ZSelectMenuState
						v-if="cond.field === ShippingZoneConditionField.STATE"
						v-model:state-names="cond.values"
						multiple
						:placeholder="t('components.shippingZoneForm.selectStates')"
					>
						<template #default="{ values, stateLabel, deselect, placeholder }">
							<div v-if="values.length > 0" class="flex flex-wrap gap-1.5">
								<UBadge v-for="st in values" :key="st" color="primary" variant="subtle" class="inline-flex max-w-[min(100%,12rem)] items-center gap-1">
									<span class="min-w-0 truncate">{{ stateLabel(st) }}</span>
									<UIcon
										:name="ICONS.CROSS"
										class="w-3.5 h-3.5 shrink-0 text-error-500 cursor-pointer"
										@click.stop="deselect(st)"
									/>
								</UBadge>
							</div>
							<span v-else class="text-neutral-400 text-sm">{{ placeholder }}</span>
						</template>
					</ZSelectMenuState>
					<UInputTags
						v-else-if="cond.field === ShippingZoneConditionField.POSTCODE"
						:model-value="cond.values"
						:placeholder="t('components.shippingZoneForm.postcodePlaceholder')"
						:delimiter="postcodeDelimiter"
						:convert-value="normalizePostcodeTag"
						add-on-blur
						add-on-enter
						add-on-tab
						add-on-paste
						:duplicate="false"
						size="md"
						class="w-full"
						@update:model-value="(tags) => setPostcodeValues(cond, tags)"
					/>
					<ZSelectMenuCountry
						v-else
						v-model:iso2-codes="cond.values"
						multiple
						:placeholder="t('components.shippingZoneForm.selectCountries')"
					>
						<template #default="{ values, countryLabel, deselect, placeholder }">
							<div v-if="values.length > 0" class="flex flex-wrap gap-1.5">
								<UBadge v-for="code in values" :key="code" color="primary" variant="subtle" class="inline-flex max-w-[min(100%,12rem)] items-center gap-1">
									<span class="min-w-0 truncate">{{ countryLabel(code) }}</span>
									<UIcon
										:name="ICONS.CROSS"
										class="w-3.5 h-3.5 shrink-0 text-error-500 cursor-pointer"
										@click.stop="deselect(code)"
									/>
								</UBadge>
							</div>
							<span v-else class="text-neutral-400 text-sm">{{ placeholder }}</span>
						</template>
					</ZSelectMenuCountry>
				</UFormField>
			</div>
			<p v-if="cond.field === ShippingZoneConditionField.POSTCODE" class="text-xs text-neutral-500 dark:text-neutral-400">
				{{ t('components.shippingZoneForm.fieldHints.postcodes') }}
			</p>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { FilterOperator, ShippingZoneConditionField } from 'yeppi-common';
import {
	hasIncludeCountry,
	nextAvailableCondition,
	splitPostcodeText,
	type ShippingZoneConditionForm,
} from '~/utils/shipping-zone-conditions';
import { ICONS } from '~/utils/icons';
import type { ShippingZoneFormFields } from '~/utils/types/form/shipping-zone-form';

const { t } = useI18n();

const props = defineProps<{
	state: Pick<ShippingZoneFormFields, 'conditions'>;
}>();

const operatorItems = computed(() =>
	Object.values(FilterOperator).map((v) => ({
		label: t(`components.shippingZoneForm.operator.${v}`),
		value: v,
	})),
);

const fieldItems = computed(() =>
	Object.values(ShippingZoneConditionField).map((v) => ({
		label: t(`components.shippingZoneForm.field.${v}`),
		value: v,
	})),
);

const includeCountryPresent = computed(() => hasIncludeCountry(props.state.conditions));
const canAddCondition = computed(() => nextAvailableCondition(props.state.conditions) != null);

function addCondition() {
	const next = nextAvailableCondition(props.state.conditions);
	if (!next) {
		return;
	}
	props.state.conditions.push(next);
}

function removeCondition(index: number) {
	props.state.conditions.splice(index, 1);
}

function onFieldChange(cond: ShippingZoneConditionForm) {
	cond.values = [];
}

const postcodeDelimiter = /[\n,]+/;

function normalizePostcodeTag(value: string): string {
	return value.trim().toUpperCase();
}

function setPostcodeValues(cond: ShippingZoneConditionForm, tags: Array<string | number>) {
	cond.values = splitPostcodeText(tags.map((tag) => String(tag)).join(','));
}
</script>
