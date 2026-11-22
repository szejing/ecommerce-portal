<template>
	<div class="flex items-center justify-between gap-3 max-lg:flex-wrap sm:justify-end">
		<div class="flex items-center gap-2">
			<span class="text-sm text-gray-600 dark:text-gray-400">{{ t('common.show') }}</span>
			<USelect
				:model-value="modelValue"
				:items="pageSizeOptions"
				:aria-label="t('catalogMobile.rowsPerPage')"
				size="sm"
				class="w-20 max-lg:min-h-11"
				@update:model-value="$emit('update:modelValue', $event)"
			/>
			<span class="text-sm text-gray-600 dark:text-gray-400">{{ t('common.entries') }}</span>
		</div>

		<UButton
			v-if="exportEnabled"
			variant="outline"
			:disabled="exporting"
			:loading="exporting"
			size="sm"
			class="max-lg:min-h-11"
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
			variant="outline"
			class="w-fit min-w-0 font-medium text-xs max-lg:min-h-11"
			:class="{ 'max-lg:hidden': desktopColumns }"
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
		controls?: 'default' | 'outline';
		desktopColumns?: boolean;
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
