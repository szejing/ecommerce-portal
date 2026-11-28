<template>
	<UPagination
		v-model:page="page"
		:items-per-page="itemsPerPage"
		:total="total"
		:disabled="disabled"
		class="hidden lg:block"
		v-bind="$attrs"
	/>
	<nav v-if="pageCount > 1 || page > 1" :aria-label="t('portalMobile.pagination')" class="flex min-w-0 flex-wrap items-center gap-2 lg:hidden">
		<UButton
			color="neutral"
			variant="outline"
			:label="t('portalMobile.previous')"
			:disabled="disabled || page <= 1"
			class="min-h-11"
			@click="page--"
		/>
		<span class="text-center text-sm text-muted" aria-live="polite">{{ t('portalMobile.pageCount', { page, total: pageCount }) }}</span>
		<UButton
			color="neutral"
			variant="outline"
			:label="t('portalMobile.next')"
			:disabled="disabled || page >= pageCount"
			class="min-h-11"
			@click="page++"
		/>
	</nav>
</template>

<script lang="ts" setup>
defineOptions({ inheritAttrs: false });

const props = defineProps<{
	itemsPerPage: number;
	total: number;
	disabled?: boolean;
}>();
const page = defineModel<number>('page', { default: 1 });
const { t } = useI18n();
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.itemsPerPage)));
</script>
