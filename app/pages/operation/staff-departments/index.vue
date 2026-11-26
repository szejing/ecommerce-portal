<template>
	<ZPagePanel id="staff-departments" :title="t('nav.staffDepartments')" back-to="/operation" inline-mobile-actions>
		<template #navbar-right>
			<ZCreateButton class="hidden lg:flex" to="/operation/staff-departments/create" :label="t('common.addStaffDepartment')" />
			<UButton
				to="/operation/staff-departments/create"
				color="success"
				:label="t('productMobileListing.add')"
				:aria-label="t('common.addStaffDepartment')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
			/>
		</template>
		<template #toolbar>
			<ZSectionFilterStaffDepartments />
		</template>

		<div class="flex min-w-0 flex-col gap-3 lg:gap-6">
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				desktop-columns
				:page-size-options="options_page_size"
				:export-enabled="false"
				:column-options="columnOptions"
				@update:model-value="staffDepartmentStore.updatePageSize"
			/>

			<template v-if="initialize">
				<div class="hidden rounded-lg overflow-hidden divide-y divide-neutral-200 lg:block dark:divide-neutral-700">
					<div class="grid grid-cols-4 gap-4 p-4">
						<USkeleton v-for="i in 4" :key="i" class="h-4 flex-1 min-w-0" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-4 gap-4 p-4 items-center">
						<USkeleton v-for="j in 4" :key="j" class="h-4 flex-1 min-w-0" />
					</div>
				</div>
			</template>

			<UCard v-else class="hidden lg:block" :ui="{ body: 'p-0 sm:p-0' }">
				<UTable :data="getDisplayDepartments" :columns="visibleColumns" :loading="loading" :ui="{ tr: 'cursor-pointer' }" @select="selectDepartment">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.USER_GROUP_ROUNDED" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noStaffDepartmentsFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<ZMobileRecordList
				v-slot="{ item }"
				:items="getDisplayDepartments"
				item-key="id"
				:label="t('nav.staffDepartments')"
				:empty-title="t('pages.noStaffDepartmentsFound')"
				:loading="initialize || loading"
				record-path-prefix="/operation/staff-departments/"
			>
				<div class="flex min-h-16 items-center gap-1 pe-1">
					<ZRecordLink class="min-w-0 flex-1 !w-auto" :to="`/operation/staff-departments/${encodeURIComponent(item.id)}`">
						<span class="block text-sm font-semibold text-highlighted">{{ item.name }}</span>
						<span class="block text-xs text-muted tabular-nums">
							{{ t('components.crmUserForm.defaultCommissionRate') }} · {{ Number(item.default_commission_rate ?? 0) }}%
						</span>
						<span v-if="item.updated_at" class="block text-xs text-muted">
							{{ getFormattedDate(new Date(item.updated_at), 'dd/MM/yyyy') }}
						</span>
					</ZRecordLink>
					<span class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center">
						<USwitch
							:model-value="item.is_active"
							size="lg"
							:aria-label="`${t('common.status')} · ${item.name}`"
							@update:model-value="(value: boolean) => staffDepartmentStore.updateStatus(item, value === true)"
						/>
					</span>
				</div>
			</ZMobileRecordList>

			<div v-if="!initialize && getDisplayDepartments.length > 0" class="section-pagination">
				<ZPagination :page="filter.current_page" :items-per-page="filter.page_size" :total="total_count" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import type { TableRow } from '@nuxt/ui';
import { getFormattedDate } from 'yeppi-common';
import { ICONS } from '~/utils/icons';
import { options_page_size } from '~/utils/options';
import { getStaffDepartmentColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { StaffDepartment } from '~/utils/types/staff-department';
import { useStaffDepartmentStore } from '~/stores/StaffDepartment/StaffDepartment';

const STAFF_DEPARTMENT_COLUMN_LABELS = {
	name: 'common.name',
	default_commission_rate: 'components.crmUserForm.defaultCommissionRate',
	is_active: 'common.status',
	updated_at: 'table.lastUpdated',
} as const;

const { t } = useI18n();
const staffDepartmentStore = useStaffDepartmentStore();
const { loading, getDisplayDepartments, total_count, filter } = storeToRefs(staffDepartmentStore);

const initialize = ref(true);

const columns = computed(() => getStaffDepartmentColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, STAFF_DEPARTMENT_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(columns, columnOptions);

useHead({ title: () => t('pages.staffDepartmentsPageTitle') });

const selectDepartment = (_e: Event, row: TableRow<StaffDepartment>) => {
	const position = row.original;
	if (!position?.id) return;
	navigateTo(`/operation/staff-departments/${encodeURIComponent(position.id)}`);
};

const updatePage = async (page: number) => {
	await staffDepartmentStore.updatePage(page);
};

onMounted(async () => {
	initialize.value = true;
	try {
		await staffDepartmentStore.getStaffDepartments();
	} finally {
		initialize.value = false;
	}
});
</script>

<style scoped></style>
