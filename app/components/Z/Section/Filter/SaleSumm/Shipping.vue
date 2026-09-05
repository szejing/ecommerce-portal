<template>
	<div class="w-full">
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3 items-center">
			<div class="flex flex-col col-span-full gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.dateRange') }}</label>
				<ZDateRange :model-value="dateRange" @update:model-value="onDateRange" />
			</div>

			<div class="flex flex-col gap-1.5 col-span-full">
				<div class="flex gap-2">
					<UButton variant="outline" color="neutral" :disabled="is_loading" @click="onClear">
						<UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
						{{ t('components.filter.clear') }}
					</UButton>
					<UButton color="primary" :disabled="is_loading" :loading="is_loading" @click="onSearch">
						<UIcon :name="ICONS.SEARCH_ROUNDED" class="w-4 h-4" />
						{{ t('components.filter.search') }}
					</UButton>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { Range } from '~/utils/interface';
import { ICONS } from '~/utils/icons';

const props = withDefaults(
	defineProps<{
		mode?: 'summary' | 'details';
	}>(),
	{ mode: 'summary' },
);

const { t } = useI18n();
const saleSummStore = useSummSaleStore();
const { sale_summ_shipping } = storeToRefs(saleSummStore);

const is_loading = computed(() => sale_summ_shipping.value.loading);
const dateRange = computed(() => sale_summ_shipping.value.filter.date_range);

const onDateRange = (range: Range) => {
	void saleSummStore.setShippingDateRange(range, props.mode);
};

const onClear = () => {
	void saleSummStore.clearShippingFilters(props.mode);
};

const onSearch = () => {
	void (props.mode === 'details' ? saleSummStore.refreshShippingDetailsListing() : saleSummStore.refreshShippingListing());
};
</script>
