<template>
	<ZPagePanel id="products-categories-create" :title="t('pages.createCategory')" back-to="/products/categories">
		<div class="mx-auto max-w-3xl w-full min-w-0 px-0 py-0 sm:px-6 sm:py-8 lg:px-8">
			<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-8">
				<FormProductCategoryCreation />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
const { t } = useI18n();
const categoryStore = useProductCategoryStore();
const { new_category } = storeToRefs(categoryStore);

const isDirty = computed(() => {
	const c = new_category.value;
	return !!(c.code || c.description || c.thumbnail || c.parent_category);
});

useLeavePageGuard(isDirty);
</script>

<style scoped></style>
