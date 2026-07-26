<template>
	<div class="space-y-2">
		<div
			class="flex w-full min-h-10 items-start gap-2 rounded-md border border-default bg-default px-2 py-1.5 text-sm shadow-sm transition-colors"
			:class="hasCondition ? 'cursor-pointer hover:bg-elevated/50' : 'cursor-not-allowed opacity-60'"
			role="button"
			:tabindex="hasCondition ? 0 : -1"
			:aria-disabled="!hasCondition"
			@click="openPicker"
			@keydown.enter.prevent="openPicker"
			@keydown.space.prevent="openPicker"
		>
			<div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
				<UBadge
					v-for="val in currentSelectedValues"
					:key="val"
					color="primary"
					variant="solid"
					size="md"
					class="max-w-full shrink-0 truncate font-medium shadow-sm"
				>
					{{ val }}
				</UBadge>
				<span v-if="hasCondition && currentSelectedValues.length === 0" class="px-1 py-0.5 text-muted">
					{{ t('common.notSet') }}
				</span>
				<span v-if="!hasCondition" class="px-1 py-0.5 text-muted">
					{{ t('components.discountForm.selectFilterConditionFirst') }}
				</span>
			</div>
			<UButton
				color="neutral"
				variant="ghost"
				size="xs"
				class="shrink-0"
				icon="i-lucide-search"
				:label="t('components.discountForm.openFilterValuePicker')"
				:disabled="!hasCondition"
				@click.stop="openPicker"
			/>
		</div>

		<div class="flex items-center justify-between gap-3">
			<UBadge color="neutral" variant="outline" size="md" class="tabular-nums shrink-0 font-medium">
				{{ selectedCountLabel }}
			</UBadge>
			<UButton
				v-if="hasCondition && currentSelectedValues.length > 0"
				color="neutral"
				variant="ghost"
				size="xs"
				:label="t('components.filter.clear')"
				@click="clearSelection"
			/>
		</div>
	</div>

	<UModal
		v-model:open="pickerOpen"
		:title="t('components.discountForm.filterValuePickerTitle', { entity: entityLabel })"
		:description="pickerModalDescription"
		:ui="pickerModalUi"
	>
		<template #body>
			<!-- Nested category tree (same pattern as Z/Modal/Category/Picker.vue) -->
			<div v-if="isCategoryTreeMode" class="space-y-4">
				<div class="flex items-center justify-between gap-3">
					<UInput v-model="categorySearchTerm" :placeholder="t('components.zModal.categoryPicker.searchPlaceholder')" class="max-w-xs" size="md">
						<template #leading>
							<UIcon :name="ICONS.SEARCH_ROUNDED" class="size-4 text-muted" />
						</template>
					</UInput>
				</div>

				<div v-if="draftSelectedValues.length > 0" class="flex flex-wrap gap-2">
					<div v-for="code in draftSelectedValues" :key="code" class="inline-flex items-center gap-1">
						<UBadge color="primary" variant="solid" size="md" class="max-w-[min(100%,18rem)] truncate font-medium shadow-sm">
							{{ code }}
						</UBadge>
						<UButton
							color="neutral"
							variant="ghost"
							size="xs"
							icon="i-lucide-x"
							:aria-label="t('common.delete')"
							class="shrink-0"
							@click="removeDraftCategoryCode(code)"
						/>
					</div>
				</div>

				<div v-if="categoryTreeLoading" class="space-y-2 p-2">
					<USkeleton v-for="i in 5" :key="i" class="h-9 w-full" />
				</div>

				<template v-else>
					<div class="flex min-h-[320px] max-h-[400px] overflow-hidden rounded-lg border border-default">
						<div class="flex-1 overflow-y-auto border-r border-default">
							<ul class="py-1">
								<li
									v-for="cat in filteredRootCategories"
									:key="cat.code"
									class="category-item"
									:class="{ 'category-item--active': selectedLevel1?.code === cat.code }"
									@click="selectCategoryLevel1(cat)"
								>
									<span class="truncate flex-1">{{ cat.description || cat.code }}</span>
									<UIcon v-if="categoryHasChildren(cat)" :name="ICONS.CHEVRON_RIGHT" class="size-4 shrink-0 text-muted" />
								</li>
							</ul>
						</div>

						<div class="flex-1 overflow-y-auto border-r border-default">
							<ul v-if="categoryLevel2List.length > 0" class="py-1">
								<li
									v-for="cat in categoryLevel2List"
									:key="cat.code"
									class="category-item"
									:class="{ 'category-item--active': selectedLevel2?.code === cat.code }"
									@click="selectCategoryLevel2(cat)"
								>
									<span class="truncate flex-1">{{ cat.description || cat.code }}</span>
									<UIcon v-if="categoryHasChildren(cat)" :name="ICONS.CHEVRON_RIGHT" class="size-4 shrink-0 text-muted" />
								</li>
							</ul>
							<div v-else class="flex h-full min-h-[200px] items-center justify-center px-3 text-center text-sm text-muted">
								{{ selectedLevel1 ? t('components.zModal.categoryPicker.noSubcategories') : t('components.zModal.categoryPicker.selectParent') }}
							</div>
						</div>

						<div class="flex-1 overflow-y-auto">
							<ul v-if="categoryLevel3List.length > 0" class="py-1">
								<li
									v-for="cat in categoryLevel3List"
									:key="cat.code"
									class="category-item"
									:class="{ 'category-item--active': selectedLevel3?.code === cat.code }"
									@click="selectCategoryLevel3(cat)"
								>
									<span class="truncate flex-1">{{ cat.description || cat.code }}</span>
								</li>
							</ul>
							<div v-else class="flex h-full min-h-[200px] items-center justify-center px-3 text-center text-sm text-muted">
								{{ selectedLevel2 ? t('components.zModal.categoryPicker.noSubcategories') : t('components.zModal.categoryPicker.selectSubcategory') }}
							</div>
						</div>
					</div>

					<div v-if="selectedCategoryPath" class="flex flex-wrap items-center gap-2 text-sm">
						<span class="text-muted">{{ t('components.zModal.categoryPicker.currentlySelected') }}:</span>
						<span class="font-medium text-highlighted">{{ selectedCategoryPath }}</span>
					</div>

					<div class="flex justify-end">
						<UButton color="primary" :disabled="!canAddCurrentCategory" @click="addCurrentCategoryToDraft">
							{{ t('components.discountForm.filterValueAddCategorySelection') }}
						</UButton>
					</div>
				</template>
			</div>

			<!-- Flat list + OData for products, tags, types -->
			<div v-else class="space-y-4">
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
					<UInput v-model="search" class="sm:col-span-2" :placeholder="searchPlaceholder">
						<template #leading>
							<UIcon name="i-lucide-search" class="size-4 text-muted" />
						</template>
					</UInput>

					<USelectMenu v-model="sortField" value-key="value" :items="sortFieldItems" :search-input="{ placeholder: t('components.discountForm.sortBy') }" />

					<USelectMenu
						v-model="sortDirection"
						value-key="value"
						:items="sortDirectionItems"
						:search-input="{ placeholder: t('components.discountForm.sortDirection') }"
					/>
				</div>

				<div class="overflow-hidden rounded-lg border border-default">
					<div class="grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-b border-default bg-muted/30 px-4 py-2 text-xs font-medium uppercase text-muted">
						<span>{{ t('common.select') }}</span>
						<span>{{ entityLabel }}</span>
					</div>

					<div v-if="loading" class="space-y-2 p-4">
						<USkeleton v-for="i in 5" :key="i" class="h-9 w-full" />
					</div>

					<div v-else-if="rows.length === 0" class="px-4 py-8 text-center text-sm text-muted">
						{{ t('components.discountForm.filterValuePickerEmpty') }}
					</div>

					<div v-else class="max-h-80 divide-y divide-default overflow-y-auto">
						<label v-for="row in rows" :key="row.value" class="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 px-4 py-2 hover:bg-muted/40">
							<UCheckbox :model-value="isDraftSelected(row.value)" @update:model-value="toggleSelection(row.value, $event)" />
							<div class="min-w-0">
								<p class="truncate text-sm font-medium text-highlighted">{{ row.value }}</p>
								<p v-if="row.description" class="truncate text-xs text-muted">{{ row.description }}</p>
							</div>
						</label>
					</div>
				</div>

				<div class="flex flex-wrap items-center justify-between gap-3">
					<p class="text-xs text-muted">
						{{ t('components.discountForm.filterValuePickerTotal', { total }) }}
					</p>
					<div class="flex items-center gap-3">
						<USelectMenu v-model="pageSize" value-key="value" :items="pageSizeItems" @update:model-value="page = 1" />
						<UPagination v-model:page="page" :items-per-page="itemsPerPage" :total="total" />
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<div class="w-full flex items-center justify-between gap-3">
				<p class="text-xs text-muted">
					{{ t('components.discountForm.filterValuePickerSelected', { count: draftSelectedValues.length }) }}
				</p>
				<div class="flex items-center gap-2">
					<UButton color="neutral" variant="soft" :label="t('common.cancel')" @click="pickerOpen = false" />
					<UButton color="primary" :label="t('common.apply')" @click="applySelection" />
				</div>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import { FilterCondition } from 'yeppi-common';
import type { BaseODataReq } from '~/repository/base/base.req';
import { options_page_size } from '~/utils/options';
import { parseFilterValueCsv, stringifyFilterValueCsv } from '~/utils/discount/filter-value-csv';
import type { Category } from '~/utils/types/category';
import { ICONS } from '~/utils/icons';

type PickerRow = {
	value: string;
	description?: string;
};

type SortDirection = 'asc' | 'desc';

const props = defineProps<{
	modelValue?: string;
	filterCondition?: FilterCondition;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const { t } = useI18n();
const { $api } = useNuxtApp();
const categoryStore = useProductCategoryStore();
const { categories: rootCategories, loading: categoryTreeLoading } = storeToRefs(categoryStore);

const pickerOpen = ref(false);
const loading = ref(false);
const rows = ref<PickerRow[]>([]);
const total = ref(0);
const search = ref('');
const page = ref(1);
const pageSize = ref(options_page_size[0] as number);
const sortDirection = ref<SortDirection>('asc');
const sortField = ref('code');
const draftSelectedValues = ref<string[]>([]);

/** Nested category tree (FilterCondition.CATG_CODE) — same UX as `Z/Modal/Category/Picker.vue`. */
const categorySearchTerm = ref('');
const selectedLevel1 = ref<Category | null>(null);
const selectedLevel2 = ref<Category | null>(null);
const selectedLevel3 = ref<Category | null>(null);

let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

const hasCondition = computed(() => props.filterCondition != null);
const isCategoryTreeMode = computed(() => props.filterCondition === FilterCondition.CATG_CODE);

const pickerModalDescription = computed(() =>
	isCategoryTreeMode.value ? t('components.discountForm.filterValuePickerCategoryDescription') : t('components.discountForm.filterValuePickerDescription'),
);

const pickerModalUi = computed(() => ({
	content: isCategoryTreeMode.value ? 'w-full sm:max-w-[90%] md:max-w-[850px] lg:max-w-4xl' : 'sm:max-w-4xl',
}));

const currentSelectedValues = computed(() => parseFilterValueCsv(props.modelValue));

const entityLabel = computed(() => {
	switch (props.filterCondition) {
		case FilterCondition.PROD_CODE:
			return t('nav.products');
		case FilterCondition.CATG_CODE:
			return t('nav.categories');
		case FilterCondition.TAG_CODE:
			return t('nav.tags');
		case FilterCondition.TYPE:
			return t('common.type');
		default:
			return t('components.discountForm.filterNone');
	}
});

const searchPlaceholder = computed(() => {
	if (!hasCondition.value) {
		return t('components.discountForm.selectFilterConditionFirst');
	}
	return t('components.discountForm.filterValuePickerSearchPlaceholder', { entity: entityLabel.value.toLowerCase() });
});

const selectedCountLabel = computed(() => t('components.discountForm.filterValuePickerSelected', { count: currentSelectedValues.value.length }));

const sortFieldItems = computed(() => {
	switch (props.filterCondition) {
		case FilterCondition.PROD_CODE:
			return [
				{ label: t('common.code'), value: 'code' },
				{ label: t('common.name'), value: 'name' },
			];
		case FilterCondition.TAG_CODE:
			return [{ label: t('common.name'), value: 'value' }];
		case FilterCondition.TYPE:
			return [{ label: t('common.name'), value: 'value' }];
		default:
			return [{ label: t('common.code'), value: 'code' }];
	}
});

const sortDirectionItems = computed(() => [
	{ label: t('components.discountForm.sortAscending'), value: 'asc' },
	{ label: t('components.discountForm.sortDescending'), value: 'desc' },
]);

const pageSizeItems = computed(() => options_page_size.map((size) => ({ label: String(size), value: size })));

const normalizePageSize = (v: unknown): number => {
	if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
		return v;
	}
	if (v && typeof v === 'object' && 'value' in v) {
		const n = Number((v as { value: unknown }).value);
		if (Number.isFinite(n) && n > 0) {
			return n;
		}
	}
	return options_page_size[0] as number;
};

/** Nuxt UI `UPagination` uses `page` + `update:page`, not default `v-model`. */
const itemsPerPage = computed(() => normalizePageSize(pageSize.value));

const getCategoryChildren = (cat: Category): Category[] => {
	return cat.category_children ?? cat.children ?? [];
};

const categoryHasChildren = (cat: Category): boolean => {
	return getCategoryChildren(cat).length > 0;
};

/** Walk nested children (no reliance on `parent_category` being hydrated). */
const findCategoryPathToCode = (roots: Category[], targetCode: string, prefix: Category[] = []): Category[] | null => {
	for (const node of roots) {
		const chain = [...prefix, node];
		if (node.code === targetCode) {
			return chain;
		}
		const found = findCategoryPathToCode(getCategoryChildren(node), targetCode, chain);
		if (found) {
			return found;
		}
	}
	return null;
};

/** Map path onto the 3 visible columns (deepest three nodes when depth > 3). */
const restoreCategoryLevelsFromFirstDraftCode = () => {
	const firstCode = draftSelectedValues.value[0]?.trim();
	if (!firstCode) {
		return;
	}
	const path = findCategoryPathToCode(rootCategories.value, firstCode);
	if (!path?.length) {
		return;
	}
	const n = path.length;
	if (n <= 3) {
		selectedLevel1.value = n >= 1 ? path[0]! : null;
		selectedLevel2.value = n >= 2 ? path[1]! : null;
		selectedLevel3.value = n >= 3 ? path[2]! : null;
	} else {
		selectedLevel1.value = path[n - 3]!;
		selectedLevel2.value = path[n - 2]!;
		selectedLevel3.value = path[n - 1]!;
	}
};

const categoryMatchesSearch = (cat: Category, term: string): boolean => {
	if (cat.code.toLowerCase().includes(term)) {
		return true;
	}
	if (cat.description?.toLowerCase().includes(term)) {
		return true;
	}
	return getCategoryChildren(cat).some((child) => categoryMatchesSearch(child, term));
};

const filteredRootCategories = computed(() => {
	if (!categorySearchTerm.value) {
		return rootCategories.value;
	}
	const term = categorySearchTerm.value.toLowerCase();
	return rootCategories.value.filter((cat) => categoryMatchesSearch(cat, term));
});

const categoryLevel2List = computed<Category[]>(() => {
	if (!selectedLevel1.value) {
		return [];
	}
	return getCategoryChildren(selectedLevel1.value);
});

const categoryLevel3List = computed<Category[]>(() => {
	if (!selectedLevel2.value) {
		return [];
	}
	return getCategoryChildren(selectedLevel2.value);
});

const currentCategorySelection = computed<Category | null>(() => {
	return selectedLevel3.value ?? selectedLevel2.value ?? selectedLevel1.value;
});

const selectedCategoryPath = computed(() => {
	const parts: string[] = [];
	if (selectedLevel1.value) {
		parts.push(selectedLevel1.value.description || selectedLevel1.value.code);
	}
	if (selectedLevel2.value) {
		parts.push(selectedLevel2.value.description || selectedLevel2.value.code);
	}
	if (selectedLevel3.value) {
		parts.push(selectedLevel3.value.description || selectedLevel3.value.code);
	}
	return parts.join(' > ');
});

const selectCategoryLevel1 = (cat: Category) => {
	selectedLevel1.value = cat;
	selectedLevel2.value = null;
	selectedLevel3.value = null;
};

const selectCategoryLevel2 = (cat: Category) => {
	selectedLevel2.value = cat;
	selectedLevel3.value = null;
};

const selectCategoryLevel3 = (cat: Category) => {
	selectedLevel3.value = cat;
};

const canAddCurrentCategory = computed(() => {
	const cat = currentCategorySelection.value;
	const code = cat?.code?.trim();
	if (!code) {
		return false;
	}
	return !draftSelectedValues.value.includes(code);
});

const addCurrentCategoryToDraft = () => {
	const cat = currentCategorySelection.value;
	const code = cat?.code?.trim();
	if (!code || draftSelectedValues.value.includes(code)) {
		return;
	}
	draftSelectedValues.value = [...draftSelectedValues.value, code];
};

const removeDraftCategoryCode = (code: string) => {
	draftSelectedValues.value = draftSelectedValues.value.filter((c) => c !== code);
};

const resetCategoryTreeUi = () => {
	categorySearchTerm.value = '';
	selectedLevel1.value = null;
	selectedLevel2.value = null;
	selectedLevel3.value = null;
};

const prepareCategoryTree = async () => {
	resetCategoryTreeUi();
	await categoryStore.getCategoriesForTree();
	restoreCategoryLevelsFromFirstDraftCode();
};

const isDraftSelected = (value: string) => {
	return draftSelectedValues.value.includes(value);
};

const toggleSelection = (value: string, checked: boolean | 'indeterminate') => {
	const shouldSelect = checked === true;
	if (shouldSelect) {
		if (!draftSelectedValues.value.includes(value)) {
			draftSelectedValues.value = [...draftSelectedValues.value, value];
		}
		return;
	}
	draftSelectedValues.value = draftSelectedValues.value.filter((item) => item !== value);
};

const resetSortField = () => {
	const firstSortField = sortFieldItems.value[0]?.value;
	if (firstSortField) {
		sortField.value = firstSortField;
	}
};

const buildQuery = (): BaseODataReq => {
	const size = itemsPerPage.value;
	const query: BaseODataReq = {
		$top: size,
		$skip: (page.value - 1) * size,
		$count: true,
		$orderby: `${sortField.value} ${sortDirection.value}`,
	};

	const trimmedSearch = search.value.trim();
	if (trimmedSearch) {
		query.$search = trimmedSearch;
	}

	return query;
};

const fetchRows = async () => {
	if (!props.filterCondition) {
		rows.value = [];
		total.value = 0;
		return;
	}
	if (props.filterCondition === FilterCondition.CATG_CODE) {
		rows.value = [];
		total.value = 0;
		return;
	}

	loading.value = true;
	try {
		const query = buildQuery();
		switch (props.filterCondition) {
			case FilterCondition.PROD_CODE: {
				const resp = await $api.product.getMany(query);
				const list = resp.data ?? resp.value ?? [];
				rows.value = list
					.map((item) => ({
						value: item.code?.trim() ?? '',
						description: item.name?.trim() || undefined,
					}))
					.filter((item) => item.value.length > 0);
				total.value = resp['@odata.count'] ?? resp.count ?? 0;
				break;
			}
			case FilterCondition.TAG_CODE: {
				const resp = await $api.tag.getMany(query);
				const list = resp.data ?? resp.value ?? [];
				rows.value = list
					.map((item) => ({
						value: item.value?.trim() ?? '',
					}))
					.filter((item) => item.value.length > 0);
				total.value = resp['@odata.count'] ?? resp.count ?? 0;
				break;
			}
			case FilterCondition.TYPE: {
				const resp = await $api.productType.getMany(query);
				const list = resp.data ?? resp.value ?? [];
				rows.value = list
					.map((item) => ({
						value: item.value?.trim() ?? '',
					}))
					.filter((item) => item.value.length > 0);
				total.value = resp['@odata.count'] ?? resp.count ?? 0;
				break;
			}
			default: {
				rows.value = [];
				total.value = 0;
			}
		}
	} finally {
		loading.value = false;
	}
};

const openPicker = async () => {
	if (!hasCondition.value) {
		return;
	}

	draftSelectedValues.value = parseFilterValueCsv(props.modelValue);
	page.value = 1;
	pickerOpen.value = true;

	if (props.filterCondition === FilterCondition.CATG_CODE) {
		await prepareCategoryTree();
	}
};

const applySelection = () => {
	emit('update:modelValue', stringifyFilterValueCsv(draftSelectedValues.value));
	pickerOpen.value = false;
};

const clearSelection = () => {
	emit('update:modelValue', '');
};

watch(
	() => props.filterCondition,
	() => {
		page.value = 1;
		search.value = '';
		draftSelectedValues.value = [];
		resetSortField();
		rows.value = [];
		total.value = 0;
		resetCategoryTreeUi();
	},
	{ immediate: true },
);

watch([pickerOpen, page, itemsPerPage, sortField, sortDirection], async ([open]) => {
	if (!open) {
		return;
	}
	if (props.filterCondition === FilterCondition.CATG_CODE) {
		return;
	}
	await fetchRows();
});

watch(search, () => {
	if (!pickerOpen.value) {
		return;
	}
	if (props.filterCondition === FilterCondition.CATG_CODE) {
		return;
	}
	if (searchDebounceTimer) {
		clearTimeout(searchDebounceTimer);
	}
	searchDebounceTimer = setTimeout(() => {
		page.value = 1;
		void fetchRows();
	}, 300);
});

onBeforeUnmount(() => {
	if (searchDebounceTimer) {
		clearTimeout(searchDebounceTimer);
	}
});
</script>

<style scoped>
/* Match `Z/Modal/Category/Picker.vue` column rows */
.category-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.625rem 1rem;
	font-size: 0.875rem;
	cursor: pointer;
	transition:
		background-color 0.15s ease,
		color 0.15s ease;
	color: var(--ui-color-neutral-700, #404040);
}

.category-item:hover {
	background-color: var(--ui-color-neutral-50, #fafafa);
}

:root.dark .category-item {
	color: var(--ui-color-neutral-300, #d4d4d4);
}

:root.dark .category-item:hover {
	background-color: var(--ui-color-neutral-800, #262626);
}

.category-item--active {
	background-color: var(--ui-color-primary-50, #eff6ff);
	color: var(--ui-color-primary-600, #2563eb);
	font-weight: 500;
}

:root.dark .category-item--active {
	background-color: rgba(var(--ui-color-primary-900-rgb, 30, 58, 138), 0.2);
	color: var(--ui-color-primary-400, #60a5fa);
}
</style>
