<template>
	<div class="w-full">
		<!-- Compact Filter Grid -->
		<div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
			<!-- Product Search -->
			<div class="flex flex-col gap-1.5 col-span-2">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.searchLabel') }}</label>
				<UInput v-model="filter.query" :placeholder="t('components.filter.searchProduct')" :icon="ICONS.SEARCH_ROUNDED" @input="debouncedSearch" />
			</div>

			<!-- Status Filter -->
			<div class="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.status') }}</label>
				<ZSelectMenuProductStatus v-model:status="filter.status" @update:model-value="handleStatusChange" />
			</div>

			<!-- Actions -->
			<div class="flex flex-col gap-1.5 justify-end">
				<div class="flex gap-2">
					<UButton variant="outline" color="neutral" :disabled="is_loading" @click="clearFilters">
						<UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
						{{ t('components.filter.clear') }}
					</UButton>
					<UButton color="primary" :disabled="is_loading" :loading="is_loading" @click="search">
						<UIcon :name="ICONS.SEARCH_ROUNDED" class="w-4 h-4" />
						{{ t('components.filter.search') }}
					</UButton>
				</div>
			</div>
		</div>

		<!-- Active Filters Display -->
		<div v-if="hasActiveFilters" class="flex flex-wrap gap-2 items-center">
			<span class="text-xs text-gray-600 dark:text-gray-400">{{ t('components.filter.activeFilters') }}</span>
			<UBadge v-if="filter.query" color="info" variant="subtle" size="sm" @click="clearFilter('query')">
				{{ t('components.filter.search') }}: {{ filter.query }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filter.status" color="success" variant="subtle" size="sm" @click="clearFilter('status')">
				{{ t('components.filter.status') }}: {{ capitalizeFirstLetter(filter.status) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { ProductStatus } from 'yeppi-common';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const productStore = useProductStore();
const { filter } = storeToRefs(productStore);

const is_loading = computed(() => productStore.loading);
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

const hasActiveFilters = computed(() => {
	return filter.value.query || filter.value.status;
});

const search = async () => {
	await productStore.getProducts();
};

const debouncedSearch = () => {
	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value);
	}
	searchTimeout.value = setTimeout(async () => {
		await search();
	}, 500);
};

const handleStatusChange = async () => {
	await search();
};

const clearFilters = async () => {
	filter.value.query = '';
	filter.value.status = undefined;
	filter.value.current_page = 1;
	await search();
};

const clearFilter = async (filterKey: string) => {
	if (filterKey === 'query') {
		filter.value.query = '';
	} else if (filterKey === 'status') {
		filter.value.status = undefined;
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
