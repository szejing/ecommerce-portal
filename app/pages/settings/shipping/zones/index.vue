<template>
	<ZPagePanel id="settings-shipping-zones-listing" :title="t('pages.shippingZonesListingTitle')" back-to="/settings/shipping" inline-mobile-actions>
		<template #navbar-right>
			<ZCreateButton class="hidden lg:flex" to="/settings/shipping/zones/create" :label="t('common.create')" />
			<UButton
				to="/settings/shipping/zones/create"
				color="success"
				:label="t('productMobileListing.add')"
				:aria-label="t('common.create')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
			/>
		</template>
		<template #toolbar>
			<ZSectionFilterShippingZones />
		</template>

		<div class="flex min-w-0 flex-col gap-3 lg:gap-6">
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				desktop-columns
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="zoneStore.updatePageSize"
				@export="exportShippingZones"
			/>

			<template v-if="initialize">
				<div class="hidden lg:block rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
					<div class="grid grid-cols-4 gap-4 p-4">
						<USkeleton v-for="i in 4" :key="i" class="h-4 flex-1 min-w-0" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-4 gap-4 p-4 items-center">
						<USkeleton v-for="j in 4" :key="j" class="h-4 flex-1 min-w-0" />
					</div>
				</div>
			</template>
			<UTable v-else class="hidden lg:block" :data="getDisplayZones" :columns="visibleColumns" :loading="loading" @select="selectZone">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 gap-3">
						<UIcon :name="ICONS.ADDITIONAL" class="w-12 h-12 text-gray-400" />
						<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noShippingZonesFound') }}</p>
						<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
				</template>
			</UTable>

			<ZMobileRecordList
				v-slot="{ item }"
				:items="getDisplayZones"
				item-key="code"
				:label="t('pages.shippingZonesListingTitle')"
				:empty-title="t('pages.noShippingZonesFound')"
				:loading="initialize || loading"
				record-path-prefix="/settings/shipping/zones/"
			>
				<ZRecordLink :to="`/settings/shipping/zones/${encodeURIComponent(item.code)}`">
					<span class="block text-sm font-semibold text-highlighted">{{ item.description || item.code }}</span>
					<span v-if="item.code" class="block text-xs text-muted">{{ item.code }}</span>
					<template #trailing>
						<UBadge :color="item.is_active ? 'success' : 'neutral'" variant="subtle" size="sm">
							{{ t(item.is_active ? 'common.active' : 'common.inactive') }}
						</UBadge>
					</template>
				</ZRecordLink>
			</ZMobileRecordList>

			<div v-if="!initialize && (getDisplayZones.length > 0 || filter.current_page > 1)" class="section-pagination">
				<ZPagination :page="filter.current_page" :items-per-page="filter.page_size" :total="total_shipping_zones" :disabled="loading" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import type { TableRow } from '@nuxt/ui';
import { ICONS } from '~/utils/icons';
import { options_page_size } from '~/utils/options';
import { getShippingZoneColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { ShippingZone } from '~/utils/types/shipping-zone';

const SHIPPING_ZONE_COLUMN_LABELS = {
	region: 'table.shippingZoneRegion',
	pricing_summary: 'table.shippingZonePricing',
	is_active: 'common.status',
} as const;

const { t, locale, messages } = useI18n();
const zoneStore = useShippingZoneStore();
const { loading, getDisplayZones, total_shipping_zones, filter, exporting } = storeToRefs(zoneStore);

const initialize = ref(true);

const columns = computed(() => {
	// Rebuild when lazy locale messages finish loading (@nuxtjs/i18n lazy: true)
	void messages.value?.[locale.value];
	return getShippingZoneColumns(t);
});

const columnOptions = computed(() => [
	{ key: 'code_description', label: `${t('common.code')} / ${t('common.description')}` },
	...columnOptionsFromLabelMap(t, SHIPPING_ZONE_COLUMN_LABELS),
]);

const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(columns, columnOptions);

const selectZone = (_e: Event, row: TableRow<ShippingZone>) => {
	void navigateTo(`/settings/shipping/zones/${encodeURIComponent(row.original.code)}`);
};

const updatePage = async (page: number) => {
	await zoneStore.updatePage(page);
};

const exportShippingZones = async () => {
	await zoneStore.exportShippingZones();
};

useHead({ title: () => t('pages.shippingZonesPageTitle') });

onMounted(async () => {
	initialize.value = true;
	try {
		await zoneStore.getShippingZones();
	} finally {
		initialize.value = false;
	}
});
</script>

<style scoped></style>
