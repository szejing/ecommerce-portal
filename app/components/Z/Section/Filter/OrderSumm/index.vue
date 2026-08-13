<template>
	<div class="w-full">
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3 items-center">
			<div class="flex flex-col col-span-full gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.dateRange') }}</label>
				<ZDateRange :model-value="filters.dateRange" @update:model-value="orderSummStore.setDateRange" />
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.orderStatus') }}</label>
				<ZSelectMenuOrderStatus :status="filters.status" @update:status="orderSummStore.setStatus" />
			</div>

			<div class="flex flex-col gap-1.5 col-span-full">
				<div class="flex gap-2">
					<UButton variant="outline" color="neutral" :disabled="is_loading" @click="orderSummStore.clearFilters">
						<UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
						{{ t('components.filter.clear') }}
					</UButton>
					<UButton color="primary" :disabled="is_loading" :loading="is_loading" @click="orderSummStore.refreshListing">
						<UIcon :name="ICONS.SEARCH_ROUNDED" class="w-4 h-4" />
						{{ t('components.filter.search') }}
					</UButton>
				</div>
			</div>
		</div>

		<div v-if="hasActiveFilters" class="flex flex-wrap gap-2 items-center">
			<span class="text-xs text-gray-600 dark:text-gray-400">{{ t('components.filter.activeFilters') }}</span>
			<UBadge v-if="filters.dateRange.start || filters.dateRange.end" color="primary" variant="subtle" size="sm" @click="clearFilter('date')">
				{{ t('components.filter.date') }}: {{ formatDateRange(filters.dateRange) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.status" color="success" variant="subtle" size="sm" @click="orderSummStore.setStatus(undefined)">
				{{ t('components.filter.status') }}: {{ capitalizeFirstLetter(filters.status) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.currencyCode && filters.currencyCode !== 'MYR'" color="warning" variant="subtle" size="sm">
				{{ t('components.filter.currency') }}: {{ filters.currencyCode }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { Range } from '~/utils/interface';
import { format, sub } from 'date-fns';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const orderSummStore = useSummOrderStore();
const { filters, order_summ } = storeToRefs(orderSummStore);

const is_loading = computed(() => order_summ.value.loading);

const hasActiveFilters = computed(() => {
	return filters.value.dateRange.start || filters.value.dateRange.end || filters.value.status || (filters.value.currencyCode && filters.value.currencyCode !== 'MYR');
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

const clearFilter = (filterKey: string) => {
	if (filterKey === 'date') {
		void orderSummStore.setDateRange({ start: sub(new Date(), { days: 14 }), end: new Date() });
	}
};
</script>

<style scoped></style>
