<template>
	<ZPagePanel id="products" :title="t('pages.servicesProductsManagement')">
		<div class="space-y-4">
			<div class="space-y-1">
				<h2 class="text-3xl font-bold text-gray-900 dark:text-white">{{ t('pages.servicesProductsManagement') }}</h2>
				<p class="text-gray-500 dark:text-gray-400">{{ t('pages.servicesProductsManagementDesc') }}</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<ZSettingsGroup
					v-for="group in productGroups"
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
useHead({ title: () => t('pages.productsTitle') });

const productGroups = computed(() => [
	{
		title: t('pages.servicesProducts'),
		description: t('pages.servicesProductsDesc'),
		icon: ICONS.LIST,
		color: 'teal' as const,
		items: [{ label: t('pages.servicesProducts'), to: '/products/listing' }],
	},
	{
		title: t('pages.productAttributes'),
		description: t('pages.productAttributesDesc'),
		icon: ICONS.ADDITIONAL,
		color: 'purple' as const,
		items: [
			{ label: t('nav.categories'), to: '/products/categories' },
			{ label: t('nav.tags'), to: '/products/tags' },
			{ label: t('nav.brands'), to: '/products/brands' },
		],
	},
]);
</script>
