<template>
	<ZPagePanel id="analytics" :title="t('nav.analytics')">
		<div class="space-y-4">
			<div class="space-y-2">
				<h2 class="text-3xl font-bold text-gray-900 dark:text-white">{{ t('pages.analyticsDashboard') }}</h2>
				<p class="text-gray-500 dark:text-gray-400">{{ t('pages.analyticsDashboardDesc') }}</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<ZSettingsGroup
					v-for="group in analyticsGroups"
					:key="group.title"
					:title="group.title"
					:description="group.description"
					:icon="group.icon"
					:color="group.color"
					:items="group.items"
				/>
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
useHead({ title: () => t('pages.analyticsTitle') });

const analyticsGroups = computed(() => [
	{
		title: t('pages.orderAnalytics'),
		description: t('pages.orderAnalyticsDesc'),
		icon: ICONS.REPORT_ORDER,
		color: 'blue' as const,
		items: [
			{ label: t('pages.orderSummary'), to: '/analytics/orders/summary' },
			{ label: t('pages.orderItem'), to: '/analytics/orders/items' },
			{ label: t('pages.orderCustomer'), to: '/analytics/orders/customers' },
		],
	},
	{
		title: t('pages.salesAnalytics'),
		description: t('pages.salesAnalyticsDesc'),
		icon: ICONS.REPORT_SALES,
		color: 'green' as const,
		items: [
			{ label: t('pages.salesSummary'), to: '/analytics/sales/summary' },
			{ label: t('pages.salesItems'), to: '/analytics/sales/items' },
			{ label: t('pages.salesPayment'), to: '/analytics/sales/payments' },
			{ label: t('pages.salesCustomer'), to: '/analytics/sales/customers' },
		],
	},
	{
		title: t('pages.googleAnalytics.title'),
		description: t('pages.googleAnalytics.description'),
		icon: ICONS.ANALYTICS,
		color: 'orange' as const,
		items: [
			{
				label: t('pages.googleAnalytics.manage'),
				to: '/analytics/google-analytics',
			},
		],
	},
]);
</script>
