<template>
	<div class="w-full">
		<div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
			<div class="flex flex-col gap-1.5 col-span-2">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.searchLabel') }}</label>
				<UInput v-model="filter.query" :placeholder="t('components.filter.searchShippingMethods')" :icon="ICONS.SEARCH_ROUNDED" @input="debouncedSearch" />
			</div>

			<div class="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.status') }}</label>
				<USelect
					:model-value="statusSelectValue"
					:items="statusItems"
					value-attribute="value"
					color="neutral"
					variant="outline"
					class="w-full"
					:ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform' }"
					@update:model-value="onStatusChange"
				/>
			</div>

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
import { ICONS } from '~/utils/icons';
const { t } = useI18n();
const shippingStore = useShippingMethodStore();
const { filter } = storeToRefs(shippingStore);

const is_loading = computed(() => shippingStore.loading);
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null);

const STATUS_FILTER_ALL = 'all' as const;

const statusItems = computed(() => [
	{ label: t('options.all'), value: STATUS_FILTER_ALL },
	{ label: t('common.active'), value: 'active' },
	{ label: t('common.inactive'), value: 'inactive' },
]);

/** Maps store filter to USelect (never use '' — reserved for clearing the select). */
const statusSelectValue = computed(() => filter.value.status ?? STATUS_FILTER_ALL);

const hasActiveFilters = computed(() => filter.value.query || filter.value.status);

const search = async () => {
	filter.value.current_page = 1;
	await shippingStore.getShippingMethods();
};

const debouncedSearch = () => {
	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value);
	}
	searchTimeout.value = setTimeout(() => {
		void search();
	}, 500);
};

const onStatusChange = async (value: string | undefined) => {
	if (!value || value === STATUS_FILTER_ALL) {
		filter.value.status = undefined;
	} else {
		filter.value.status = value as 'active' | 'inactive';
	}
	filter.value.current_page = 1;
	await shippingStore.getShippingMethods();
};

const clearFilters = async () => {
	filter.value.query = '';
	filter.value.status = undefined;
	filter.value.current_page = 1;
	await shippingStore.getShippingMethods();
};

const clearFilter = async (filterKey: string) => {
	if (filterKey === 'query') {
		filter.value.query = '';
	} else if (filterKey === 'status') {
		filter.value.status = undefined;
	}
	filter.value.current_page = 1;
	await shippingStore.getShippingMethods();
};

onUnmounted(() => {
	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value);
	}
});
</script>

<style scoped></style>
