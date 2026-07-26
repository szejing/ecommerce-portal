<template>
	<div class="flex items-center gap-3 justify-between sm:justify-end">
		<div class="flex items-center gap-2">
			<span class="text-sm text-gray-600 dark:text-gray-400">{{ t('common.show') }}</span>
			<USelect :model-value="modelValue" :items="pageSizeOptions" size="sm" class="w-20" @update:model-value="$emit('update:modelValue', $event)" />
			<span class="text-sm text-gray-600 dark:text-gray-400">{{ t('common.entries') }}</span>
		</div>

		<UButton v-if="exportEnabled" variant="outline" :disabled="exporting" :loading="exporting" size="sm" @click="$emit('export')">
			<UIcon :name="ICONS.EXCEL" class="w-4 h-4" />
			{{ t('common.export') }}
		</UButton>

		<USelectMenu
			v-if="showColumnSelection"
			v-model="selectedColumns"
			:items="columnOptions"
			multiple
			value-key="key"
			label-key="label"
			:ui="{ content: 'w-56 max-h-60 overflow-y-auto' }"
		>
			<UButton icon="i-heroicons-view-columns" color="neutral" variant="ghost" size="xs">
				{{ t('components.selectMenu.showColumns') }}
			</UButton>
		</USelectMenu>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
const { t } = useI18n();
type ColumnOption = {
	key: string;
	label: string;
};

const props = withDefaults(
	defineProps<{
		modelValue: number;
		pageSizeOptions: number[];
		exportEnabled?: boolean;
		exporting?: boolean;
		columnOptions?: ColumnOption[];
		selectedColumnKeys?: string[];
	}>(),
	{
		exportEnabled: true,
		exporting: false,
		columnOptions: () => [],
		selectedColumnKeys: () => [],
	},
);

const emit = defineEmits<{
	(e: 'update:modelValue', value: number): void;
	(e: 'update:selectedColumnKeys', value: string[]): void;
	(e: 'export'): void;
}>();

const showColumnSelection = computed(() => props.columnOptions.length > 0);

const selectedColumns = computed({
	get: () => props.selectedColumnKeys,
	set: (value: string[]) => emit('update:selectedColumnKeys', value),
});
</script>
