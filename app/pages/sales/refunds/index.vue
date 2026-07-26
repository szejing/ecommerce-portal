<template>
	<ZPagePanel id="sales-refunds" :title="t('nav.refunds')">
		<div class="space-y-4">
			<h2 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ t('nav.refunds') }}</h2>
			<p class="text-gray-600 dark:text-gray-400">{{ t('pages.comingSoon') || 'Coming soon' }}</p>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
const { t } = useI18n();
useHead({ title: () => t('nav.refunds') });
</script>
