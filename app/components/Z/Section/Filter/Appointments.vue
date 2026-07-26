<template>
	<div class="w-full space-y-4">
		<!-- Date Range Filter (presets + custom range in popover, same as ZDateRange desktop/mobile) -->
		<div class="flex flex-col gap-1.5">
			<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.dateRange') }}</label>
			<ZDateRange v-model="filter.date_range" hide-presets @update:model-value="handleDateRangeChange" />
		</div>

		<!-- Search + View Tabs: stacked on mobile, side-by-side on desktop -->
		<div class="flex flex-col gap-4">
			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.searchLabel') }}</label>
				<UInput v-model="filter.query" :placeholder="t('components.filter.searchByNamePhone')" :icon="ICONS.SEARCH_ROUNDED" @input="debouncedSearch" />
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
				v-if="filter.date_range && (filter.date_range.start || filter.date_range.end)"
				color="primary"
				variant="subtle"
				size="sm"
				@click="clearFilter('date')"
			>
				{{ t('components.filter.date') }}: {{ formatDateRange(filter.date_range) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filter.query" color="info" variant="subtle" size="sm">
				{{ t('components.filter.search') }}: {{ filter.query }} <UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filter.status && filter.status !== 'All'" color="success" variant="subtle" size="sm" @click="clearFilter('status')">
				{{ t('components.filter.status') }}: {{ filter.status }} <UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { AppointmentView } from '~/stores/Appointment/Appointment';
import type { Range } from '~/utils/interface';
import { add, addMonths, endOfMonth, format, startOfMonth, sub } from 'date-fns';
import type { now } from '@vueuse/core';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const viewTabs = computed(() => [
	{ label: t('components.filter.listing'), value: 'listing' as const, icon: 'i-heroicons-list-bullet' },
	{ label: t('components.filter.daily'), value: 'daily' as const, icon: 'i-heroicons-calendar-days' },
	{ label: t('components.filter.weekly'), value: 'weekly' as const, icon: 'i-heroicons-calendar' },
	{ label: t('components.filter.monthly'), value: 'monthly' as const, icon: 'i-heroicons-square-3-stack-3d' },
]);

const appointmentStore = useAppointmentStore();
const { filter } = storeToRefs(appointmentStore);

const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);
const selectedDateRangeTab = ref<number | null>(null);

// Check if any filters are active
const hasActiveFilters = computed(() => {
	const hasDateFilter = filter.value.date_range && (filter.value.date_range.start || filter.value.date_range.end);
	return filter.value.query || (filter.value.status && filter.value.status !== 'All') || hasDateFilter;
});

// Emit events to parent
const search = async () => {
	await appointmentStore.getAppointments();
};

const debouncedSearch = () => {
	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value);
	}
	searchTimeout.value = setTimeout(async () => {
		await search();
	}, 500);
};

const formatDateRange = (range: Range) => {
	if (!range) return '';
	const startDate = range.start ? format(new Date(range.start), 'dd/MM/yyyy') : '';
	const endDate = range.end ? format(new Date(range.end), 'dd/MM/yyyy') : '';
	if (startDate && endDate) {
		return `${startDate} - ${endDate}`;
	}
	return startDate || endDate;
};

const handleDateRangeChange = async (newValue: Range) => {
	filter.value.date_range = newValue;
	await search();
};

const clearFilters = async () => {
	selectedDateRangeTab.value = null;
	filter.value.date_range = {
		start: sub(new Date(), { days: 14 }),
		end: add(new Date(), { days: 14 }),
	};
	filter.value.query = '';
	filter.value.status = 'All';
	await search();
};

const clearFilter = async (filterKey: string) => {
	if (filterKey === 'query') {
		filter.value.query = '';
		await search();
	} else if (filterKey === 'status') {
		filter.value.status = 'All';
		await search();
	} else if (filterKey === 'date') {
		const now = new Date();
		filter.value.date_range = {
			start: startOfMonth(now),
			end: endOfMonth(addMonths(now, 2)),
		};
		await search();
	}
};

const selectView = (view: AppointmentView) => {
	filter.value.view = view;
};

onUnmounted(() => {
	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value);
	}
});

// Expose methods for parent to call
defineExpose({
	clearFilters,
	filter,
});
</script>

<style scoped></style>
