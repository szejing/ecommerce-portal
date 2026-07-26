<template>
	<ZPagePanel id="taxes-codes" :title="t('nav.taxCodes')" back-to="/settings/taxes">
		<template #toolbar>
			<ZSectionFilterTaxCodes />
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
				@export="exportTaxes"
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
			<UTable v-else :data="taxes" :columns="visibleColumns" :loading="loading" @select="selectTax">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 gap-3">
						<UIcon :name="ICONS.TAX" class="w-12 h-12 text-gray-400" />
						<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noTaxCodesFound') }}</p>
						<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
				</template>
			</UTable>

			<!-- Pagination  -->
			<div v-if="!initialize && taxes.length > 0" class="section-pagination">
				<UPagination v-model="filter.current_page" :items-per-page="filter.page_size" :total="total_taxes" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalConfirmation, ZModalLoading, ZModalTaxDetail } from '#components';
import { getTaxCodeColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { Tax } from '~/utils/types/tax';
import type { TableRow } from '@nuxt/ui';
import { options_page_size } from '~/utils/options';
import { ICONS } from '~/utils/icons';

const TAX_CODE_COLUMN_LABELS = {
	code: 'table.code',
	type: 'table.taxType',
	is_active: 'table.active',
} as const;

const { t } = useI18n();
const tax_code_columns = computed(() => getTaxCodeColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, TAX_CODE_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(tax_code_columns, columnOptions);
useHead({ title: () => t('pages.taxCodesTitle') });

const overlay = useOverlay();
const taxStore = useTaxStore();
const { loading, taxes, filter, total_taxes, updating, exporting } = storeToRefs(taxStore);
const initialize = ref(true);

onMounted(async () => {
	initialize.value = true;
	try {
		await taxStore.getTaxes();
	} finally {
		initialize.value = false;
	}
});
const loadingModal = overlay.create(ZModalLoading, { props: { key: 'loading' } });

watch(
	() => updating.value,
	(value: boolean) => {
		if (value) {
			loadingModal.open();
		} else {
			loadingModal.close();
		}
	},
);

const deleteTax = async (code: string) => {
	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: 'Are you sure you want to delete this outlet?',
			action: 'delete',
			onConfirm: async () => {
				await taxStore.deleteTax(code);
				confirmModal.close();
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};

const selectTax = async (e: Event, row: TableRow<Tax>) => {
	const tax = row.original;
	if (!tax) return;

	const taxModal = overlay.create(ZModalTaxDetail, {
		props: {
			tax: JSON.parse(JSON.stringify(tax)),
			onUpdate: async (_tax: Tax) => {
				await taxStore.updateTax(tax.code, {
					..._tax,
					metadata: tax.metadata || undefined,
				});
				taxModal.close();
			},
			onDelete: async () => {
				taxModal.close();
				await deleteTax(tax.code);
			},
			onCancel: () => {
				taxModal.close();
			},
		},
	});

	taxModal.open();
};

const updatePage = async (page: number) => {
	await taxStore.updatePage(page);
};

const updatePageSize = async (size: number) => {
	await taxStore.updatePageSize(size);
};

const exportTaxes = async () => {
	// await taxStore.exportTaxes();
};
</script>

<style scoped></style>
