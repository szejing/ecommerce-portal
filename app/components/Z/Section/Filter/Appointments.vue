<template>
	<div class="flex w-full min-w-0 flex-col gap-2">
		<div class="flex w-full min-w-0 flex-wrap items-center gap-2">
			<div class="flex flex-wrap gap-1.5" role="group" :aria-label="t('components.filter.view')">
				<UButton
					v-for="tab in viewTabs"
					:key="tab.value"
					size="sm"
					:variant="filter.view === tab.value ? 'solid' : 'ghost'"
					:color="filter.view === tab.value ? 'primary' : 'neutral'"
					:icon="tab.icon"
					:label="tab.label"
					:aria-pressed="filter.view === tab.value"
					class="min-h-9"
					@click="selectView(tab.value)"
				/>
			</div>

			<ZDateRange class="shrink-0" :model-value="filters.date_range" hide-presets @update:model-value="appointmentStore.setDateRange" />

			<UInput
				:model-value="filters.query"
				:placeholder="t('components.filter.searchByNamePhone')"
				:aria-label="t('components.filter.searchLabel')"
				:icon="ICONS.SEARCH_ROUNDED"
				class="min-w-48 flex-1 basis-56"
				@update:model-value="appointmentStore.setSearch"
			/>
		</div>

		<div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2">
			<span class="text-xs text-gray-600 dark:text-gray-400">{{ t('components.filter.activeFilters') }}</span>
			<UBadge v-if="filters.query" color="info" variant="subtle" size="sm" @click="appointmentStore.setSearch('')">
				{{ t('components.filter.search') }}: {{ filters.query }}
				<UIcon name="i-heroicons-x-mark" class="ml-1 size-3 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.status && filters.status !== 'All'" color="success" variant="subtle" size="sm" @click="appointmentStore.setStatus('All')">
				{{ t('components.filter.status') }}: {{ filters.status }}
				<UIcon name="i-heroicons-x-mark" class="ml-1 size-3 cursor-pointer" />
			</UBadge>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { AppointmentView } from '~/stores/Appointment/Appointment';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const viewTabs = computed(() => [
	{ label: t('components.filter.daily'), value: 'daily' as const, icon: 'i-heroicons-calendar-days' },
	{ label: t('components.filter.weekly'), value: 'weekly' as const, icon: 'i-heroicons-calendar' },
	{ label: t('components.filter.monthly'), value: 'monthly' as const, icon: 'i-heroicons-square-3-stack-3d' },
	{ label: t('components.filter.listing'), value: 'listing' as const, icon: 'i-heroicons-list-bullet' },
]);

const appointmentStore = useAppointmentStore();
const { filter, filters } = storeToRefs(appointmentStore);

const hasActiveFilters = computed(() => Boolean(filters.value.query) || (filters.value.status && filters.value.status !== 'All'));

const clearFilters = async () => {
	await appointmentStore.clearFilters();
};

const selectView = (view: AppointmentView) => {
	filter.value.view = view;
};

defineExpose({
	clearFilters,
	filter,
});
</script>
