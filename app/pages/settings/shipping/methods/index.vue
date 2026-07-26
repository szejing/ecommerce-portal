<template>
	<ZPagePanel id="settings-shipping-methods" :title="t('pages.shippingMethods')" back-to="/settings/shipping">
		<template #navbar-right>
			<ZCreateButton to="/settings/shipping/methods/create" :label="t('common.create')" />
		</template>
		<template #toolbar>
			<ZSectionFilterShippingMethods />
		</template>

		<div class="space-y-6">
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="shippingStore.updatePageSize"
				@export="exportShippingMethods"
			/>

			<template v-if="initialize">
				<div class="rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
					<div class="grid grid-cols-[1fr_auto] gap-4 p-4">
						<USkeleton class="h-4 w-24" />
						<USkeleton class="h-4 w-16" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-[1fr_auto] gap-4 p-4 items-center">
						<USkeleton class="h-4 w-40" />
						<USkeleton class="h-4 w-12" />
					</div>
				</div>
			</template>
			<UTable v-else :data="getDisplayMethods" :columns="visibleColumns" :loading="loading" @select="selectMethod">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 gap-3">
						<UIcon :name="ICONS.ADDITIONAL" class="w-12 h-12 text-gray-400" />
						<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noShippingMethodsFound') }}</p>
						<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
				</template>
			</UTable>

			<div v-if="!initialize && getDisplayMethods.length > 0" class="section-pagination">
				<UPagination v-model="filter.current_page" :items-per-page="filter.page_size" :total="total_shipping_methods" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import type { TableRow } from '@nuxt/ui';
import { ICONS } from '~/utils/icons';
import { options_page_size } from '~/utils/options';
import { getShippingMethodColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { ShippingMethodOption } from '~/utils/types/order-fulfillment-shipping';

const SHIPPING_METHOD_COLUMN_LABELS = {
	description: 'common.description',
	is_active: 'common.status',
} as const;

const { t } = useI18n();
const shippingStore = useShippingMethodStore();
const { loading, getDisplayMethods, total_shipping_methods, filter, exporting } = storeToRefs(shippingStore);

const initialize = ref(true);

const columns = computed(() => getShippingMethodColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, SHIPPING_METHOD_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(columns, columnOptions);

const selectMethod = (_e: Event, row: TableRow<ShippingMethodOption>) => {
	void navigateTo(`/settings/shipping/methods/${row.original.id}`);
};

const updatePage = async (page: number) => {
	await shippingStore.updatePage(page);
};

const exportShippingMethods = async () => {
	await shippingStore.exportShippingMethods();
};

useHead({ title: () => t('pages.shippingMethodsPageTitle') });

onMounted(async () => {
	initialize.value = true;
	try {
		await shippingStore.getShippingMethods();
	} finally {
		initialize.value = false;
	}
});
</script>

<style scoped></style>
