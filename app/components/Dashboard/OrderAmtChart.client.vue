<template>
	<UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
		<template #header>
			<div>
				<p class="text-xs text-muted uppercase">{{ t('components.dashboard.revenue') }}</p>
				<p class="mt-2 text-3xl text-highlighted font-semibold">
					{{ formatCurrency(total, 'MYR') }}
				</p>
			</div>
		</template>

		<VisXYContainer :data="data" :padding="{ top: 40 }" class="h-96" :width="width">
			<VisLine :x="x" :y="y" color="var(--ui-primary)" />
			<VisArea :x="x" :y="y" color="var(--ui-primary)" :opacity="0.1" />

			<VisAxis type="x" :x="x" :tick-format="xTicks" />

			<VisCrosshair color="var(--ui-primary)" :template="template" />

			<VisTooltip />
		</VisXYContainer>
	</UCard>
</template>

<script setup lang="ts">
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue';
import { getFormattedDate, parseDate, formatCurrency } from 'yeppi-common';
import type { DataRecord } from '~/utils/types/chart-data';

const { t } = useI18n();

const cardRef = useTemplateRef<HTMLElement | null>('cardRef');
const { width } = useElementSize(cardRef);

const summOrderStore = useSummOrderStore();
const { daily_summaries } = storeToRefs(summOrderStore);

const data = computed(() => {
	return daily_summaries.value.map((summary) => ({
		date: summary.summ_order.biz_date,
		amount: summary.summ_order.total_net_amt,
	}));
});

const x = (_: DataRecord, i: number) => i;
const y = (d: DataRecord) => d.amount;

const total = computed(() => data.value.reduce((acc: number, { amount }) => acc + amount, 0));

const xTicks = (i: number) => {
	if (i === 0 || i === data.value.length - 1 || !data.value[i]) {
		return '';
	}

	return getFormattedDate(parseDate(data.value[i].date), 'dd MMM yyyy');
};

const template = (d: DataRecord) => `${getFormattedDate(d.date)}: ${formatCurrency(d.amount)}`;
</script>

<style scoped>
.unovis-xy-container {
	--vis-crosshair-line-stroke-color: var(--ui-primary);
	--vis-crosshair-circle-stroke-color: var(--ui-bg);

	--vis-axis-grid-color: var(--ui-border);
	--vis-axis-tick-color: var(--ui-border);
	--vis-axis-tick-label-color: var(--ui-text-dimmed);

	--vis-tooltip-background-color: var(--ui-bg);
	--vis-tooltip-border-color: var(--ui-border);
	--vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
