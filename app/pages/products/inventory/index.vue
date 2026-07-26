<template>
	<ZPagePanel id="products-inventory" :title="t('nav.inventory')" back-to="/products">
		<div class="space-y-4">
			<h2 class="text-2xl font-semibold text-gray-900 dark:text-white">{{ t('nav.inventory') }}</h2>
			<p class="text-gray-600 dark:text-gray-400">{{ t('pages.comingSoon') || 'Coming soon' }}</p>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
const { t } = useI18n();
useHead({ title: () => t('nav.inventory') });
</script>
