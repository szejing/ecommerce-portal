<template>
	<ZPagePanel id="analytics-sales" :title="t('nav.analytics')" back-to="/analytics">
		<div class="flex flex-col gap-8 lg:gap-10">
			<!-- Title + date -->
			<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
				<div class="min-w-0 space-y-1.5">
					<h2 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">{{ t('pages.salesAnalytics') }}</h2>
					<p class="max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{{ t('pages.salesDashboardDesc') }}</p>
				</div>
				<div class="w-full max-w-md shrink-0 lg:w-auto lg:max-w-none">
					<p class="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{{ t('pages.salesAnalyticsDateRange') }}</p>
					<ZDateRange v-model="range" @update:model-value="onRangeChange" />
				</div>
			</div>

			<!-- Quick links -->
			<section aria-labelledby="sales-analytics-reports-heading" class="space-y-3">
				<div>
					<h3 id="sales-analytics-reports-heading" class="text-sm font-semibold text-highlighted">
						{{ t('pages.salesAnalyticsSectionReports') }}
					</h3>
					<p class="text-xs text-muted">{{ t('pages.salesAnalyticsSectionReportsHint') }}</p>
				</div>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<NuxtLink
						v-for="link in salesReportLinks"
						:key="link.to"
						:to="{ path: link.to, query: formatRangeQuery(range) }"
						class="group flex flex-col gap-2 rounded-lg border border-default bg-default/40 p-4 transition-all hover:border-primary/40 hover:bg-elevated/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
					>
						<div class="flex items-start justify-between gap-2">
							<div class="flex size-10 shrink-0 items-center justify-center rounded-lg" :class="link.iconWrapClass">
								<UIcon :name="link.icon" class="size-5" :class="link.iconClass" />
							</div>
							<UIcon
								name="i-heroicons-chevron-right-20-solid"
								class="size-4 shrink-0 text-dimmed opacity-60 transition-opacity group-hover:text-primary group-hover:opacity-100"
							/>
						</div>
						<div class="min-w-0">
							<p class="font-semibold text-highlighted group-hover:text-primary">{{ link.title }}</p>
							<p class="mt-0.5 line-clamp-2 text-xs leading-snug text-muted">{{ link.description }}</p>
						</div>
					</NuxtLink>
				</div>
			</section>

			<!-- KPIs -->
			<section aria-labelledby="sales-analytics-overview-heading" class="space-y-4">
				<h3 id="sales-analytics-overview-heading" class="text-sm font-semibold text-highlighted">
					{{ t('pages.salesAnalyticsSectionOverview') }}
				</h3>
				<ZDashboardStats :stats="salesStats" />
			</section>

			<!-- Chart -->
			<section aria-labelledby="sales-analytics-trend-heading" class="space-y-4">
				<h3 id="sales-analytics-trend-heading" class="text-sm font-semibold text-highlighted">
					{{ t('pages.salesAnalyticsSectionTrend') }}
				</h3>
				<UCard ref="chartCardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
					<template #header>
						<div class="space-y-1">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<p class="text-xs font-medium uppercase tracking-wide text-muted">{{ t('components.dashboard.revenue') }}</p>
									<p class="mt-0.5 text-sm text-muted">{{ t('pages.salesDashboardChartSubtitle') }}</p>
								</div>
								<p class="text-2xl font-semibold tabular-nums text-highlighted sm:text-right sm:text-3xl">
									{{ formatCurrency(chartTotal, primaryCurrency) }}
								</p>
							</div>
						</div>
					</template>
					<ClientOnly>
						<VisXYContainer :data="chartData" :padding="{ top: 40 }" class="h-72 sm:h-80" :width="chartWidth">
							<VisLine :x="chartX" :y="chartY" color="var(--ui-primary)" />
							<VisArea :x="chartX" :y="chartY" color="var(--ui-primary)" :opacity="0.1" />
							<VisAxis type="x" :x="chartX" :tick-format="chartXTicks" />
							<VisCrosshair color="var(--ui-primary)" :template="chartTooltipTemplate" />
							<VisTooltip />
						</VisXYContainer>
						<template #fallback>
							<div class="flex h-72 items-center justify-center text-muted sm:h-80">
								<UIcon name="i-heroicons-chart-bar" class="size-12 opacity-50" />
							</div>
						</template>
					</ClientOnly>
				</UCard>
			</section>

			<!-- Top lists -->
			<section aria-labelledby="sales-analytics-highlights-heading" class="space-y-4">
				<h3 id="sales-analytics-highlights-heading" class="text-sm font-semibold text-highlighted">
					{{ t('pages.salesAnalyticsSectionHighlights') }}
				</h3>
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<UCard>
						<template #header>
							<div class="flex items-center gap-2">
								<UIcon name="i-heroicons-cube" class="size-5 text-primary" />
								<h4 class="font-semibold text-highlighted">{{ t('pages.salesDashboardTopProducts') }}</h4>
							</div>
						</template>
						<div v-if="top_purchased_products.length === 0" class="py-8 text-center text-sm text-muted">
							{{ t('pages.salesDashboardNoData') }}
						</div>
						<ul v-else class="divide-y divide-border">
							<li
								v-for="(product, i) in top_purchased_products.slice(0, 8)"
								:key="product.prod_code"
								class="flex items-center justify-between gap-3 py-3 first:pt-0"
							>
								<div class="flex min-w-0 items-center gap-3">
									<span class="w-6 shrink-0 text-xs font-medium text-muted">{{ i + 1 }}</span>
									<span class="truncate font-medium text-highlighted">{{ product.prod_name }}</span>
								</div>
								<div class="flex shrink-0 items-center gap-2 text-sm">
									<span class="text-muted">{{ product.total_qty }} {{ t('table.qty') }}</span>
									<span class="font-medium">{{ formatCurrency(product.total_net_amt, 'MYR') }}</span>
								</div>
							</li>
						</ul>
					</UCard>

					<UCard>
						<template #header>
							<div class="flex items-center gap-2">
								<UIcon name="i-heroicons-users" class="size-5 text-primary" />
								<h4 class="font-semibold text-highlighted">{{ t('pages.salesDashboardTopCustomers') }}</h4>
							</div>
						</template>
						<div v-if="top_purchased_customers.length === 0" class="py-8 text-center text-sm text-muted">
							{{ t('pages.salesDashboardNoData') }}
						</div>
						<ul v-else class="divide-y divide-border">
							<li
								v-for="(customer, i) in top_purchased_customers.slice(0, 8)"
								:key="customer.customer_no"
								class="flex items-center justify-between gap-3 py-3 first:pt-0"
							>
								<div class="flex min-w-0 items-center gap-3">
									<span class="w-6 shrink-0 text-xs font-medium text-muted">{{ i + 1 }}</span>
									<span class="truncate font-medium text-highlighted">{{ customer.customer_name }}</span>
								</div>
								<div class="flex shrink-0 items-center gap-2 text-sm">
									<span class="text-muted">{{ customer.total_orders }} {{ t('pages.ordersLabel') }}</span>
									<span class="font-medium">{{ formatCurrency(customer.total_spent, 'MYR') }}</span>
								</div>
							</li>
						</ul>
					</UCard>
				</div>
			</section>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue';
import { getFormattedDate, parseDate, formatCurrency } from 'yeppi-common';
import { sub } from 'date-fns';
import type { Range } from '~/utils/interface';

const { t } = useI18n();
useHead({ title: () => t('pages.analyticsTitle') });

const summSaleStore = useSummSaleStore();
const { daily_summaries, top_purchased_customers, top_purchased_products } = storeToRefs(summSaleStore);

const range = shallowRef<Range>({
	start: sub(new Date(), { days: 7 }),
	end: new Date(),
});

const chartCardRef = useTemplateRef<HTMLElement | null>('chartCardRef');
const { width: chartWidth } = useElementSize(chartCardRef);

// Support both summ_order (orders API) and summ_sale/summ_sale_item (sales API) shapes
function getDailyChartPoint(s: (typeof daily_summaries.value)[number]) {
	const rec = s as {
		biz_date?: string;
		summ_order?: { biz_date: string; total_net_amt: number; currency_code?: string };
		summ_sale?: { biz_date: string; total_net_amt?: number; currency_code?: string };
		summ_sale_item?: { total_net_amt: number; currency_code?: string };
	};
	const date = rec.biz_date ?? rec.summ_order?.biz_date ?? rec.summ_sale?.biz_date ?? '';
	const amount = rec.summ_order?.total_net_amt ?? rec.summ_sale?.total_net_amt ?? rec.summ_sale_item?.total_net_amt ?? 0;
	return { date, amount };
}

const chartData = computed(() => daily_summaries.value.map(getDailyChartPoint));

const primaryCurrency = computed(() => {
	const first = daily_summaries.value[0];
	if (!first) return 'MYR';
	const rec = first as {
		summ_order?: { currency_code?: string };
		summ_sale?: { currency_code?: string };
		summ_sale_item?: { currency_code?: string };
	};
	return rec.summ_order?.currency_code ?? rec.summ_sale?.currency_code ?? rec.summ_sale_item?.currency_code ?? 'MYR';
});

const chartTotal = computed(() => chartData.value.reduce((acc, d) => acc + d.amount, 0));

const totalQtySum = computed(() =>
	daily_summaries.value.reduce((acc, s) => {
		const rec = s as { summ_order?: { total_qty: number }; summ_sale?: { total_qty: number }; summ_sale_item?: { total_qty: number } };
		const n = rec.summ_order?.total_qty ?? rec.summ_sale?.total_qty ?? rec.summ_sale_item?.total_qty ?? 0;
		return acc + n;
	}, 0),
);

function formatRangeQuery(r: Range) {
	return {
		start_date: r.start ? getFormattedDate(r.start, 'yyyy-MM-dd') : undefined,
		end_date: r.end ? getFormattedDate(r.end, 'yyyy-MM-dd') : undefined,
	};
}

const salesStats = computed(() => {
	const q = formatRangeQuery(range.value);
	return [
		{
			title: t('pages.salesDashboardTotalSales'),
			value: formatCurrency(chartTotal.value, primaryCurrency.value),
			icon: 'i-heroicons-banknotes',
			iconBg: 'bg-green-500/10',
			iconColor: 'text-green-600 dark:text-green-400',
			to: { path: '/analytics/sales/summary', query: q },
		},
		{
			title: t('pages.salesDashboardTotalQty'),
			value: totalQtySum.value,
			icon: 'i-heroicons-cube',
			iconBg: 'bg-secondary/10',
			iconColor: 'text-secondary',
			to: { path: '/analytics/sales/items', query: q },
		},
		{
			title: t('pages.salesDashboardTopProducts'),
			value: top_purchased_products.value.length,
			icon: 'i-heroicons-squares-2x2',
			iconBg: 'bg-amber-500/10',
			iconColor: 'text-amber-600 dark:text-amber-400',
			to: { path: '/analytics/sales/items', query: q },
		},
	];
});

const chartX = (_: { date: string; amount: number }, i: number) => i;
const chartY = (d: { date: string; amount: number }) => d.amount;

const chartXTicks = (i: number) => {
	if (i === 0 || i === chartData.value.length - 1 || !chartData.value[i]) return '';
	return getFormattedDate(parseDate(chartData.value[i].date), 'dd MMM yyyy');
};

const chartTooltipTemplate = (d: { date: string; amount: number }) =>
	`${getFormattedDate(parseDate(d.date), 'dd MMM yyyy')}: ${formatCurrency(d.amount, primaryCurrency.value)}`;

async function onRangeChange(newValue: Range) {
	range.value = newValue;
	await summSaleStore.getDashboardSummary(newValue);
}

const salesReportLinks = computed(() => [
	{
		title: t('pages.salesSummary'),
		to: '/analytics/sales/summary',
		description: t('pages.salesSummaryDesc'),
		icon: 'i-heroicons-chart-bar-square-20-solid',
		iconWrapClass: 'bg-primary/10',
		iconClass: 'text-primary',
	},
	{
		title: t('pages.salesItems'),
		to: '/analytics/sales/items',
		description: t('pages.salesItemsDesc'),
		icon: 'i-heroicons-cube-20-solid',
		iconWrapClass: 'bg-secondary/10',
		iconClass: 'text-secondary',
	},
	{
		title: t('pages.salesPayment'),
		to: '/analytics/sales/payments',
		description: t('pages.salesPaymentDesc'),
		icon: 'i-heroicons-banknotes',
		iconWrapClass: 'bg-amber-500/10',
		iconClass: 'text-amber-600 dark:text-amber-400',
	},
	{
		title: t('pages.salesCustomer'),
		to: '/analytics/sales/customers',
		description: t('pages.salesCustomerDesc'),
		icon: 'i-heroicons-users-20-solid',
		iconWrapClass: 'bg-violet-500/10',
		iconClass: 'text-violet-600 dark:text-violet-400',
	},
]);

onMounted(() => {
	summSaleStore.getDashboardSummary(range.value);
});
</script>

<style scoped>
:deep(.unovis-xy-container) {
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
