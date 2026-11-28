<template>
	<div class="flex items-center justify-between gap-3 max-lg:flex-wrap sm:justify-end">
		<div class="flex items-center gap-1.5 lg:gap-2">
			<span class="text-xs text-muted lg:text-sm">{{ t('common.show') }}</span>
			<USelect
				:model-value="modelValue"
				:items="pageSizeOptions"
				:aria-label="t('catalogMobile.rowsPerPage')"
				size="xs"
				class="w-16 lg:w-20"
				:ui="{ base: 'lg:min-h-8 lg:px-2.5 lg:text-sm' }"
				@update:model-value="$emit('update:modelValue', $event)"
			/>
			<span class="text-xs text-muted lg:text-sm">{{ t('common.entries') }}</span>
		</div>

		<UButton
			v-if="exportEnabled"
			variant="outline"
			:disabled="exporting"
			:loading="exporting"
			size="xs"
			class="lg:h-8 lg:min-h-8 lg:px-2.5 lg:text-sm"
			v-bind="controls === 'outline' ? { color: 'primary' as const, icon: 'i-heroicons-arrow-down-tray' } : {}"
			@click="$emit('export')"
		>
			<UIcon v-if="controls !== 'outline'" :name="ICONS.EXCEL" class="size-3.5 lg:size-4" />
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
			size="xs"
			variant="outline"
			class="w-fit min-w-0 font-medium text-xs lg:h-8 lg:min-h-8 lg:text-sm"
			:class="{ 'max-lg:hidden': desktopColumns }"
			:ui="{ base: 'lg:px-2.5', content: 'w-56 max-h-60 overflow-y-auto' }"
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
