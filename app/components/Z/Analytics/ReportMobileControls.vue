<template>
	<div v-if="!desktop" class="space-y-2 lg:hidden">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<UDrawer
				v-model:open="filtersOpen"
				:title="t('portalMobile.filters')"
				:close="{ class: 'min-h-11 min-w-11 justify-center' }"
			>
				<UButton color="neutral" variant="outline" icon="i-lucide-filter" :label="filtersLabel" class="min-h-11" />
				<template #body>
					<div class="space-y-4">
						<div class="space-y-1.5">
							<p class="text-sm font-medium">{{ t('components.filter.dateRange') }}</p>
							<ZDateRange v-model="draft.date_range" />
						</div>
						<div v-if="fields.includes('status')" class="space-y-1.5">
							<p class="text-sm font-medium">{{ t('components.filter.status') }}</p>
							<USelect
								:model-value="draft.status ?? 'All'"
								:items="orderStatuses"
								:aria-label="t('components.filter.status')"
								class="min-h-11 w-full"
								@update:model-value="draft.status = orderStatusValues.find((status) => status === $event)"
							/>
						</div>
						<div v-if="fields.includes('item_status')" class="space-y-1.5">
							<p class="text-sm font-medium">{{ t('components.filter.itemStatus') }}</p>
							<USelect
								:model-value="draft.item_status ?? 'All'"
								:items="itemStatuses"
								:aria-label="t('components.filter.itemStatus')"
								class="min-h-11 w-full"
								@update:model-value="draft.item_status = itemStatusValues.find((status) => status === $event)"
							/>
						</div>
						<div v-if="fields.includes('payment_status')" class="space-y-1.5">
							<p class="text-sm font-medium">{{ t('components.filter.paymentStatus') }}</p>
							<USelect
								:model-value="draft.payment_status ?? 'All'"
								:items="paymentStatuses"
								:aria-label="t('components.filter.paymentStatus')"
								class="min-h-11 w-full"
								@update:model-value="draft.payment_status = $event === 'All' ? undefined : $event"
							/>
						</div>
					</div>
				</template>
				<template #footer>
					<div class="flex w-full flex-wrap justify-end gap-2 pb-[env(safe-area-inset-bottom)]">
						<UButton color="neutral" variant="outline" :label="t('analyticsMobile.resetFilters')" class="min-h-11" @click="resetDraft" />
						<UButton :label="t('analyticsMobile.applyFilters')" class="min-h-11" :disabled="loading" @click="emit('applyFilters', draft)" />
					</div>
				</template>
			</UDrawer>

			<UDrawer :title="t('analyticsMobile.reportOptions')" :close="{ class: 'min-h-11 min-w-11 justify-center' }">
				<UButton color="neutral" variant="outline" icon="i-lucide-ellipsis" :label="t('analyticsMobile.reportOptions')" class="min-h-11" />
				<template #body>
					<div class="space-y-4 pb-[env(safe-area-inset-bottom)]">
						<div class="space-y-1">
							<UButton
								block
								variant="soft"
								icon="i-lucide-download"
								:label="t('analyticsMobile.exportCsv')"
								:loading="exporting"
								:disabled="loading || exporting || noResults"
								:aria-describedby="noResults ? emptyExportHintId : undefined"
								class="min-h-11"
								@click="emit('export')"
							/>
							<p v-if="noResults" :id="emptyExportHintId" class="text-sm text-muted">{{ t('analyticsMobile.noRowsToExport') }}</p>
							<p v-else-if="exporting" role="status" class="text-sm text-muted">{{ t('analyticsMobile.exporting') }}</p>
						</div>
						<div class="space-y-1.5 border-t border-default pt-4">
							<p class="text-sm font-medium">{{ t('catalogMobile.rowsPerPage') }}</p>
							<USelect
								:model-value="pageSize"
								:items="options_page_size"
								:aria-label="t('catalogMobile.rowsPerPage')"
								class="min-h-11 w-full"
								:disabled="loading"
								@update:model-value="emit('update:pageSize', $event)"
							/>
						</div>
						<fieldset class="border-t border-default pt-3">
							<legend class="px-1 text-sm font-medium">{{ t('analyticsMobile.visibleFields') }}</legend>
							<UCheckbox
								v-for="option in columnOptions"
								:key="option.key"
								:label="option.label"
								:model-value="selectedColumnKeys.includes(option.key)"
								:disabled="selectedColumnKeys.length === 1 && selectedColumnKeys.includes(option.key)"
								variant="card"
								class="mb-1 min-h-11"
								@update:model-value="toggleColumn(option.key, $event === true)"
							/>
						</fieldset>
					</div>
				</template>
			</UDrawer>
		</div>
		<p v-if="activeFilters.length" class="text-xs text-muted wrap-anywhere">{{ activeFilters.join(' · ') }}</p>
	</div>
</template>

<script lang="ts" setup>
import { subDays } from 'date-fns';
import { useMediaQuery } from '@vueuse/core';
import { OrderStatus, OrderItemStatus } from 'yeppi-common';
import { getOrderStatusOptions, getOrderItemStatusOptions, getPaymentStatusOptions, options_page_size } from '~/utils/options';
import type { AnalyticsReportFilters } from '~/composables/useAnalyticsReportControls';
import type { ColumnOption } from '~/utils/table-columns/visibility';

const props = defineProps<{
	filters: AnalyticsReportFilters;
	fields: (Exclude<keyof AnalyticsReportFilters, 'date_range' | 'currency_code'>)[];
	pageSize: number;
	columnOptions: ColumnOption[];
	loading: boolean;
	exporting: boolean;
	total: number;
}>();

const emit = defineEmits<{
	'applyFilters': [filters: AnalyticsReportFilters];
	'update:pageSize': [size: number];
	'export': [];
}>();

const selectedColumnKeys = defineModel<string[]>('selectedColumnKeys', { required: true });
const filtersOpen = defineModel<boolean>('filtersOpen', { required: true });
const draft = ref<AnalyticsReportFilters>({ ...props.filters, date_range: { ...props.filters.date_range } });
const { t, locale } = useI18n();
const emptyExportHintId = useId();
const desktop = useMediaQuery('(min-width: 1024px)', { ssrWidth: 1024 });
const orderStatusValues = Object.values(OrderStatus);
const itemStatusValues = Object.values(OrderItemStatus);
const noResults = computed(() => !props.loading && !props.exporting && props.total === 0);
const orderStatuses = computed(() => getOrderStatusOptions(t));
const itemStatuses = computed(() => getOrderItemStatusOptions(t));
const paymentStatuses = computed(() => [{ label: t('options.all'), value: 'All' as const }, ...getPaymentStatusOptions(t)]);

watch(filtersOpen, (open) => {
	if (open) draft.value = { ...props.filters, date_range: { ...props.filters.date_range } };
});

function resetDraft() {
	const today = new Date();
	draft.value.date_range = { start: subDays(today, 14), end: today };
	if (props.fields.includes('status')) draft.value.status = undefined;
	if (props.fields.includes('item_status')) draft.value.item_status = undefined;
	if (props.fields.includes('payment_status')) draft.value.payment_status = undefined;
	draft.value.currency_code = 'MYR';
}

const activeFilters = computed(() => {
	const { start, end } = props.filters.date_range;
	const year = new Date().getFullYear();
	const includeYear = [start, end].some((date) => date && date.getFullYear() !== year);
	const formatter = new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', year: includeYear ? 'numeric' : undefined });
	const date = start && end && start <= end
		? formatter.formatRange(start, end)
		: [start, end].filter((value) => value !== undefined).map((value) => formatter.format(value)).join(' – ');
	return [
		date,
		props.fields.includes('status') ? orderStatuses.value.find(({ value }) => value === props.filters.status)?.label : undefined,
		props.fields.includes('item_status') ? itemStatuses.value.find(({ value }) => value === props.filters.item_status)?.label : undefined,
		props.fields.includes('payment_status') ? paymentStatuses.value.find(({ value }) => value === props.filters.payment_status)?.label : undefined,
		props.filters.currency_code !== 'MYR' ? props.filters.currency_code : undefined,
	].filter(Boolean);
});

const filtersLabel = computed(() =>
	activeFilters.value.length
		? t('productMobileListing.filtersCount', { count: activeFilters.value.length })
		: t('portalMobile.filters'),
);

function toggleColumn(key: string, checked: boolean) {
	selectedColumnKeys.value = checked
		? [...new Set([...selectedColumnKeys.value, key])]
		: selectedColumnKeys.value.filter((selected) => selected !== key);
}
</script>
