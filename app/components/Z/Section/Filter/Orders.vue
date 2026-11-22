<template>
	<div class="flex w-full min-w-0 flex-col gap-2">
		<!-- Compact Filter Grid -->
		<div class="flex w-full min-w-0 flex-wrap items-end gap-2">
			<!-- Date Range Filter -->
			<div class="hidden shrink-0 flex-col gap-1.5 lg:flex">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.dateRange') }}</label>
				<ZDateRange :model-value="filters.dateRange" @update:model-value="orderStore.setDateRange" />
			</div>

			<ZSectionFilterStatuses
				class="hidden w-56 shrink-0 lg:flex"
				show-label
				:label="t('components.filter.status')"
				:model-value="filters.statuses"
				:items="statusItems"
				:get-color="getOrderStatusColor"
				:placeholder="t('components.selectMenu.selectOrderStatus')"
				@update:model-value="onStatuses"
			/>

			<!-- Order Number Search -->
			<div class="flex min-w-0 flex-1 flex-col gap-1.5 lg:min-w-48 lg:basis-64">
				<label class="text-xs font-medium text-gray-700 max-lg:sr-only dark:text-gray-300" for="order-list-search">{{ t('components.filter.orderNo') }}</label>
				<UInput
					id="order-list-search"
					type="search"
					:model-value="filters.search"
					:placeholder="t('components.filter.searchOrderNo')"
					:icon="ICONS.SEARCH_ROUNDED"
					@update:model-value="orderStore.setSearch"
					@keyup.enter="orderStore.refreshListing"
				/>
			</div>

			<UDrawer :title="t('portalMobile.filters')" :close="{ class: 'min-h-11 min-w-11 justify-center' }">
				<UButton color="neutral" variant="outline" :icon="ICONS.FILTER" :label="t('portalMobile.filters')" class="min-h-11 lg:hidden" />
				<template #body>
					<div class="space-y-4 pb-[env(safe-area-inset-bottom)]">
						<div class="space-y-1.5">
							<p class="text-sm font-medium">{{ t('components.filter.dateRange') }}</p>
							<ZDateRange :model-value="filters.dateRange" @update:model-value="orderStore.setDateRange" />
						</div>
						<ZSectionFilterStatuses
							show-label
							:label="t('components.filter.status')"
							:model-value="filters.statuses"
							:items="statusItems"
							:get-color="getOrderStatusColor"
							:placeholder="t('components.selectMenu.selectOrderStatus')"
							@update:model-value="onStatuses"
						/>
						<UButton
							variant="outline"
							color="neutral"
							:disabled="is_loading"
							:label="t('components.filter.clear')"
							class="min-h-11"
							@click="orderStore.clearFilters"
						/>
					</div>
				</template>
			</UDrawer>

			<!-- Actions -->
			<div class="hidden shrink-0 items-end gap-2 lg:flex">
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
		<div v-if="hasActiveFilters" class="hidden flex-wrap items-center gap-2 lg:flex">
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
import type { OrderStatus } from 'yeppi-common';
import type { Range } from '~/utils/interface';
import { sub, format } from 'date-fns';
import { getDefaultOrderStatuses, getOrderStatusColor, getOrderStatusOptions, isAllOrderStatusesSelected } from '~/utils/options';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const orderStore = useOrderStore();
const { filters, loading } = storeToRefs(orderStore);

const is_loading = computed(() => loading.value);
const statusItems = computed(() => getOrderStatusOptions(t).filter((option) => option.value !== 'All'));

const onStatuses = (value: string[]) => {
	orderStore.setStatuses(value as OrderStatus[]);
};

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
