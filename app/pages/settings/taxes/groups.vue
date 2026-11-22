<template>
	<ZPagePanel id="taxes-groups" :title="t('nav.taxGroups')" back-to="/settings/taxes" inline-mobile-actions>
		<template #navbar-right>
			<ZCreateButton class="hidden lg:flex" :label="t('common.addTaxGroup')" @click="createOpen = true" />
			<UButton
				color="success"
				:label="t('productMobileListing.add')"
				:aria-label="t('common.addTaxGroup')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
				@click="createOpen = true"
			/>
		</template>
		<template #toolbar>
			<ZSectionFilterTaxGroups />
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
				@export="exportTaxGroups"
			/>

			<!-- Table  -->
			<UTable class="hidden lg:block" :data="tax_groups" :columns="visibleColumns" :loading="loading" @select="selectTaxGroup">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 gap-3">
						<UIcon :name="ICONS.TAX" class="w-12 h-12 text-gray-400" />
						<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noTaxGroupsFound') }}</p>
						<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
				</template>
			</UTable>

			<ZMobileRecordList
				v-slot="{ item }"
				:items="tax_groups"
				item-key="code"
				:label="t('nav.taxGroups')"
				:empty-title="t('pages.noTaxGroupsFound')"
				:loading="loading"
			>
				<ZRecordLink @click="openTaxGroup(item)">
					<span class="block text-sm font-semibold text-highlighted">{{ item.description || item.code }}</span>
					<span v-if="item.code" class="block text-xs text-muted">{{ item.code }}</span>
					<span class="block text-xs text-muted">{{ item.taxes?.map((tax) => tax.code).join(', ') }}</span>
				</ZRecordLink>
			</ZMobileRecordList>

			<!-- Pagination  -->
			<div v-if="(tax_groups.length > 0 || filter.current_page > 1)" class="section-pagination">
				<ZPagination :page="filter.current_page" :items-per-page="filter.page_size" :total="total_tax_groups" :disabled="loading" @update:page="updatePage" />
			</div>
		</div>
		<UModal v-model:open="createOpen" :title="t('common.addTaxGroup')">
			<template #body>
				<FormTaxGroupCreation @saved="createOpen = false" />
			</template>
		</UModal>
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
const createOpen = ref(false);
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

const selectTaxGroup = (_event: Event, row: TableRow<TaxGroup>) => openTaxGroup(row.original);

const openTaxGroup = async (taxGroup: TaxGroup) => {
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
