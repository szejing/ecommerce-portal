<template>
	<div class="w-full">
		<div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
			<div class="flex flex-col gap-1.5 col-span-2">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.searchLabel') }}</label>
				<UInput
					:model-value="combo_filters.query"
					:placeholder="t('components.filter.searchCombo')"
					:icon="ICONS.SEARCH_ROUNDED"
					@update:model-value="productStore.setComboSearch"
				/>
			</div>

			<div class="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.status') }}</label>
				<ZSelectMenuProductStatus :status="combo_filters.status" @update:status="productStore.setComboStatus" />
			</div>

			<div class="flex flex-col gap-1.5 justify-end">
				<div class="flex gap-2">
					<UButton variant="outline" color="neutral" :disabled="is_loading" @click="productStore.clearComboFilters">
						<UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
						{{ t('components.filter.clear') }}
					</UButton>
					<UButton color="primary" :disabled="is_loading" :loading="is_loading" @click="productStore.refreshComboListing">
						<UIcon :name="ICONS.SEARCH_ROUNDED" class="w-4 h-4" />
						{{ t('components.filter.search') }}
					</UButton>
				</div>
			</div>
		</div>

		<div v-if="hasActiveFilters" class="flex flex-wrap gap-2 items-center">
			<span class="text-xs text-gray-600 dark:text-gray-400">{{ t('components.filter.activeFilters') }}</span>
			<UBadge v-if="combo_filters.query" color="info" variant="subtle" size="sm" @click="productStore.setComboSearch('')">
				{{ t('components.filter.search') }}: {{ combo_filters.query }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
			<UBadge v-if="combo_filters.status" color="success" variant="subtle" size="sm" @click="productStore.setComboStatus(undefined)">
				{{ t('components.filter.status') }}: {{ capitalizeFirstLetter(combo_filters.status) }}
				<UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
			</UBadge>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
import { capitalizeFirstLetter } from '~/utils/utils';

const { t } = useI18n();

const productStore = useProductStore();
const { combo_filters, combo_loading } = storeToRefs(productStore);

const is_loading = computed(() => combo_loading.value);

const hasActiveFilters = computed(() => {
	return combo_filters.value.query || combo_filters.value.status;
});
</script>

<style scoped></style>
