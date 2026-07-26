<template>
	<ZPagePanel id="taxes-rules" :title="t('nav.taxRules')" back-to="/settings/taxes">
		<template #navbar-right>
			<ZCreateButton to="/settings/taxes/rules/create" :label="t('common.addTaxRule')" />
		</template>
		<template #toolbar>
			<ZSectionFilterTaxRules />
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
			<UTable v-else :data="tax_rules" :columns="visibleColumns" :loading="loading" @select="selectTaxRule">
				<template #empty-state>
					<div class="flex-col-center section-empty">
						<h2>{{ t('pages.noTaxRulesFound') }}</h2>
						<p>{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
				</template>
			</UTable>

			<!-- Pagination  -->
			<div v-if="!initialize && tax_rules.length > 0" class="section-pagination">
				<UPagination v-model="filter.current_page" :items-per-page="filter.page_size" :total="total_tax_rules" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { options_page_size } from '~/utils/options';
import { getTaxRuleColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { TaxRule } from '~/utils/types/tax-rule';
import type { TableRow } from '@nuxt/ui';
import { ZModalLoading } from '#components';

const TAX_RULE_COLUMN_LABELS = {
	code: 'table.code',
	details: 'table.details',
} as const;

const taxRuleStore = useTaxRuleStore();
const overlay = useOverlay();
const { t } = useI18n();
const tax_rule_columns = computed(() => getTaxRuleColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, TAX_RULE_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(tax_rule_columns, columnOptions);
const loadingModal = overlay.create(ZModalLoading, { props: { key: 'loading' } });
useHead({ title: () => t('pages.taxRulesTitle') });

const { loading, updating, exporting, tax_rules, filter, total_tax_rules } = storeToRefs(taxRuleStore);
const initialize = ref(true);

onMounted(async () => {
	initialize.value = true;
	try {
		await taxRuleStore.getTaxRules();
	} finally {
		initialize.value = false;
	}
});

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

const selectTaxRule = async (e: Event, row: TableRow<TaxRule>) => {
	const taxRule = row.original;
	if (!taxRule) return;

	navigateTo(`/settings/taxes/rules/${taxRule.code}`);
};

const updatePage = async (page: number) => {
	await taxRuleStore.updatePage(page);
};

const updatePageSize = async (size: number) => {
	await taxRuleStore.updatePageSize(size);
};

const exportTaxes = async () => {
	// await taxRuleStore.exportTaxes();
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
