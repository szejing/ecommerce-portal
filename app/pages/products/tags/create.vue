<template>
	<ZPagePanel id="products-tags-create" :title="t('pages.createTag')" back-to="/products/tags">
		<div class="mx-auto max-w-3xl w-full min-w-0 px-0 py-0 sm:px-6 sm:py-8 lg:px-8">
			<div class="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-8">
				<FormProductTagCreation />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
const { t } = useI18n();
const tagStore = useProductTagStore();
const { new_tag } = storeToRefs(tagStore);

const isDirty = computed(() => !!new_tag.value.value);

useLeavePageGuard(isDirty);
</script>

<style scoped></style>
