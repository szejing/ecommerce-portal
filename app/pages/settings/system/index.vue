<template>
	<ZPagePanel id="settings-system" :title="t('nav.systemSettings')" back-to="/settings">
		<div class="space-y-3 lg:space-y-4">
			<div class="space-y-1">
				<h2 class="sr-only font-bold lg:not-sr-only lg:text-3xl text-gray-900 dark:text-white">{{ t('nav.systemSettings') }}</h2>
				<p class="text-sm text-muted lg:text-base">{{ t('pages.systemSettingsDesc') }}</p>
			</div>

			<div class="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-6">
				<ZSettingsGroup
					v-for="group in systemGroups"
					:key="group.title"
					:title="group.title"
					:description="group.description"
					:icon="group.icon"
					:color="group.color"
					:items="group.items"
					compact-on-mobile
				/>
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const appUiStore = useAppUiStore();
useHead({ title: () => t('pages.systemSettingsTitle') });

const filterAllowedItems = (items: Array<{ labelKey: string; to: string }>) =>
	items
		.filter((item) => !appUiStore.excludeRoutes.includes(item.to) && !appUiStore.excludeRoutes.includes(item.labelKey))
		.map((item) => ({ label: t(item.labelKey), to: item.to }));

const systemGroups = computed(() => [
	{
		title: t('nav.systemSettings'),
		description: t('pages.settingsMenuDesc'),
		icon: ICONS.SETTINGS_ROUNDED,
		color: 'slate' as const,
		items: filterAllowedItems([
			{ labelKey: 'nav.configuration', to: '/settings/configuration' },
			{ labelKey: 'nav.reasons', to: '/settings/reasons' },
			{ labelKey: 'nav.activityLogs', to: '/settings/system/activity-logs' },
		]),
	},
]);
</script>
