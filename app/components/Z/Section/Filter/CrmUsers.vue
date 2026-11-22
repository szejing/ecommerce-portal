<template>
	<div class="flex w-full min-w-0 flex-col gap-2">
		<div class="flex w-full min-w-0 flex-wrap items-end gap-2">
			<!-- Search -->
			<div class="flex min-w-0 flex-1 lg:min-w-48 lg:basis-64 flex-col gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300 max-lg:sr-only"> {{ t('components.filter.search') }}</label>
				<ZFilterSearchInput v-model="filter.query" :placeholder="t('components.filter.search')" @input="debouncedSearch" @search="search" @clear="clearFilterQuery" />
			</div>

			<!-- Actions -->
			<div class="hidden shrink-0 items-end gap-2 lg:flex">
				<div class="flex gap-2">
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
		</div>

		<!-- Active filters -->
		<div v-if="filter.query" class="hidden flex-wrap items-center gap-2 lg:flex">
			<span class="text-xs text-gray-600 dark:text-gray-400">{{ t('components.filter.activeFilters') }}</span>
			<UBadge color="info" variant="subtle" size="sm" @click="clearFilterQuery">
				{{ t('components.filter.search') }}: {{ filter.query }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { useCRMUserStore } from '~/stores/CRMUser/CRMUser';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const crmUserStore = useCRMUserStore();
const { filter, loading } = storeToRefs(crmUserStore);

const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

const search = async () => {
	if (searchTimeout.value) clearTimeout(searchTimeout.value);
	searchTimeout.value = null;
	filter.value.current_page = 1;
	await crmUserStore.getCrmUsers();
};

const debouncedSearch = () => {
	if (searchTimeout.value) clearTimeout(searchTimeout.value);
	searchTimeout.value = setTimeout(() => search(), 500);
};

const clearFilters = async () => {
	filter.value.query = '';
	filter.value.current_page = 1;
	await search();
};

const clearFilterQuery = async () => {
	filter.value.query = '';
	await search();
};

onUnmounted(() => {
	if (searchTimeout.value) clearTimeout(searchTimeout.value);
});
</script>
