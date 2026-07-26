<template>
	<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex min-w-0 items-center gap-3">
			<div class="flex size-9 shrink-0 items-center justify-center rounded-md border border-default bg-default">
				<Icon name="i-heroicons-calendar-days" class="text-base text-muted" />
			</div>
			<div class="min-w-0">
				<p class="text-xs font-medium uppercase tracking-wide text-muted">{{ t('table.bizDate') }}</p>
				<p class="truncate text-sm font-semibold text-highlighted">{{ getFormattedDate(new Date(date)) }}</p>
			</div>
		</div>

		<div class="grid w-full grid-cols-3 divide-x divide-default sm:flex sm:w-auto sm:justify-end">
			<div class="flex flex-col px-3 first:pl-0 last:pr-0 sm:px-4">
				<span class="text-xs text-muted">{{ primaryStatLabel }}</span>
				<span class="text-sm font-semibold tabular-nums text-highlighted">{{ primaryCount }}</span>
			</div>
			<div class="flex flex-col px-3 first:pl-0 last:pr-0 sm:px-4">
				<span class="text-xs text-muted">{{ t('table.totalItems') }}</span>
				<span class="text-sm font-semibold tabular-nums text-highlighted">{{ totalItems }}</span>
			</div>
			<div class="flex flex-col px-3 first:pl-0 last:pr-0 sm:px-4">
				<span class="text-xs text-muted">{{ t('table.netAmt') }}</span>
				<span class="text-sm font-semibold tabular-nums text-primary">{{ formatCurrency(netAmt, currencyCode) }}</span>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { formatCurrency, getFormattedDate } from 'yeppi-common';
import { computed } from 'vue';

const { t } = useI18n();

const props = defineProps<{
	date: string;
	primaryCount: number;
	primaryStatLabel: string;
	activeQty: number;
	voidedQty: number;
	netAmt: number;
	currencyCode: string;
}>();

const totalItems = computed(() => props.activeQty + props.voidedQty);
</script>
