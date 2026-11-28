<template>
	<UTable
		v-if="desktop"
		v-bind="$attrs"
		v-model:sorting="sorting"
		class="max-lg:hidden"
		:data="data"
		:columns="columns"
		:loading="loading"
	>
		<template #empty><slot name="empty" /></template>
	</UTable>

	<div v-else class="mobile-report min-w-0 lg:hidden" :aria-label="t('portalMobile.reportTable')" :aria-busy="loading" role="region">
		<div v-if="loading" class="space-y-3 p-3" role="status">
			<span class="sr-only">{{ t('common.loading') }}</span>
			<USkeleton v-for="index in 3" :key="index" class="h-16 w-full" />
		</div>
		<template v-else-if="!rows.length">
			<div v-if="emptyTitle" class="space-y-3 p-4 text-center">
				<p class="text-sm font-medium text-highlighted">{{ emptyTitle }}</p>
				<UButton color="neutral" variant="outline" :label="t('analyticsMobile.editFilters')" class="min-h-11" @click="emit('editFilters')" />
			</div>
			<slot v-else name="empty">
				<UEmpty :description="t('pages.tryAdjustingFilters')" />
			</slot>
		</template>
		<template v-else>
			<div v-if="sortOptions.length > 1" class="border-b border-default p-3">
				<USelect
					v-model="sortValue"
					:items="sortOptions"
					:aria-label="t('components.discountForm.sortBy')"
					class="min-h-11 w-full"
				/>
			</div>
			<ul class="divide-y divide-default">
				<li v-for="row in rows" :key="row.id" class="space-y-1 px-3 py-3">
					<dl class="grid grid-cols-2 gap-x-3 gap-y-2">
						<div
							v-for="cell in row.primary"
							:key="cell.id"
							class="min-w-0 wrap-anywhere"
							:class="{ 'col-span-full': cell === row.primary[0] }"
						>
							<dt class="text-xs text-muted">{{ labels.get(cell.column.id) }}</dt>
							<dd class="mt-0.5 min-w-0 text-sm text-default">
								<FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
							</dd>
						</div>
					</dl>
					<details v-if="row.secondary.length">
						<summary class="min-h-11 cursor-pointer py-3 text-sm font-medium text-primary focus-visible:outline-primary">
							{{ t('common.details') }}
						</summary>
						<dl class="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-default pt-2">
							<div v-for="cell in row.secondary" :key="cell.id" class="min-w-0 wrap-anywhere">
								<dt class="text-xs text-muted">{{ labels.get(cell.column.id) }}</dt>
								<dd class="mt-0.5 min-w-0 text-sm">
									<FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
								</dd>
							</div>
						</dl>
					</details>
				</li>
			</ul>
			<details v-if="footerCells.length" class="border-t border-default bg-elevated/50 px-3">
				<summary class="min-h-11 cursor-pointer py-3 text-sm font-semibold text-highlighted focus-visible:outline-primary">
					{{ t('pages.totalLabel') }}
				</summary>
				<dl class="grid grid-cols-2 gap-x-3 gap-y-2 pb-3">
					<div v-for="header in footerCells" :key="header.id" class="min-w-0 wrap-anywhere">
						<dt class="text-xs text-muted">{{ labels.get(header.column.id) }}</dt>
						<dd class="mt-0.5 min-w-0 text-sm">
							<FlexRender :render="header.column.columnDef.footer" :props="header.getContext()" />
						</dd>
					</div>
				</dl>
			</details>
		</template>
	</div>
</template>

<script setup lang="ts" generic="T">
import type { TableColumn } from '@nuxt/ui';
import { FlexRender, getCoreRowModel, getSortedRowModel, useVueTable, type SortingState } from '@tanstack/vue-table';
import { useMediaQuery } from '@vueuse/core';
import type { ColumnOption } from '~/utils/table-columns/visibility';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
	data: T[];
	columns: TableColumn<T>[];
	columnOptions: ColumnOption[];
	primaryKeys: string[];
	sortableKeys?: string[];
	loading?: boolean;
	emptyTitle?: string;
}>();

const emit = defineEmits<{ editFilters: [] }>();
const { t } = useI18n();
const desktop = useMediaQuery('(min-width: 1024px)', { ssrWidth: 1024 });
const sorting = ref<SortingState>([]);
const table = useVueTable<T>({
	get data() { return props.data; },
	get columns() { return props.columns; },
	state: { get sorting() { return sorting.value; } },
	getCoreRowModel: getCoreRowModel(),
	getSortedRowModel: getSortedRowModel(),
});

const labels = computed(() => new Map(props.columnOptions.map(({ key, label }) => [key, label])));
const rows = computed(() => table.getRowModel().rows.map((row) => {
	const cells = row.getVisibleCells();
	const primary = props.primaryKeys.flatMap((key) => cells.filter((cell) => cell.column.id === key));
	return {
		id: row.id,
		primary: primary.length ? primary : cells.slice(0, 1),
		secondary: primary.length ? cells.filter((cell) => !primary.includes(cell)) : cells.slice(1),
	};
}));

const footerCells = computed(() => table.getFooterGroups().flatMap((group) =>
	group.headers.filter((header) => !header.isPlaceholder && header.column.id !== 'biz_date' && header.column.columnDef.footer),
));

const sortOptions = computed(() => [
	{ label: t('components.discountForm.sortBy'), value: 'default' },
	...table.getVisibleLeafColumns()
		.filter((column) => props.sortableKeys?.includes(column.id) && column.getCanSort())
		.flatMap((column) => [
			{ label: `${labels.value.get(column.id)} · ${t('components.discountForm.sortAscending')}`, value: `${column.id}:asc` },
			{ label: `${labels.value.get(column.id)} · ${t('components.discountForm.sortDescending')}`, value: `${column.id}:desc` },
		]),
]);

const sortValue = computed({
	get: () => {
		const [sort] = sorting.value;
		const value = sort ? `${sort.id}:${sort.desc ? 'desc' : 'asc'}` : 'default';
		return sortOptions.value.some((option) => option.value === value) ? value : 'default';
	},
	set: (value: string) => {
		const [id, direction] = value.split(':');
		sorting.value = id && direction ? [{ id, desc: direction === 'desc' }] : [];
	},
});
</script>

<style scoped>
.mobile-report :deep(.text-right) {
	text-align: start;
}

.mobile-report :deep(.whitespace-nowrap) {
	white-space: normal;
}
</style>
