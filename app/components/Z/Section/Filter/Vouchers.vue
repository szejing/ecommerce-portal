<template>
	<div class="flex w-full min-w-0 flex-col gap-2">
		<div class="flex w-full min-w-0 items-end gap-2 lg:flex-wrap">
			<div class="flex min-w-0 flex-1 lg:min-w-48 lg:basis-64 flex-col gap-1.5">
				<label class="text-xs font-medium text-gray-700 max-lg:sr-only dark:text-gray-300">{{ t('components.filter.searchLabel') }}</label>
				<UInput
					v-model="filter.query"
					inputmode="search"
					:ui="{ trailing: 'max-lg:pe-0', base: filter.query ? 'max-lg:pe-11' : '' }"
					:aria-label="t('components.filter.searchVouchers')"
					:placeholder="t('components.filter.searchVouchers')"
					:icon="ICONS.SEARCH_ROUNDED"
					@keydown.enter="search"
					@update:model-value="debouncedSearch"
				>
					<template v-if="filter.query" #trailing>
						<UButton
							color="neutral"
							variant="ghost"
							icon="i-lucide-x"
							:aria-label="t('components.filter.clear')"
							class="min-h-11 min-w-11 justify-center lg:hidden"
							@click="clearFilter('query')"
						/>
					</template>
				</UInput>
			</div>

			<div class="flex w-24 shrink-0 sm:w-36 lg:w-44 flex-col gap-1.5">
				<label class="text-xs font-medium text-gray-700 max-lg:sr-only dark:text-gray-300">{{ t('components.filter.status') }}</label>
				<USelect
					:model-value="statusSelectValue"
					:items="statusItems"
					:aria-label="t('components.filter.status')"
					value-attribute="value"
					color="neutral"
					variant="outline"
					class="min-h-11 w-full lg:min-h-0"
					:ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform' }"
					@update:model-value="onStatusChange"
				/>
			</div>

			<div class="hidden shrink-0 items-end gap-2 lg:flex">
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

		<div v-if="hasActiveFilters" class="hidden flex-wrap items-center gap-2 lg:flex">
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
import { useVoucherStore } from '~/stores/voucher/voucher';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const voucherStore = useVoucherStore();
const { filter } = storeToRefs(voucherStore);

const is_loading = computed(() => voucherStore.loading);
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
	if (searchTimeout.value) clearTimeout(searchTimeout.value);
	searchTimeout.value = null;
	filter.value.current_page = 1;
	await voucherStore.getVouchers();
};

const debouncedSearch = () => {
	if (searchTimeout.value) {
		clearTimeout(searchTimeout.value);
	}
	searchTimeout.value = setTimeout(async () => {
		await search();
	}, 500);
};

const onStatusChange = async (value: string | undefined) => {
	filter.value.status = value === STATUS_FILTER_ALL ? undefined : value;
	await search();
};

const clearFilters = async () => {
	filter.value.query = '';
	filter.value.status = undefined;
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
