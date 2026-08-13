<template>
	<div class="w-full">
		<div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
			<div class="flex flex-col col-span-full gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.dateRange') }}</label>
				<ZDateRange :model-value="filters.date_range" @update:model-value="activityLogStore.setDateRange" />
			</div>

			<div class="flex flex-col col-span-2 gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.search') }}</label>
				<UInput
					:model-value="filters.query"
					:placeholder="t('components.filter.searchActivityLogs')"
					:icon="ICONS.SEARCH_ROUNDED"
					@update:model-value="activityLogStore.setSearch"
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('table.action') }}</label>
				<USelect
					:model-value="actionSelectValue"
					:items="actionItems"
					value-attribute="value"
					color="neutral"
					variant="outline"
					class="w-full"
					:ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform' }"
					@update:model-value="onActionChange"
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('table.actor') }}</label>
				<USelect
					:model-value="actorTypeSelectValue"
					:items="actorTypeItems"
					value-attribute="value"
					color="neutral"
					variant="outline"
					class="w-full"
					:ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform' }"
					@update:model-value="onActorTypeChange"
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('table.source') }}</label>
				<USelect
					:model-value="sourceSelectValue"
					:items="sourceItems"
					value-attribute="value"
					color="neutral"
					variant="outline"
					class="w-full"
					:ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform' }"
					@update:model-value="onSourceChange"
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('table.visibility') }}</label>
				<USelect
					:model-value="visibilitySelectValue"
					:items="visibilityItems"
					value-attribute="value"
					color="neutral"
					variant="outline"
					class="w-full"
					:ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform' }"
					@update:model-value="onVisibilityChange"
				/>
			</div>

			<div class="flex flex-col gap-1.5 justify-end">
				<div class="flex gap-2">
					<UButton variant="outline" color="neutral" :disabled="is_loading" @click="activityLogStore.clearFilters">
						<UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
						{{ t('components.filter.clear') }}
					</UButton>
					<UButton color="primary" :disabled="is_loading" :loading="is_loading" @click="activityLogStore.refreshListing">
						<UIcon :name="ICONS.SEARCH_ROUNDED" class="w-4 h-4" />
						{{ t('components.filter.search') }}
					</UButton>
				</div>
			</div>
		</div>

		<div v-if="hasActiveFilters" class="flex flex-wrap gap-2 items-center">
			<span class="text-xs text-gray-600 dark:text-gray-400">{{ t('components.filter.activeFilters') }}</span>
			<UBadge v-if="hasDateFilter" color="primary" variant="subtle" size="sm" @click="clearFilter('date')">
				{{ t('components.filter.date') }}: {{ formatDateRange(filters.date_range) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.query" color="info" variant="subtle" size="sm" @click="activityLogStore.setSearch('')">
				{{ t('components.filter.search') }}: {{ filters.query }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.action" color="warning" variant="subtle" size="sm" @click="activityLogStore.setAction(undefined)">
				{{ t('table.action') }}: {{ getActivityLogActionLabel(t, filters.action) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.actor_type" color="neutral" variant="subtle" size="sm" @click="activityLogStore.setActorType(undefined)">
				{{ t('table.actor') }}: {{ getActivityLogActorTypeLabel(t, filters.actor_type) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.source" color="neutral" variant="subtle" size="sm" @click="activityLogStore.setSource(undefined)">
				{{ t('table.source') }}: {{ getActivityLogSourceLabel(t, filters.source) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.visibility" color="neutral" variant="subtle" size="sm" @click="activityLogStore.setVisibility(undefined)">
				{{ t('table.visibility') }}: {{ getActivityLogVisibilityLabel(t, filters.visibility) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { format } from 'date-fns';
import { ICONS } from '~/utils/icons';
import {
	ACTIVITY_LOG_FILTER_ALL,
	getActivityLogActionLabel,
	getActivityLogActionOptions,
	getActivityLogActorTypeLabel,
	getActivityLogActorTypeOptions,
	getActivityLogSourceLabel,
	getActivityLogSourceOptions,
	getActivityLogVisibilityLabel,
	getActivityLogVisibilityOptions,
} from '~/utils/options';
import type { ActivityLogAction, ActivityLogActorType, ActivityLogSource, ActivityLogVisibility } from '~/utils/types/activity-log';
import type { Range } from '~/utils/interface';

const { t } = useI18n();
const activityLogStore = useActivityLogStore();
const { filters, loading } = storeToRefs(activityLogStore);

const is_loading = computed(() => loading.value);

const actionItems = computed(() => getActivityLogActionOptions(t));
const actorTypeItems = computed(() => getActivityLogActorTypeOptions(t));
const sourceItems = computed(() => getActivityLogSourceOptions(t));
const visibilityItems = computed(() => getActivityLogVisibilityOptions(t));

const actionSelectValue = computed(() => filters.value.action ?? ACTIVITY_LOG_FILTER_ALL);
const actorTypeSelectValue = computed(() => filters.value.actor_type ?? ACTIVITY_LOG_FILTER_ALL);
const sourceSelectValue = computed(() => filters.value.source ?? ACTIVITY_LOG_FILTER_ALL);
const visibilitySelectValue = computed(() => filters.value.visibility ?? ACTIVITY_LOG_FILTER_ALL);

const hasDateFilter = computed(() => filters.value.date_range && (filters.value.date_range.start || filters.value.date_range.end));
const hasActiveFilters = computed(
	() => filters.value.query || filters.value.action || filters.value.actor_type || filters.value.source || filters.value.visibility || hasDateFilter.value,
);

const formatDateRange = (range: Range) => {
	if (!range) return '';
	const startDate = range.start ? format(new Date(range.start), 'dd/MM/yyyy') : '';
	const endDate = range.end ? format(new Date(range.end), 'dd/MM/yyyy') : '';
	if (startDate && endDate) {
		return `${startDate} - ${endDate}`;
	}
	return startDate || endDate;
};

const onActionChange = (value: string) => {
	void activityLogStore.setAction(value === ACTIVITY_LOG_FILTER_ALL ? undefined : (value as ActivityLogAction));
};

const onActorTypeChange = (value: string) => {
	void activityLogStore.setActorType(value === ACTIVITY_LOG_FILTER_ALL ? undefined : (value as ActivityLogActorType));
};

const onSourceChange = (value: string) => {
	void activityLogStore.setSource(value === ACTIVITY_LOG_FILTER_ALL ? undefined : (value as ActivityLogSource));
};

const onVisibilityChange = (value: string) => {
	void activityLogStore.setVisibility(value === ACTIVITY_LOG_FILTER_ALL ? undefined : (value as ActivityLogVisibility));
};

const clearFilter = (filterKey: string) => {
	if (filterKey === 'date') void activityLogStore.setDateRange({});
};
</script>
