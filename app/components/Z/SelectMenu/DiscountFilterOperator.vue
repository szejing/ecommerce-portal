<template>
	<USelectMenu
		v-model="inner"
		:items="items"
		value-key="value"
		size="md"
		variant="formTrigger"
		class="w-full"
		:placeholder="t('components.selectMenu.selectDiscountFilterOperator')"
		:search-input="{
			placeholder: t('components.selectMenu.searchDiscountFilterOperator'),
			icon: 'i-lucide-search',
		}"
	>
		<template #default>
			<span class="truncate">{{ selectedLabel }}</span>
		</template>

		<template #item="{ item }">
			<span class="truncate">{{ item.label }}</span>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import { FilterOperator } from 'yeppi-common';

const DEFAULT_NONE = '__none__' as const;

const props = withDefaults(
	defineProps<{
		modelValue: FilterOperator | undefined;
		noneValue?: string;
	}>(),
	{ noneValue: DEFAULT_NONE },
);

const emit = defineEmits<{ 'update:modelValue': [value: FilterOperator | undefined] }>();

const { t } = useI18n();

const humanizeEnum = (value: string) =>
	value
		.split('_')
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
		.join(' ');

const items = computed(() => [
	{ label: t('components.discountForm.filterNone'), value: props.noneValue },
	...Object.values(FilterOperator).map((v) => ({ label: humanizeEnum(v), value: v })),
]);

const inner = computed({
	get() {
		return props.modelValue ?? props.noneValue;
	},
	set(v: string | undefined) {
		if (v === undefined || v === props.noneValue) {
			emit('update:modelValue', undefined);
		} else {
			emit('update:modelValue', v as FilterOperator);
		}
	},
});

const selectedLabel = computed(() => items.value.find((i) => i.value === inner.value)?.label ?? '');
</script>
