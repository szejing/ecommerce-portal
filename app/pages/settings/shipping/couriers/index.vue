<template>
	<ZPagePanel id="settings-shipping-couriers" :title="t('pages.couriers')" back-to="/settings/shipping" inline-mobile-actions>
		<template #navbar-right>
			<ZCreateButton class="hidden lg:flex" to="/settings/shipping/couriers/create" :label="t('common.create')" />
			<UButton
				to="/settings/shipping/couriers/create"
				color="success"
				:label="t('productMobileListing.add')"
				:aria-label="t('common.create')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
			/>
		</template>
		<template #toolbar>
			<ZSectionFilterShippingCouriers />
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
				@update:model-value="courierStore.updatePageSize"
				@export="exportCouriers"
			/>

			<template v-if="initialize">
				<div class="hidden lg:block rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
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
			<UTable v-else class="hidden lg:block" :data="getDisplayCouriers" :columns="visibleColumns" :loading="loading" @select="selectCourier">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 gap-3">
						<UIcon :name="ICONS.TRUCK" class="w-12 h-12 text-gray-400" />
						<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noCouriersFound') }}</p>
						<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
				</template>
			</UTable>

			<ZMobileRecordList
				v-slot="{ item }"
				:items="getDisplayCouriers"
				item-key="id"
				:label="t('pages.couriers')"
				:empty-title="t('pages.noCouriersFound')"
				:loading="initialize || loading"
				record-path-prefix="/settings/shipping/couriers/"
			>
				<ZRecordLink :to="`/settings/shipping/couriers/${encodeURIComponent(item.id)}`">
					<span class="block text-sm font-semibold text-highlighted">{{ item.name }}</span>
					<span v-if="item.description" class="block text-xs text-muted">{{ item.description }}</span>
					<template #trailing>
						<UBadge :color="item.is_active ? 'success' : 'neutral'" variant="subtle" size="sm">
							{{ t(item.is_active ? 'common.active' : 'common.inactive') }}
						</UBadge>
					</template>
				</ZRecordLink>
			</ZMobileRecordList>

			<div v-if="!initialize && (getDisplayCouriers.length > 0 || filter.current_page > 1)" class="section-pagination">
				<ZPagination :page="filter.current_page" :items-per-page="filter.page_size" :total="total_couriers" :disabled="loading" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import type { TableRow } from '@nuxt/ui';
import { ICONS } from '~/utils/icons';
import { options_page_size } from '~/utils/options';
import { getCourierColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { Courier } from '~/utils/types/courier';

const COURIER_COLUMN_LABELS = {
	name: 'common.name',
	description: 'common.description',
	is_active: 'common.status',
} as const;

const { t } = useI18n();
const courierStore = useCourierStore();
const { loading, getDisplayCouriers, total_couriers, filter, exporting } = storeToRefs(courierStore);

const initialize = ref(true);

const columns = computed(() => getCourierColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, COURIER_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(columns, columnOptions);

const selectCourier = (_e: Event, row: TableRow<Courier>) => {
	void navigateTo(`/settings/shipping/couriers/${row.original.id}`);
};

const updatePage = async (page: number) => {
	await courierStore.updatePage(page);
};

const exportCouriers = async () => {
	await courierStore.exportCouriers();
};

useHead({ title: () => t('pages.couriersPageTitle') });

onMounted(async () => {
	initialize.value = true;
	try {
		await courierStore.getCouriers();
	} finally {
		initialize.value = false;
	}
});
</script>

<style scoped></style>
