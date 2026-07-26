<template>
	<div class="w-full">
		<div class="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
			<!-- Search -->
			<div class="flex flex-col col-span-3 sm:col-span-2 gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300"> {{ t('components.filter.search') }}</label>
				<UInput v-model="filter.query" placeholder="Search by name or email..." :icon="ICONS.SEARCH_ROUNDED" @input="debouncedSearch" />
			</div>

			<!-- Actions -->
			<div class="flex flex-col gap-1.5 justify-end">
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
		<div v-if="filter.query" class="flex flex-wrap gap-2 items-center">
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
