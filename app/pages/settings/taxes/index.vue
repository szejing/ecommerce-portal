<template>
	<ZPagePanel id="taxes" :title="t('pages.taxManagement')" back-to="/settings">
		<div class="space-y-3 lg:space-y-4">
			<!-- Header Section -->
			<div class="space-y-2">
				<h2 class="sr-only font-bold lg:not-sr-only lg:text-3xl text-gray-900 dark:text-white">{{ t('pages.taxManagement') }}</h2>
				<p class="text-sm text-muted lg:text-base">{{ t('pages.taxManagementDesc') }}</p>
			</div>

			<div class="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-6">
				<ZSettingsGroup
					v-for="group in taxGroups"
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
useHead({ title: () => t('pages.taxesTitle') });

const taxGroups = computed(() => [
	{
		title: t('pages.taxConfiguration'),
		description: t('pages.taxConfigurationDesc'),
		icon: ICONS.TAX,
		color: 'red' as const,
		items: [
			{ label: t('nav.taxCodes'), to: '/settings/taxes/codes' },
			{ label: t('nav.taxRules'), to: '/settings/taxes/rules' },
		],
	},
]);
</script>
