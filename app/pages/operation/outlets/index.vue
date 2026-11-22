<template>
	<ZPagePanel id="operation-outlets" :title="t('nav.outlets')" back-to="/operation" inline-mobile-actions>
		<template #navbar-right>
			<ZCreateButton class="hidden lg:flex" to="/operation/outlets/create" :label="t('common.addOutlet')" />
			<UButton
				to="/operation/outlets/create"
				color="success"
				:label="t('productMobileListing.add')"
				:aria-label="t('common.addOutlet')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
			/>
		</template>
		<template #toolbar>
			<ZSectionFilterOutlet />
		</template>

		<div class="flex min-w-0 flex-col gap-3 lg:gap-6">
			<!-- Table Controls -->
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				desktop-columns
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="updatePageSize"
				@export="exportOutlets"
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

			<UCard v-else class="hidden lg:block" :ui="{ body: 'p-0 sm:p-0' }">
				<UTable :data="outlets" :columns="visibleColumns" :loading="loading" loading-state="loading" @select="openOutlet">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon name="i-heroicons-building-office" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noOutletsFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<ZMobileRecordList
				v-slot="{ item }"
				:items="outlets"
				item-key="code"
				:label="t('nav.outlets')"
				:empty-title="t('pages.noOutletsFound')"
				:loading="initialize || loading"
				record-path-prefix="/operation/outlets/"
			>
				<ZRecordLink :to="`/operation/outlets/${encodeURIComponent(item.code)}`">
					<span class="block text-sm font-semibold text-highlighted">{{ item.description || item.code }}</span>
					<span v-if="item.code" class="block text-xs text-muted">{{ item.code }}</span>
					<template #trailing>
						<span class="text-xs text-muted wrap-anywhere">{{ [item.city, item.state].filter(Boolean).join(', ') }}</span>
					</template>
				</ZRecordLink>
			</ZMobileRecordList>

			<!-- Pagination  -->
			<div v-if="!initialize && (outlets.length > 0 || filter.current_page > 1)" class="section-pagination">
				<ZPagination :page="filter.current_page" :items-per-page="filter.page_size" :total="total_outlets" :disabled="loading" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { getOutletColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { Outlet } from '~/utils/types/outlet';
import { options_page_size } from '~/utils/options';
import type { TableRow } from '@nuxt/ui';

const OUTLET_COLUMN_LABELS = {
	code: 'table.code',
	address: 'table.address',
} as const;

const outletStore = useOutletStore();
const { t } = useI18n();
const outlet_columns = computed(() => getOutletColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, OUTLET_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(outlet_columns, columnOptions);

useHead({ title: () => t('pages.outletsTitle') });

const { loading, exporting, outlets, filter, total_outlets } = storeToRefs(outletStore);
const initialize = ref(true);

onMounted(async () => {
	initialize.value = true;
	try {
		await outletStore.getOutlets();
	} finally {
		initialize.value = false;
	}
});

const openOutlet = (_e: Event, row: TableRow<Outlet>) => {
	const outlet = row.original;
	if (!outlet) return;
	navigateTo(`/operation/outlets/${encodeURIComponent(outlet.code)}`);
};

const updatePage = async (page: number) => {
	await outletStore.updatePage(page);
};

const updatePageSize = async (size: number) => {
	await outletStore.updatePageSize(size);
};

const exportOutlets = async () => {
	// await outletStore.exportOutlets();
};
</script>

<style scoped>
.base {
	width: 100%;
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	gap: 1.5rem;
	margin-top: 1rem;
}

@media (min-width: 640px) {
	.base {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}
}

.section-empty {
	height: 13rem;
}

.section-empty div {
	text-align: center;
}

.section-empty h2 {
	font-size: 1.5rem;
	line-height: 2rem;
	font-weight: 600;
}

.section-empty p {
	color: var(--color-neutral-400);
}
</style>
