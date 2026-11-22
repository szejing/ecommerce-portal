<template>
	<div class="flex items-center gap-3 justify-between sm:justify-end">
		<div class="flex items-center gap-2">
			<span class="text-sm text-gray-600 dark:text-gray-400">{{ t('common.show') }}</span>
			<USelect :model-value="modelValue" :items="pageSizeOptions" size="sm" class="w-20" @update:model-value="$emit('update:modelValue', $event)" />
			<span class="text-sm text-gray-600 dark:text-gray-400">{{ t('common.entries') }}</span>
		</div>

		<UButton
			v-if="exportEnabled"
			variant="outline"
			:disabled="exporting"
			:loading="exporting"
			size="sm"
			v-bind="controls === 'outline' ? { color: 'primary' as const, icon: 'i-heroicons-arrow-down-tray' } : {}"
			@click="$emit('export')"
		>
			<UIcon v-if="controls !== 'outline'" :name="ICONS.EXCEL" class="size-4" />
			{{ t('common.export') }}
		</UButton>

		<USelectMenu
			v-if="showColumnSelection"
			v-model="selectedColumns"
			:items="columnOptions"
			multiple
			value-key="key"
			label-key="label"
			icon="i-heroicons-view-columns"
			color="neutral"
			size="sm"
			:variant="controls === 'outline' ? 'outline' : 'ghost'"
			class="w-fit min-w-0 font-medium text-xs sm:min-w-0"
			:ui="{ content: 'w-56 max-h-60 overflow-y-auto' }"
		>
			{{ t('components.selectMenu.showColumns') }}
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
		/** Outline matches the products listing toolbar. Default keeps the quieter listing controls. */
		controls?: 'default' | 'outline';
		columnOptions?: ColumnOption[];
		selectedColumnKeys?: string[];
	}>(),
	{
		exportEnabled: true,
		exporting: false,
		controls: 'default',
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
