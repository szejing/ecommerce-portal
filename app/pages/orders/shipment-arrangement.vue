<template>
	<ZPagePanel id="shipment-arrangement" :title="t('shipmentArrangement.title')">
		<div class="min-w-0 space-y-5">
			<p class="max-w-3xl text-sm leading-5 text-muted">{{ t('shipmentArrangement.subtitle') }}</p>

			<ShipmentArrangementWorkflowGuide
				:pending-count="store.total"
				:exporting="store.exporting"
				:importing="store.importing"
				@export="exportPending"
				@import="openFilePicker"
			/>

			<UAlert
				v-if="store.listFailure"
				color="error"
				variant="soft"
				icon="i-lucide-circle-alert"
				:title="t('shipmentArrangement.states.loadErrorTitle')"
				:description="store.listFailure.message"
			>
				<template #actions>
					<UButton data-testid="refresh-pending" color="error" variant="outline" size="sm" :label="t('common.refresh')" @click="store.refreshPending" />
				</template>
			</UAlert>
			<UAlert
				v-if="store.importFailure"
				color="error"
				variant="soft"
				icon="i-lucide-file-warning"
				:title="t('shipmentArrangement.states.uploadErrorTitle')"
				:description="importFailureDescription"
			/>

			<section class="rounded-lg border border-default bg-default p-4" :aria-label="t('shipmentArrangement.filters.title')">
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.4fr)_minmax(12rem,0.8fr)_auto_auto] xl:items-end">
					<label class="min-w-0 space-y-1.5 text-sm font-medium text-default">
						<span>{{ t('shipmentArrangement.filters.searchLabel') }}</span>
						<UInput :model-value="store.filters.search" icon="i-lucide-search" :placeholder="t('shipmentArrangement.filters.search')" @update:model-value="store.setSearch" />
					</label>
					<label class="min-w-0 space-y-1.5 text-sm font-medium text-default">
						<span>{{ t('shipmentArrangement.filters.shippingMethodLabel') }}</span>
						<USelectMenu
							:model-value="store.filters.shippingMethodId"
							data-testid="shipping-method-filter"
							class="w-full"
							:items="shippingMethodOptions"
							value-key="value"
							:placeholder="t('shipmentArrangement.filters.shippingMethod')"
							@update:model-value="store.setShippingMethod"
						/>
					</label>
					<div class="min-w-0 space-y-1.5 text-sm font-medium text-default">
						<span>{{ t('shipmentArrangement.filters.orderDate') }}</span>
						<ZDateRange :model-value="store.filters.dateRange" hide-presets @update:model-value="store.setDateRange" />
					</div>
					<div class="flex flex-col gap-2 sm:flex-row xl:justify-end">
						<UButton
							data-testid="clear-filters"
							class="min-h-11 justify-center"
							color="neutral"
							variant="ghost"
							icon="i-lucide-eraser"
							:label="t('shipmentArrangement.actions.clearFilters')"
							:aria-label="t('shipmentArrangement.actions.clearFilters')"
							@click="store.clearFilters"
						/>
					</div>
				</div>
				<input ref="fileInput" class="hidden" type="file" accept=".xlsx,.numbers" @change="onFileSelected" />
			</section>

			<section class="min-w-0 rounded-lg border border-default bg-default" :aria-label="t('shipmentArrangement.table.title')">
				<div class="flex flex-col gap-3 border-b border-default p-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-base font-semibold text-default">{{ t('shipmentArrangement.table.pendingTitle') }}</h2>
						<p class="text-sm text-muted">{{ t('shipmentArrangement.table.pendingCount', { count: store.total }) }}</p>
					</div>
					<ZTableToolbar
						v-model:selected-column-keys="selectedColumnKeys"
						:model-value="store.pageSize"
						class="w-full sm:w-auto"
						:page-size-options="options_page_size"
						:export-enabled="false"
						:column-options="columnOptions"
						@update:model-value="store.setPageSize"
					/>
				</div>

				<div v-if="store.loading" data-testid="pending-loading" class="space-y-0 divide-y divide-default">
					<div v-for="row in 6" :key="row" class="grid grid-cols-2 gap-4 p-4 sm:grid-cols-6">
						<USkeleton v-for="cell in 6" :key="cell" class="h-4" />
					</div>
				</div>

				<div v-else-if="store.rows.length === 0" data-testid="pending-empty" class="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
					<UIcon name="i-lucide-package-check" class="size-12 text-dimmed" />
					<div>
						<p class="font-semibold text-default">{{ t('shipmentArrangement.states.emptyTitle') }}</p>
						<p class="mt-1 text-sm text-muted">{{ t('shipmentArrangement.states.emptyDescription') }}</p>
					</div>
					<UButton
						data-testid="refresh-pending"
						color="neutral"
						variant="outline"
						icon="i-lucide-refresh-cw"
						:label="t('common.refresh')"
						@click="store.refreshPending"
					/>
				</div>

				<div v-else class="max-w-full overflow-x-auto">
					<UTable :data="[...store.rows]" :columns="visibleColumns" class="min-w-[64rem]" />
				</div>

				<div
					v-if="!store.loading && store.rows.length > 0"
					class="flex flex-col gap-3 border-t border-default px-4 py-3 text-sm text-muted sm:flex-row sm:items-center sm:justify-between"
				>
					<span>{{ t('shipmentArrangement.table.showing', { from: store.firstVisibleRow, to: store.lastVisibleRow, total: store.total }) }}</span>
					<UPagination :page="store.page" :items-per-page="store.pageSize" :total="store.total" show-first show-last size="sm" @update:page="store.setPage" />
				</div>
			</section>

			<ShipmentArrangementImportPreviewModal
				v-model="previewOpen"
				:preview="store.preview"
				:eligible-count="store.eligibleCount"
				:apply-result="store.applyResult"
				:applying="store.applying"
				:error="store.applyFailure?.kind === 'request_failed' ? store.applyFailure.message : undefined"
				@apply="applyPreview"
				@dismiss="store.dismissImport"
			/>
		</div>
	</ZPagePanel>
</template>

<script setup lang="ts">
import { options_page_size } from '~/utils/options';
import { getShipmentArrangementColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';

const SHIPMENT_ARRANGEMENT_COLUMN_LABELS = {
	order_no: 'shipmentArrangement.table.order',
	batch_no: 'shipmentArrangement.table.batch',
	ordered_at: 'shipmentArrangement.table.ordered',
	recipient: 'shipmentArrangement.table.recipient',
	destination: 'shipmentArrangement.table.destination',
	shipping_method: 'shipmentArrangement.table.shippingMethod',
} as const;

const store = useShipmentArrangementStore();
const { t } = useI18n();
const fileInput = ref<HTMLInputElement>();
const previewOpen = computed({
	get: () => store.preview != null,
	set: (open: boolean) => {
		if (!open) store.dismissImport();
	},
});

const columns = computed(() => getShipmentArrangementColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, SHIPMENT_ARRANGEMENT_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(columns, columnOptions);
const shippingMethodOptions = computed(() => [
	{ label: t('shipmentArrangement.filters.shippingMethod'), value: undefined },
	...store.activeShippingMethods.map((method) => ({ label: method.description, value: method.id })),
]);
const importFailureDescription = computed(() =>
	store.importFailure?.kind === 'unsupported_workbook'
		? t('shipmentArrangement.states.invalidFile')
		: store.importFailure?.message,
);
useHead({ title: () => t('shipmentArrangement.title') });

const exportPending = async (): Promise<void> => {
	const outcome = await store.exportPending();
	if (outcome.status === 'completed') successNotification(t('shipmentArrangement.notifications.exported'));
	else failedNotification(outcome.failure.message);
};

const openFilePicker = (): void => {
	fileInput.value?.click();
};

const onFileSelected = async (event: Event): Promise<void> => {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (!file) return;

	const outcome = await store.previewWorkbook(file);
	if (outcome.status === 'completed') return;
	else if (outcome.failure.kind === 'unsupported_workbook') failedNotification(t('shipmentArrangement.states.invalidFile'));
	else failedNotification(outcome.failure.message);
};

const applyPreview = async (): Promise<void> => {
	const outcome = await store.applyPreview();
	if (outcome.status === 'failed') {
		failedNotification(outcome.failure.message);
	} else if (outcome.status === 'rejected') {
		failedNotification(t(outcome.failure.kind === 'missing_preview'
			? 'shipmentArrangement.states.uploadErrorTitle'
			: 'shipmentArrangement.preview.failedTitle'));
	} else if (outcome.status === 'completed' && outcome.result.failed > 0) {
		failedNotification(t('shipmentArrangement.notifications.partial', { updated: outcome.result.updated, failed: outcome.result.failed }));
	} else if (outcome.status === 'completed') {
		successNotification(t('shipmentArrangement.notifications.applied', { count: outcome.result.updated }));
	}
};

onMounted(async () => {
	await store.initialize();
	if (store.optionsFailure) failedNotification(store.optionsFailure.message);
});

onBeforeUnmount(() => store.dispose());
</script>
