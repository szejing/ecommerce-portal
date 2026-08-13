<template>
	<div class="w-full">
		<!-- Compact Filter Grid -->
		<div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
			<!-- Product Search -->
			<div class="flex flex-col gap-1.5 col-span-2">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.searchLabel') }}</label>
				<UInput
					:model-value="filters.query"
					:placeholder="t('components.filter.searchProduct')"
					:icon="ICONS.SEARCH_ROUNDED"
					@update:model-value="productStore.setSearch"
				/>
			</div>

			<!-- Status Filter -->
			<div class="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.status') }}</label>
				<ZSelectMenuProductStatus :status="filters.status" @update:status="productStore.setStatus" />
			</div>

			<!-- Actions -->
			<div class="flex flex-col gap-1.5 justify-end">
				<div class="flex gap-2">
					<UButton variant="outline" color="neutral" :disabled="is_loading" @click="productStore.clearFilters">
						<UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
						{{ t('components.filter.clear') }}
					</UButton>
					<UButton color="primary" :disabled="is_loading" :loading="is_loading" @click="productStore.refreshListing">
						<UIcon :name="ICONS.SEARCH_ROUNDED" class="w-4 h-4" />
						{{ t('components.filter.search') }}
					</UButton>
				</div>
			</div>
		</div>

		<!-- Active Filters Display -->
		<div v-if="hasActiveFilters" class="flex flex-wrap gap-2 items-center">
			<span class="text-xs text-gray-600 dark:text-gray-400">{{ t('components.filter.activeFilters') }}</span>
			<UBadge v-if="filters.query" color="info" variant="subtle" size="sm" @click="productStore.setSearch('')">
				{{ t('components.filter.search') }}: {{ filters.query }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="filters.status" color="success" variant="subtle" size="sm" @click="productStore.setStatus(undefined)">
				{{ t('components.filter.status') }}: {{ capitalizeFirstLetter(filters.status) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const productStore = useProductStore();
const { filters, loading } = storeToRefs(productStore);

const is_loading = computed(() => loading.value);

const hasActiveFilters = computed(() => {
	return filters.value.query || filters.value.status;
});
</script>

<style scoped></style>
