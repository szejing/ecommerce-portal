<template>
	<div class="w-full">
		<!-- Compact Filter Grid -->
		<div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
			<!-- Date Range Filter -->
			<div class="flex flex-col col-span-full gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.dateRange') }}</label>
				<ZDateRange :model-value="filters.dateRange" @update:model-value="orderStore.setDateRange" />
			</div>

			<!-- Order Number Search -->
			<div class="flex flex-col col-span-2 gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.orderNo') }}</label>
				<UInput
					:model-value="filters.search"
					:placeholder="t('components.filter.searchOrderNo')"
					:icon="ICONS.SEARCH_ROUNDED"
					@update:model-value="orderStore.setSearch"
				/>
			</div>

			<!-- Actions -->
			<div class="flex flex-col gap-1.5 col-span-full">
				<div class="flex gap-2">
					<UButton variant="outline" color="neutral" :disabled="is_loading" @click="orderStore.clearFilters">
						<UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
						{{ t('components.filter.clear') }}
					</UButton>
					<UButton color="primary" :disabled="is_loading" :loading="is_loading" @click="orderStore.refreshListing">
						<UIcon :name="ICONS.SEARCH_ROUNDED" class="w-4 h-4" />
						{{ t('components.filter.search') }}
					</UButton>
				</div>
			</div>
		</div>

		<!-- Active Filters Display -->
		<div v-if="hasActiveFilters" class="flex flex-wrap gap-2 items-center">
			<span class="text-xs text-gray-600 dark:text-gray-400">{{ t('components.filter.activeFilters') }}</span>
			<UBadge
				v-if="filters.dateRange && (filters.dateRange.start || filters.dateRange.end)"
				color="primary"
				variant="subtle"
				size="sm"
				@click="clearFilter('date')"
			>
				{{ t('components.filter.date') }}: {{ formatDateRange(filters.dateRange) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.search" color="info" variant="subtle" size="sm" @click="clearFilter('query')">
				{{ t('components.filter.order') }}: {{ filters.search }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="hasPartialStatusFilter" color="success" variant="subtle" size="sm" @click="clearFilter('status')">
				{{ t('components.filter.status') }}: {{ statusBadgeLabel }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.currencyCode && filters.currencyCode !== 'MYR'" color="warning" variant="subtle" size="sm">
				{{ t('components.filter.currency') }}: {{ filters.currencyCode }}
			</UBadge>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { Range } from '~/utils/interface';
import { sub, format } from 'date-fns';
import { getDefaultOrderStatuses, getOrderStatusOptions, isAllOrderStatusesSelected } from '~/utils/options';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const orderStore = useOrderStore();
const { filters, loading } = storeToRefs(orderStore);

const is_loading = computed(() => loading.value);

const statusLabelMap = computed(() => {
	const map = new Map<string, string>();
	for (const option of getOrderStatusOptions(t)) {
		map.set(option.value, option.label);
	}
	return map;
});

const hasPartialStatusFilter = computed(() => filters.value.statuses.length > 0 && !isAllOrderStatusesSelected(filters.value.statuses));

const statusBadgeLabel = computed(() => filters.value.statuses.map((status) => statusLabelMap.value.get(status) ?? capitalizeFirstLetter(status)).join(', '));

const hasActiveFilters = computed(() => {
	const hasDateFilter = filters.value.dateRange && (filters.value.dateRange.start || filters.value.dateRange.end);
	return filters.value.search || hasPartialStatusFilter.value || (filters.value.currencyCode && filters.value.currencyCode !== 'MYR') || hasDateFilter;
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

const clearFilter = async (filterKey: string) => {
	if (filterKey === 'query') {
		orderStore.setSearch('');
	} else if (filterKey === 'status') {
		orderStore.setStatuses(getDefaultOrderStatuses());
	} else if (filterKey === 'date') {
		orderStore.setDateRange({
			start: sub(new Date(), { days: 14 }),
			end: new Date(),
		});
	}
};
</script>

<style scoped></style>
