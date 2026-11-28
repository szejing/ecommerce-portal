<template>
	<ZPagePanel id="products-categories" inline-mobile-actions :title="t('nav.categories')" back-to="/products">
		<template #navbar-right>
			<ZCreateButton class="hidden lg:flex" to="/products/categories/create" :label="t('common.addCategory')" />
			<UButton
				to="/products/categories/create"
				:label="t('productMobileListing.add')"
				:aria-label="t('common.addCategory')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
			/>
		</template>
		<template #toolbar>
			<ZSectionFilterCategories />
		</template>
		<div class="space-y-3 lg:space-y-6">
			<!-- Table Controls -->
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				class="hidden lg:flex"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="updatePageSize"
				@export="exportCategories"
			/>

			<template v-if="initialize">
				<div class="rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
					<div class="grid grid-cols-[1fr_auto] gap-4 p-4">
						<USkeleton class="h-4 w-24" />
						<USkeleton class="h-4 w-16" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-[1fr_auto] gap-4 p-4 items-center">
						<USkeleton class="h-4 w-40" />
						<USkeleton class="h-4 w-12" />
					</div>
				</div>
			</template>
			<!-- Tree table (WooCommerce-style hierarchy) -->

			<section v-else class="lg:hidden" :aria-label="t('nav.categories')" :aria-busy="loading">
				<ZLoading v-if="loading" />
				<UEmpty v-else-if="!getDisplayCategories.length" :icon="ICONS.ADDITIONAL" :title="t('pages.noCategoriesFound')" :description="t('pages.tryAdjustingFilters')" />
				<ul v-else class="divide-y divide-default border-y border-default">
					<li v-for="{ category, depth, parent } in categoryRows" :key="category.code" class="flex items-center" :style="{ paddingInlineStart: `${Math.min(depth, 3) * 0.75}rem` }">
						<ZRecordLink @click="openCategory(category)">
							<template #leading>
								<ZImage :src="category.thumbnail?.url || ''" :width="32" :height="32" />
							</template>
							<span class="block text-sm font-semibold text-highlighted">{{ category.description || category.code }}</span>
							<span v-if="category.description" class="block text-xs text-muted">{{ category.code }}</span>
							<span v-if="parent" class="sr-only">{{ t('components.zModal.parentCategory') }} · {{ parent.description || parent.code }}</span>
							<template #trailing>
								<span class="text-sm tabular-nums">
									<span class="sr-only">{{ t('table.noOfItems') }}</span>
									{{ category.total_products ?? 0 }}
								</span>
								<UBadge v-if="category.is_active === false" color="neutral" variant="subtle" size="sm">{{ t('common.inactive') }}</UBadge>
							</template>
						</ZRecordLink>
						<UButton
							v-if="category.category_children?.length && !filter.query.trim()"
							:icon="expanded[category.code] ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
							:aria-expanded="Boolean(expanded[category.code])"
							:aria-label="t(expanded[category.code] ? 'catalogMobile.collapseCategory' : 'catalogMobile.expandCategory', { category: category.description || category.code })"
							color="neutral"
							variant="ghost"
							class="min-h-11 min-w-11 shrink-0 justify-center"
							@click="expanded = { ...expanded, [category.code]: !expanded[category.code] }"
						/>
					</li>
				</ul>
			</section>

			<UCard v-if="!initialize" class="hidden lg:block" :ui="{ body: 'p-0 sm:p-0' }">
				<UTable
					v-model:expanded="expanded"
					:data="getDisplayCategories"
					:columns="visibleColumns"
					:get-row-id="(row) => row.code"
					:get-sub-rows="getSubRows"
					:loading="loading"
					:ui="{
						base: 'border-separate border-spacing-0',
						tbody: '[&>tr]:last:[&>td]:border-b-0',
						tr: 'group data-[expanded=true]:bg-elevated/50',
						td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default group-data-[expanded=true]:first:border-l-2 group-data-[expanded=true]:first:border-l-primary-400',
					}"
					@select="(_event, row) => openCategory(row.original)"
				>
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.ADDITIONAL" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noCategoriesFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<!-- Count (tree view shows all categories) -->
			<div v-if="!initialize && getDisplayCategories.length > 0" class="section-pagination text-sm text-muted">
				{{ t('pages.categoriesCount', { total: total_categories }) }}
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalCategoryDetail, ZModalConfirmation } from '#components';
import { getCategoryTreeColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { Category } from '~/utils/types/category';
import { options_page_size } from '~/utils/options';
import { failedNotification } from '~/stores/AppUi/AppUi';
import { ICONS } from '~/utils/icons';

const CATEGORY_COLUMN_LABELS = {
	category: 'table.code',
	total_products: 'table.noOfItems',
} as const;

const { t } = useI18n();
const category_tree_columns = computed(() => getCategoryTreeColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, CATEGORY_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(category_tree_columns, columnOptions);
useHead({ title: () => t('pages.categoriesTitle') });

const overlay = useOverlay();
const categoryStore = useProductCategoryStore();
const { loading, getDisplayCategories, total_categories, filter, exporting } = storeToRefs(categoryStore);

/** Expand only root (1st level) categories by default. */
const expanded = ref<Record<string, boolean>>({});

const categoryRows = computed(() => {
	const rows: { category: Category; depth: number; parent?: Category }[] = [];
	const searching = Boolean(filter.value.query.trim());
	function append(categories: Category[], depth: number, parent?: Category) {
		for (const category of categories) {
			rows.push({ category, depth, parent });
			if (category.category_children?.length && (searching || expanded.value[category.code])) {
				append(category.category_children, depth + 1, category);
			}
		}
	}
	append(getDisplayCategories.value, 0);
	return rows;
});

/** Return sub-rows from API's category_children so the table can expand. */
function getSubRows(row: Category): Category[] | undefined {
	const children = row.category_children;
	return children?.length ? children : undefined;
}

/** After data loads, expand all root categories that have children. */
function expandRootCategories() {
	const map: Record<string, boolean> = {};
	for (const cat of getDisplayCategories.value) {
		if (cat.category_children?.length) {
			map[cat.code] = true;
		}
	}
	expanded.value = map;
}

const initialize = ref(true);

// Defer initial fetch to client so Pinia is active (avoids "getActivePinia() was called but there was no active Pinia" on refresh)
onMounted(async () => {
	initialize.value = true;
	try {
		await categoryStore.getCategoriesForTree();
		expandRootCategories();
	} finally {
		initialize.value = false;
	}
});

const deleteCategory = async (category: Category) => {
	const hasProducts = category.total_products && category.total_products > 0;

	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: hasProducts ? t('pages.confirmDeleteCategoryWithProducts') : t('pages.confirmDeleteCategory'),
			action: 'delete',
			onConfirm: async () => {
				await categoryStore.deleteCategory(category.code);
				await categoryStore.getCategoriesForTree();
				confirmModal.close();
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};

const openCategory = async (category: Category) => {
	if (category.is_internal) {
		failedNotification(t('pages.internalCategoriesCannotBeEdited'));
		return;
	}

	const categoryModal = overlay.create(ZModalCategoryDetail, {
		props: {
			category: JSON.parse(JSON.stringify(category)),
			onUpdate: async ({ code, description, is_active, is_internal, parent_category, thumbnail, images }) => {
				await categoryStore.updateCategory(code, description, is_active, is_internal, parent_category, thumbnail, images);
				await categoryStore.getCategoriesForTree();
				categoryModal.close();
			},
			onDelete: async () => {
				categoryModal.close();
				await deleteCategory(category);
			},
			onCancel: () => {
				categoryModal.close();
			},
		},
	});

	categoryModal.open();
};

const updatePageSize = async (size: number) => {
	categoryStore.filter.page_size = size;
	await categoryStore.getCategoriesForTree();
};

const exportCategories = async () => {
	// await categoryStore.exportCategories();
};
</script>

<style scoped></style>
