<template>
	<ZPagePanel id="taxes-groups" :title="t('nav.taxGroups')" back-to="/settings/taxes">
		<template #navbar-right>
			<ZCreateButton to="/products/create" :label="t('common.addTaxGroup')" />
		</template>
		<template #toolbar>
			<ZSectionFilterTaxGroups />
		</template>

		<div class="space-y-6">
			<!-- Table Controls -->
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="updatePageSize"
				@export="exportTaxGroups"
			/>

			<!-- Table  -->
			<UTable :data="tax_groups" :columns="visibleColumns" :loading="loading" @select="selectTaxGroup">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 gap-3">
						<UIcon :name="ICONS.TAX" class="w-12 h-12 text-gray-400" />
						<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noTaxGroupsFound') }}</p>
						<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
				</template>
			</UTable>

			<!-- Pagination  -->
			<div v-if="tax_groups.length > 0" class="section-pagination">
				<UPagination v-model="filter.current_page" :items-per-page="filter.page_size" :total="total_tax_groups" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalConfirmation, ZModalTaxGroupDetail } from '#components';
import { getTaxGroupColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { TaxGroup } from '~/utils/types/tax-group';
import type { TableRow } from '@nuxt/ui';
import { options_page_size } from '~/utils/options';
import { ICONS } from '~/utils/icons';

const overlay = useOverlay();
const taxGroupStore = useTaxGroupStore();
const { loading, tax_groups, filter, total_tax_groups, exporting } = storeToRefs(taxGroupStore);

const TAX_GROUP_COLUMN_LABELS = {
	code: 'table.code',
	taxes: 'table.taxes',
} as const;

const { t } = useI18n();
const tax_group_columns = computed(() => getTaxGroupColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, TAX_GROUP_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(tax_group_columns, columnOptions);
useHead({ title: () => t('pages.taxGroupsTitle') });

onMounted(async () => {
	await taxGroupStore.getTaxGroups();
});

const deleteTaxGroup = async (code: string) => {
	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: 'Are you sure you want to delete this outlet?',
			action: 'delete',
			onConfirm: async () => {
				await taxGroupStore.deleteTaxGroup(code);
				confirmModal.close();
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};

const selectTaxGroup = async (e: Event, row: TableRow<TaxGroup>) => {
	const taxGroup = row.original;
	if (!taxGroup) return;

	const taxGroupModal = overlay.create(ZModalTaxGroupDetail, {
		props: {
			taxGroup: JSON.parse(JSON.stringify(taxGroup)),
			onUpdate: async (_taxGroup: TaxGroup) => {
				await taxGroupStore.updateTaxGroup(taxGroup.code, {
					..._taxGroup,
					taxes: _taxGroup.taxes,
				});
				taxGroupModal.close();
			},
			onDelete: async () => {
				taxGroupModal.close();
				await deleteTaxGroup(taxGroup.code);
			},
			onCancel: () => {
				taxGroupModal.close();
			},
		},
	});

	taxGroupModal.open();
};

const updatePage = async (page: number) => {
	await taxGroupStore.updatePage(page);
};

const updatePageSize = async (size: number) => {
	await taxGroupStore.updatePageSize(size);
};

const exportTaxGroups = async () => {
	// await taxGroupStore.exportTaxGroups();
};
</script>

<style scoped></style>
