<template>
	<ZPagePanel id="settings-roles-permissions" :title="t('nav.rolesPermissions')" back-to="/settings">
		<div class="space-y-4">
			<h2 class="sr-only font-semibold lg:not-sr-only lg:text-2xl text-gray-900 dark:text-white">{{ t('nav.rolesPermissions') }}</h2>
			<p class="text-gray-600 dark:text-gray-400">{{ t('pages.comingSoon') || 'Coming soon' }}</p>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
const { t } = useI18n();
useHead({ title: () => t('nav.rolesPermissions') });
</script>
