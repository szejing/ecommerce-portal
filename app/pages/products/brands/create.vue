<template>
	<ZPagePanel id="products-brands-create" :title="t('pages.createBrand')" back-to="/products/brands">
		<div class="mx-auto max-w-3xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
			<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
				<FormProductBrandCreation />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
const { t } = useI18n();
const brandStore = useBrandStore();
const { new_brand } = storeToRefs(brandStore);

const isDirty = computed(() => {
	const b = new_brand.value;
	return !!(b.code || b.description);
});

useLeavePageGuard(isDirty);
</script>

<style scoped></style>
