<template>
	<ZPagePanel id="settings-payment" :title="t('pages.paymentManagement')" back-to="/settings">
		<div class="space-y-4">
			<!-- Header Section -->
			<div class="space-y-2">
				<h2 class="text-3xl font-bold text-gray-900 dark:text-white">{{ t('pages.paymentManagement') }}</h2>
				<p class="text-gray-600 dark:text-gray-400">{{ t('pages.paymentManagementDesc') }}</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<ZSettingsGroup
					v-for="group in paymentGroups"
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
useHead({ title: () => t('pages.paymentTitle') });

const paymentGroups = computed(() => [
	{
		title: t('pages.paymentConfiguration'),
		description: t('pages.paymentConfigurationDesc'),
		icon: ICONS.PAYMENT_METHODS,
		color: 'green' as const,
		items: [{ label: t('pages.paymentMethod'), to: '/settings/payment/methods' }],
	},
]);
</script>
