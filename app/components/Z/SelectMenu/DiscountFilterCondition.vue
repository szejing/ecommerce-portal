<template>
	<USelectMenu
		v-model="inner"
		:items="items"
		value-key="value"
		size="md"
		variant="formTrigger"
		class="w-full"
		:placeholder="t('components.selectMenu.selectDiscountFilterCondition')"
		:search-input="{
			placeholder: t('components.selectMenu.searchDiscountFilterCondition'),
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
import { FilterCondition } from 'yeppi-common';

const DEFAULT_NONE = '__none__' as const;

const props = withDefaults(
	defineProps<{
		modelValue: FilterCondition | undefined;
		noneValue?: string;
	}>(),
	{ noneValue: DEFAULT_NONE },
);

const emit = defineEmits<{ 'update:modelValue': [value: FilterCondition | undefined] }>();

const { t } = useI18n();

const humanizeEnum = (value: string) =>
	value
		.split('_')
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
		.join(' ');

const items = computed(() => [
	{ label: t('components.discountForm.filterNone'), value: props.noneValue },
	...Object.values(FilterCondition).map((v) => ({ label: humanizeEnum(v), value: v })),
]);

const inner = computed({
	get() {
		return props.modelValue ?? props.noneValue;
	},
	set(v: string | undefined) {
		if (v === undefined || v === props.noneValue) {
			emit('update:modelValue', undefined);
		} else {
			emit('update:modelValue', v as FilterCondition);
		}
	},
});

const selectedLabel = computed(() => items.value.find((i) => i.value === inner.value)?.label ?? '');
</script>
