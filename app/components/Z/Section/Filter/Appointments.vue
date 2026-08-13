<template>
	<div class="w-full space-y-4">
		<!-- Date Range Filter (presets + custom range in popover, same as ZDateRange desktop/mobile) -->
		<div class="flex flex-col gap-1.5">
			<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.dateRange') }}</label>
			<ZDateRange :model-value="filters.date_range" hide-presets @update:model-value="appointmentStore.setDateRange" />
		</div>

		<!-- Search + View Tabs: stacked on mobile, side-by-side on desktop -->
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.searchLabel') }}</label>
				<UInput
					:model-value="filters.query"
					:placeholder="t('components.filter.searchByNamePhone')"
					:icon="ICONS.SEARCH_ROUNDED"
					@update:model-value="appointmentStore.setSearch"
				/>
			</div>
			<div class="flex flex-wrap gap-2 shrink-0">
				<UButton
					v-for="tab in viewTabs"
					:key="tab.value"
					:variant="filter.view === tab.value ? 'solid' : 'soft'"
					:color="filter.view === tab.value ? 'primary' : 'neutral'"
					@click="selectView(tab.value)"
				>
					<span class="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-2">
						<UIcon :name="tab.icon" class="size-4 shrink-0" />
						<span class="text-xs sm:text-inherit">{{ tab.label }}</span>
					</span>
				</UButton>
			</div>
		</div>
		<!-- Active Filters Display -->
		<div v-if="hasActiveFilters" class="flex flex-wrap gap-2 items-center">
			<span class="text-xs text-gray-600 dark:text-gray-400">{{ t('components.filter.activeFilters') }}</span>

			<UBadge
				v-if="filters.date_range && (filters.date_range.start || filters.date_range.end)"
				color="primary"
				variant="subtle"
				size="sm"
				@click="clearFilter('date')"
			>
				{{ t('components.filter.date') }}: {{ formatDateRange(filters.date_range) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.query" color="info" variant="subtle" size="sm" @click="appointmentStore.setSearch('')">
				{{ t('components.filter.search') }}: {{ filters.query }} <UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.status && filters.status !== 'All'" color="success" variant="subtle" size="sm" @click="appointmentStore.setStatus('All')">
				{{ t('components.filter.status') }}: {{ filters.status }} <UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { AppointmentView } from '~/stores/Appointment/Appointment';
import type { Range } from '~/utils/interface';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const viewTabs = computed(() => [
	{ label: t('components.filter.listing'), value: 'listing' as const, icon: 'i-heroicons-list-bullet' },
	{ label: t('components.filter.daily'), value: 'daily' as const, icon: 'i-heroicons-calendar-days' },
	{ label: t('components.filter.weekly'), value: 'weekly' as const, icon: 'i-heroicons-calendar' },
	{ label: t('components.filter.monthly'), value: 'monthly' as const, icon: 'i-heroicons-square-3-stack-3d' },
]);

const appointmentStore = useAppointmentStore();
const { filter, filters } = storeToRefs(appointmentStore);

const hasActiveFilters = computed(() => {
	const hasDateFilter = filters.value.date_range && (filters.value.date_range.start || filters.value.date_range.end);
	return filters.value.query || (filters.value.status && filters.value.status !== 'All') || hasDateFilter;
});

const formatDateRange = (range: Range) => {
	if (!range) return '';
	const startDate = range.start ? format(new Date(range.start), 'dd/MM/yyyy') : '';
	const endDate = range.end ? format(new Date(range.end), 'dd/MM/yyyy') : '';
	if (startDate && endDate) {
		return `${startDate} - ${endDate}`;
	}
	return startDate || endDate;
};

const clearFilters = async () => {
	await appointmentStore.clearFilters();
};

const clearFilter = async (filterKey: string) => {
	if (filterKey === 'date') {
		const now = new Date();
		await appointmentStore.setDateRange({
			start: startOfMonth(now),
			end: endOfMonth(addMonths(now, 2)),
		});
	}
};

const selectView = (view: AppointmentView) => {
	filter.value.view = view;
};

defineExpose({
	clearFilters,
	filter,
});
</script>

<style scoped></style>
