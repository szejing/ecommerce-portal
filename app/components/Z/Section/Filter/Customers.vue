<template>
	<div class="flex w-full min-w-0 flex-col gap-2">
		<div class="flex w-full min-w-0 flex-wrap items-end gap-2">
			<!-- Customer Search -->
			<div class="flex min-w-0 flex-1 flex-col gap-1.5 lg:min-w-48 lg:basis-64">
				<label for="customers-list-search" class="text-xs font-medium text-gray-700 max-lg:sr-only dark:text-gray-300">{{ t('components.filter.searchLabel') }}</label>
				<UInput
					id="customers-list-search"
					v-model="filter.query"
					type="search"
					:placeholder="t('components.filter.searchByNamePhoneEmail')"
					:icon="ICONS.SEARCH_ROUNDED"
					class="w-full"
					@update:model-value="debouncedSearch"
					@keyup.enter="search"
				/>
			</div>

			<!-- Actions -->
			<div class="hidden gap-2 lg:flex">
				<UButton variant="outline" color="neutral" :disabled="loading" @click="clearFilters">
					<UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
					{{ t('components.filter.clear') }}
				</UButton>
				<UButton color="primary" :disabled="loading" :loading="loading" @click="search">
					<UIcon :name="ICONS.SEARCH_ROUNDED" class="w-4 h-4" />
					{{ t('components.filter.search') }}
				</UButton>
			</div>
		</div>

		<!-- Active Filters Display -->
		<div v-if="hasActiveFilters" class="hidden flex-wrap items-center gap-2 lg:flex">
			<span class="text-xs text-gray-600 dark:text-gray-400">{{ t('components.filter.activeFilters') }}</span>
			<UBadge v-if="filter.query" color="info" variant="subtle" size="sm" @click="clearFilter('query')">
				{{ t('components.filter.search') }}: {{ filter.query }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const customerStore = useCustomerStore();
const { filter, loading } = storeToRefs(customerStore);

const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

const hasActiveFilters = computed(() => {
	return !!filter.value.query;
});

const search = async () => {
	if (searchTimeout.value) clearTimeout(searchTimeout.value);
	searchTimeout.value = null;
	filter.value.current_page = 1;
	await customerStore.getCustomers();
};

const debouncedSearch = () => {
	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value);
	}
	searchTimeout.value = setTimeout(async () => {
		await search();
	}, 500);
};

const clearFilters = async () => {
	filter.value.query = '';
	await search();
};

const clearFilter = async (filterKey: string) => {
	if (filterKey === 'query') {
		filter.value.query = '';
	}
	await search();
};

onUnmounted(() => {
	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value);
	}
});
</script>

<style scoped></style>
