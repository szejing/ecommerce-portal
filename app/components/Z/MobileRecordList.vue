<template>
	<section ref="list" class="min-w-0 lg:hidden" :aria-label="label" :aria-busy="loading">
		<div v-if="loading" class="space-y-3 py-2" role="status">
			<span class="sr-only">{{ t('common.loading') }}</span>
			<USkeleton v-for="index in 3" :key="index" class="h-14 w-full" />
		</div>
		<UEmpty v-else-if="!items.length" :title="emptyTitle" :description="t('pages.tryAdjustingFilters')" />
		<ul v-else class="divide-y divide-default border-y border-default">
			<li v-for="item in items" :key="String(item[itemKey])">
				<slot :item="item" />
			</li>
		</ul>
	</section>
</template>

<script lang="ts" setup generic="T">
const props = defineProps<{
	items: T[];
	itemKey: keyof T;
	label: string;
	emptyTitle: string;
	loading: boolean;
	recordPathPrefix?: string;
}>();

defineSlots<{ default(props: { item: T }): unknown }>();

const { t } = useI18n();
const list = useTemplateRef<HTMLElement>('list');
const restoreScroll = useMobileListScroll(
	`mobile-record-list:${props.recordPathPrefix}`,
	list,
	(path) => {
		const prefix = props.recordPathPrefix;
		if (!prefix || !path.startsWith(prefix)) return false;
		const record = path.slice(prefix.length);
		return Boolean(record && !record.includes('/') && !['create', 'tiers'].includes(record));
	},
);
watch(() => props.loading, (loading) => {
	if (!loading) void restoreScroll();
}, { immediate: true });
</script>
