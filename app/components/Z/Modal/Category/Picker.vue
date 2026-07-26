<template>
	<UModal
		:title="t('components.zModal.editCategory')"
		:ui="{
			content: 'w-full sm:max-w-[90%] md:max-w-[750px] lg:max-w-[850px]',
		}"
	>
		<template #header>
			<div class="flex items-center justify-between w-full">
				<h3 class="text-lg font-bold">{{ t('components.zModal.editCategory') }}</h3>
			</div>
		</template>

		<template #body>
			<div class="space-y-4">
				<!-- Search -->
				<div class="flex items-center justify-between">
					<UInput v-model="searchTerm" :placeholder="t('components.zModal.categoryPicker.searchPlaceholder')" :ui="{ base: 'w-64' }" size="md">
						<template #leading>
							<UIcon :name="ICONS.SEARCH_ROUNDED" class="w-4 h-4 text-neutral-400" />
						</template>
					</UInput>
				</div>

				<!-- 3-Column Picker -->
				<div class="flex border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden min-h-[350px] max-h-[400px]">
					<!-- Column 1: Root / Level 1 Categories -->
					<div class="flex-1 overflow-y-auto border-r border-neutral-200 dark:border-neutral-700">
						<ul class="py-1">
							<li
								v-for="cat in filteredRootCategories"
								:key="cat.code"
								class="category-item"
								:class="{
									'category-item--active': selectedLevel1?.code === cat.code,
								}"
								@click="selectLevel1(cat)"
							>
								<span class="truncate flex-1">{{ cat.description || cat.code }}</span>
								<UIcon v-if="hasChildren(cat)" :name="ICONS.CHEVRON_RIGHT" class="w-4 h-4 shrink-0 text-neutral-400" />
							</li>
						</ul>
					</div>

					<!-- Column 2: Level 2 Categories -->
					<div class="flex-1 overflow-y-auto border-r border-neutral-200 dark:border-neutral-700">
						<ul v-if="level2Categories.length > 0" class="py-1">
							<li
								v-for="cat in level2Categories"
								:key="cat.code"
								class="category-item"
								:class="{
									'category-item--active': selectedLevel2?.code === cat.code,
								}"
								@click="selectLevel2(cat)"
							>
								<span class="truncate flex-1">{{ cat.description || cat.code }}</span>
								<UIcon v-if="hasChildren(cat)" :name="ICONS.CHEVRON_RIGHT" class="w-4 h-4 shrink-0 text-neutral-400" />
							</li>
						</ul>
						<div v-else class="flex items-center justify-center h-full text-sm text-neutral-400">
							{{ selectedLevel1 ? t('components.zModal.categoryPicker.noSubcategories') : t('components.zModal.categoryPicker.selectParent') }}
						</div>
					</div>

					<!-- Column 3: Level 3 Categories -->
					<div class="flex-1 overflow-y-auto">
						<ul v-if="level3Categories.length > 0" class="py-1">
							<li
								v-for="cat in level3Categories"
								:key="cat.code"
								class="category-item"
								:class="{
									'category-item--active': selectedLevel3?.code === cat.code,
								}"
								@click="selectLevel3(cat)"
							>
								<span class="truncate flex-1">{{ cat.description || cat.code }}</span>
							</li>
						</ul>
						<div v-else class="flex items-center justify-center h-full text-sm text-neutral-400">
							{{ selectedLevel2 ? t('components.zModal.categoryPicker.noSubcategories') : t('components.zModal.categoryPicker.selectSubcategory') }}
						</div>
					</div>
				</div>

				<!-- Selected Path Preview -->
				<div v-if="selectedPath" class="flex items-center gap-2 text-sm">
					<span class="text-neutral-500">{{ t('components.zModal.categoryPicker.currentlySelected') }} :</span>
					<span class="font-semibold text-neutral-900 dark:text-neutral-100">{{ selectedPath }}</span>
				</div>
			</div>
		</template>

		<template #footer>
			<div class="flex justify-between w-full">
				<div />
				<div class="flex gap-3">
					<UButton color="neutral" variant="outline" @click="onCancel">{{ t('common.cancel') }}</UButton>
					<UButton color="primary" :disabled="!currentSelection" @click="onConfirm">{{ t('modal.confirm') }}</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
import type { Category } from '~/utils/types/category';

const { t } = useI18n();

const props = defineProps<{
	/** Pre-selected categories to highlight on open */
	selectedCategories?: Category[];
}>();

const emit = defineEmits<{
	confirm: [category: Category];
	cancel: [];
}>();

const categoryStore = useProductCategoryStore();
const { categories: rootCategories, loading } = storeToRefs(categoryStore);

const searchTerm = ref('');
const selectedLevel1 = ref<Category | null>(null);
const selectedLevel2 = ref<Category | null>(null);
const selectedLevel3 = ref<Category | null>(null);

// Fetch tree data on mount
onMounted(async () => {
	await categoryStore.getCategoriesForTree();

	// If pre-selected categories exist, try to restore the selection path
	if (props.selectedCategories?.length) {
		const firstSelected = props.selectedCategories[0];
		if (firstSelected) restoreSelection(firstSelected);
	}
});

/** Restore selection path from a previously selected category */
const restoreSelection = (category: Category) => {
	// Walk up the tree to find the selection path
	if (category.parent_category) {
		const parent = category.parent_category;
		if (parent.parent_category) {
			// 3 levels deep
			const grandParent = parent.parent_category;
			const rootMatch = rootCategories.value.find((c) => c.code === grandParent.code);
			if (rootMatch) {
				selectedLevel1.value = rootMatch;
				const l2Match = getChildren(rootMatch).find((c) => c.code === parent.code);
				if (l2Match) {
					selectedLevel2.value = l2Match;
					const l3Match = getChildren(l2Match).find((c) => c.code === category.code);
					if (l3Match) selectedLevel3.value = l3Match;
				}
			}
		} else {
			// 2 levels deep
			const rootMatch = rootCategories.value.find((c) => c.code === parent.code);
			if (rootMatch) {
				selectedLevel1.value = rootMatch;
				const l2Match = getChildren(rootMatch).find((c) => c.code === category.code);
				if (l2Match) selectedLevel2.value = l2Match;
			}
		}
	} else {
		// 1 level deep (root)
		const rootMatch = rootCategories.value.find((c) => c.code === category.code);
		if (rootMatch) selectedLevel1.value = rootMatch;
	}
};

/** Get children of a category */
const getChildren = (cat: Category): Category[] => {
	return cat.category_children ?? cat.children ?? [];
};

/** Check if category has children */
const hasChildren = (cat: Category): boolean => {
	return getChildren(cat).length > 0;
};

/** Filtered root categories based on search */
const filteredRootCategories = computed(() => {
	if (!searchTerm.value) return rootCategories.value;
	const term = searchTerm.value.toLowerCase();
	return rootCategories.value.filter((cat) => {
		// Search in root and all descendants
		return matchesSearch(cat, term);
	});
});

/** Recursively check if category or children match search term */
const matchesSearch = (cat: Category, term: string): boolean => {
	if (cat.code.toLowerCase().includes(term)) return true;
	if (cat.description?.toLowerCase().includes(term)) return true;
	return getChildren(cat).some((child) => matchesSearch(child, term));
};

/** Level 2 categories */
const level2Categories = computed<Category[]>(() => {
	if (!selectedLevel1.value) return [];
	return getChildren(selectedLevel1.value);
});

/** Level 3 categories */
const level3Categories = computed<Category[]>(() => {
	if (!selectedLevel2.value) return [];
	return getChildren(selectedLevel2.value);
});

/** Select level 1 category */
const selectLevel1 = (cat: Category) => {
	selectedLevel1.value = cat;
	selectedLevel2.value = null;
	selectedLevel3.value = null;
};

/** Select level 2 category */
const selectLevel2 = (cat: Category) => {
	selectedLevel2.value = cat;
	selectedLevel3.value = null;
};

/** Select level 3 category */
const selectLevel3 = (cat: Category) => {
	selectedLevel3.value = cat;
};

/** The deepest selection (most specific category) */
const currentSelection = computed<Category | null>(() => {
	return selectedLevel3.value ?? selectedLevel2.value ?? selectedLevel1.value;
});

/** Display path string */
const selectedPath = computed<string>(() => {
	const parts: string[] = [];
	if (selectedLevel1.value) parts.push(selectedLevel1.value.description || selectedLevel1.value.code);
	if (selectedLevel2.value) parts.push(selectedLevel2.value.description || selectedLevel2.value.code);
	if (selectedLevel3.value) parts.push(selectedLevel3.value.description || selectedLevel3.value.code);
	return parts.join(' > ');
});

const onConfirm = () => {
	if (currentSelection.value) {
		emit('confirm', JSON.parse(JSON.stringify(currentSelection.value)));
	}
};

const onCancel = () => {
	emit('cancel');
};
</script>

<style scoped>
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
