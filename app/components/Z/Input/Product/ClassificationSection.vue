<template>
	<UCard id="section-classification" class="shadow-md scroll-mt-4">
		<template #header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-2">
						<UIcon :name="ICONS.TAG" class="text-primary-500 w-6 h-6" />
						<h2 class="text-xl font-semibold">{{ t('components.productUpdate.classification') }}</h2>
						<span class="text-xs text-neutral-500 ml-2">({{ t('components.productUpdate.optional') }})</span>
					</div>
					<p class="text-sm text-neutral-500 mt-1">{{ t('components.productUpdate.organizeWithCategories') }}</p>
				</div>
				<UTooltip :text="t('pages.categoriesTagsTooltip')" :popper="{ placement: 'bottom' }">
					<UIcon :name="ICONS.HELP" class="text-neutral-400 hover:text-primary-500 w-5 h-5 cursor-help" />
				</UTooltip>
			</div>
		</template>

		<div class="py-2 px-4">
			<div class="grid grid-cols-1 gap-6">
				<UFormField :label="t('components.productUpdate.categories')">
					<p class="text-xs text-neutral-500 my-1">{{ t('components.productUpdate.mainCategories') }}</p>
					<!-- Category Picker Trigger -->
					<div class="category-picker-trigger" @click="openCategoryPicker">
						<div class="category-picker-content">
							<template v-if="categoriesModel && categoriesModel.length > 0">
								<div v-for="category in categoriesModel" :key="category.code" class="category-chip">
									<p class="category-chip-label">{{ category.description }}</p>
									<UIcon :name="ICONS.CROSS" class="category-chip-remove" @click.stop="removeCategory(category)" />
								</div>
							</template>
							<span v-else class="category-picker-placeholder">{{ t('components.selectMenu.selectCategories') }}</span>
						</div>
						<UIcon :name="ICONS.EXPAND_ROUNDED" class="category-picker-chevron" />
					</div>
				</UFormField>

				<UFormField :label="t('components.productUpdate.tags')">
					<p class="text-xs text-neutral-500 my-1">{{ t('components.productUpdate.keywordsFiltering') }}</p>
					<ZSelectMenuTags v-model:tags="tagsModel" class="w-full" :placeholder="t('components.selectMenu.selectTags')" />
				</UFormField>

				<UFormField :label="t('components.productUpdate.brands')">
					<p class="text-xs text-neutral-500 my-1">{{ t('components.productUpdate.productBrand') }}</p>
					<ZSelectMenuBrands v-model:brands="brandsModel" class="w-full" :placeholder="t('components.selectMenu.selectBrands')" />
				</UFormField>
			</div>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import { ZModalCategoryPicker } from '#components';
import { ICONS } from '~/utils/icons';
import type { Category } from '~/utils/types/category';
import type { Tag } from '~/utils/types/tag';
import type { Brand } from '~/utils/types/brand';

const { t } = useI18n();

const props = defineProps<{
	categories: Category[];
	tags: Tag[];
	brands: Brand[];
}>();

const emit = defineEmits<{
	'update:categories': [value: Category[]];
	'update:tags': [value: Tag[]];
	'update:brands': [value: Brand[]];
}>();

const overlay = useOverlay();

const categoriesModel = computed({
	get: () => props.categories,
	set: (value: Category[]) => emit('update:categories', value),
});

const tagsModel = computed({
	get: () => props.tags,
	set: (value: Tag[]) => emit('update:tags', value),
});

const brandsModel = computed({
	get: () => props.brands,
	set: (value: Brand[]) => emit('update:brands', value),
});

const openCategoryPicker = () => {
	const pickerModal = overlay.create(ZModalCategoryPicker, {
		props: {
			selectedCategories: categoriesModel.value,
			onConfirm: (category: Category) => {
				// Add category if not already selected
				const exists = categoriesModel.value.some((c) => c.code === category.code);
				if (!exists) {
					categoriesModel.value = [...categoriesModel.value, category];
				}
				pickerModal.close();
			},
			onCancel: () => {
				pickerModal.close();
			},
		},
	});

	pickerModal.open();
};

const removeCategory = (category: Category) => {
	categoriesModel.value = categoriesModel.value.filter((c) => c.code !== category.code);
};
</script>

<style scoped>
.category-picker-trigger {
	display: flex;
	align-items: center;
	width: 100%;
	min-height: 38px;
	padding: 6px 10px;
	border: 1px solid var(--ui-border);
	border-radius: var(--ui-radius);
	cursor: pointer;
	transition: border-color 0.15s ease;
	background-color: var(--ui-bg);
}

.category-picker-trigger:hover {
	border-color: var(--ui-border-hover, var(--color-primary-400));
}

.category-picker-content {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	flex: 1;
	min-width: 0;
}

.category-chip {
	display: flex;
	align-items: center;
	background-color: var(--color-neutral-50);
	border: 1px solid var(--color-neutral-200);
	border-radius: 6px;
	padding: 2px 8px;
}

:root.dark .category-chip {
	background-color: var(--color-neutral-900);
	border-color: var(--color-neutral-700);
}

.category-chip-label {
	font-size: 0.875rem;
	font-weight: 500;
	color: var(--color-neutral-900);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

:root.dark .category-chip-label {
	color: var(--color-neutral-100);
}

.category-chip-remove {
	width: 16px;
	height: 16px;
	flex-shrink: 0;
	color: var(--color-error-500);
	margin-left: 6px;
	cursor: pointer;
	transition: color 0.15s ease;
}

.category-chip-remove:hover {
	color: var(--color-error-600);
}

:root.dark .category-chip-remove {
	color: var(--color-error-400);
}

:root.dark .category-chip-remove:hover {
	color: var(--color-error-300);
}

.category-picker-placeholder {
	color: var(--color-neutral-400);
	font-size: 0.875rem;
}

.category-picker-chevron {
	width: 20px;
	height: 20px;
	flex-shrink: 0;
	color: var(--color-neutral-400);
	margin-left: 4px;
}
</style>
