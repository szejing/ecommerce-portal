<template>
	<ZPagePanel id="products-categories-create" :title="t('pages.createOption')" back-to="/products/options">
		<div class="mx-auto max-w-3xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
			<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
				<FormProductOptionCreation />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
const { t } = useI18n();</script>

<style scoped></style>
