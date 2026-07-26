<template>
	<USelectMenu
		v-model="selected"
		:items="items"
		value-key="value"
		label-key="label"
		:placeholder="t('pages.customerInsights.selectTrait')"
		variant="formTrigger"
	/>
</template>

<script lang="ts" setup>
import type { CustomerInsightKey } from 'yeppi-common';
import { customerInsightTraitOptions, type CustomerInsightSelectOption } from '~/utils/options/customer-insights';

const props = defineProps<{ modelValue?: CustomerInsightKey | null }>();

const emit = defineEmits<{
	'update:modelValue': [value: CustomerInsightKey | null];
}>();

const { t } = useI18n();

const items = computed(() => customerInsightTraitOptions(t));

const selected = computed<CustomerInsightSelectOption | null>({
	get() {
		if (!props.modelValue) return null;
		return items.value.find((item) => item.value === props.modelValue) ?? null;
	},
	set(value) {
		emit('update:modelValue', value?.value ?? null);
	},
});
</script>
