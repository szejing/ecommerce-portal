<template>
	<ZPagePanel id="settings-shipping" :title="t('nav.shippingSettings')" back-to="/settings">
		<div class="space-y-4">
			<div class="space-y-1">
				<h2 class="text-3xl font-bold text-gray-900 dark:text-white">{{ t('nav.shippingSettings') }}</h2>
				<p class="text-gray-500 dark:text-gray-400">{{ t('pages.shippingSettingsDesc') }}</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<ZSettingsGroup
					v-for="group in shippingGroups"
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
useHead({ title: () => t('pages.shippingSettingsTitle') });

const shippingGroups = computed(() => [
	{
		title: t('pages.shippingMethods'),
		description: t('pages.shippingMethodsDesc'),
		icon: ICONS.ORDER,
		color: 'green' as const,
		items: [
			{ label: t('pages.couriers'), to: '/settings/shipping/couriers' },
			{ label: t('pages.shippingMethods'), to: '/settings/shipping/methods' },
			{ label: t('nav.shippingZones'), to: '/settings/shipping/zones' },
		],
	},
]);
</script>
