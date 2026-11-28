<template>
	<ZPagePanel id="settings-reasons" :title="t('pages.reasonsListingTitle')" back-to="/settings/system" inline-mobile-actions>
		<template #navbar-right>
			<ZCreateButton class="hidden lg:flex" to="/settings/reasons/create" :label="t('common.create')" />
			<UButton
				to="/settings/reasons/create"
				color="success"
				:label="t('productMobileListing.add')"
				:aria-label="t('common.create')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
			/>
		</template>
		<template #toolbar>
			<ZSectionFilterReasons />
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
				@update:model-value="reasonStore.updatePageSize"
				@export="exportReasons"
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
			<UTable v-else class="hidden lg:block" :data="getDisplayReasons" :columns="visibleColumns" :loading="loading" @select="selectReason">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 gap-3">
						<UIcon :name="ICONS.ADDITIONAL" class="w-12 h-12 text-gray-400" />
						<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noReasonsFound') }}</p>
						<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
				</template>
			</UTable>

			<ZMobileRecordList
				v-slot="{ item }"
				:items="getDisplayReasons"
				item-key="code"
				:label="t('pages.reasonsListingTitle')"
				:empty-title="t('pages.noReasonsFound')"
				:loading="initialize || loading"
				record-path-prefix="/settings/reasons/"
			>
				<ZRecordLink :to="`/settings/reasons/${encodeURIComponent(item.code)}`">
					<span class="block text-sm font-semibold text-highlighted">{{ item.description || item.code }}</span>
					<span v-if="item.code" class="block text-xs text-muted">{{ item.code }}</span>
					<template #trailing>
						<UBadge :color="item.is_active ? 'success' : 'neutral'" variant="subtle" size="sm">
							{{ t(item.is_active ? 'common.active' : 'common.inactive') }}
						</UBadge>
					</template>
				</ZRecordLink>
			</ZMobileRecordList>

			<div v-if="!initialize && (getDisplayReasons.length > 0 || filter.current_page > 1)" class="section-pagination">
				<ZPagination :page="filter.current_page" :items-per-page="filter.page_size" :total="total_reasons" :disabled="loading" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import type { TableRow } from '@nuxt/ui';
import { ICONS } from '~/utils/icons';
import { options_page_size } from '~/utils/options';
import { getReasonColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { Reason } from '~/utils/types/reason';

const REASON_COLUMN_LABELS = {
	type: 'table.reasonType',
	is_active: 'common.status',
} as const;

const { t, locale, messages } = useI18n();
const reasonStore = useReasonStore();
const { loading, getDisplayReasons, total_reasons, filter, exporting } = storeToRefs(reasonStore);

const initialize = ref(true);

const columns = computed(() => {
	void messages.value?.[locale.value];
	return getReasonColumns(t);
});

const columnOptions = computed(() => [
	{ key: 'code_description', label: `${t('common.code')} / ${t('common.description')}` },
	...columnOptionsFromLabelMap(t, REASON_COLUMN_LABELS),
]);

const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(columns, columnOptions);

const selectReason = (_e: Event, row: TableRow<Reason>) => {
	void navigateTo(`/settings/reasons/${encodeURIComponent(row.original.code)}`);
};

const updatePage = async (page: number) => {
	await reasonStore.updatePage(page);
};

const exportReasons = async () => {
	await reasonStore.exportReasons();
};

useHead({ title: () => t('pages.reasonsPageTitle') });

onMounted(async () => {
	initialize.value = true;
	try {
		await reasonStore.getReasons();
	} finally {
		initialize.value = false;
	}
});
</script>
