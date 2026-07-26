<template>
	<ZPagePanel id="marketing" :title="t('nav.marketing')">
		<div class="space-y-4">
			<div class="space-y-1">
				<h2 class="text-3xl font-bold text-gray-900 dark:text-white">{{ t('pages.marketingManagement') }}</h2>
				<p class="text-gray-500 dark:text-gray-400">{{ t('pages.marketingManagementDesc') }}</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<ZSettingsGroup
					v-for="group in marketingGroups"
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
useHead({ title: () => t('pages.marketingTitle') });

const marketingGroups = computed(() => [
	{
		title: t('pages.marketingPromotions'),
		description: t('pages.marketingPromotionsDesc'),
		icon: ICONS.SPARKLES,
		color: 'teal' as const,
		items: [
			// { label: t('nav.discounts'), to: '/marketing/discounts' },
			{ label: t('nav.shopVouchers'), to: '/marketing/vouchers/shop' },
			{ label: t('nav.productVouchers'), to: '/marketing/vouchers/product' },
		],
	},
	{
		title: t('pages.marketingPartners'),
		description: t('pages.marketingPartnersDesc'),
		icon: ICONS.CUSTOMER_GROUP_ROUNDED,
		color: 'purple' as const,
		items: [{ label: t('nav.affiliates'), to: '/marketing/affiliates' }],
	},
]);
</script>
