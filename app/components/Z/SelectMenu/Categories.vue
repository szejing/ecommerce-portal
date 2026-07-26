<template>
	<USelectMenu
		v-model="categories"
		v-model:search-term="searchTerm"
		:items="items"
		:search-input="{
			placeholder: 'Search or add categories…',
			icon: 'i-lucide-search',
		}"
		size="md"
		label-key="code"
		description-key="description"
		multiple
		:placeholder="t('components.selectMenu.selectCategories')"
	>
		<template #default>
			<div v-if="categories && categories.length > 0" class="flex flex-wrap gap-1.5">
				<div
					v-for="category in categories"
					:key="category.code"
					class="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1"
				>
					<p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ category.code }}</p>
					<UIcon
						:name="ICONS.CROSS"
						class="w-4 h-4 shrink-0 text-error-500 dark:text-error-400 hover:text-error-600 dark:hover:text-error-300 transition-colors ml-2 cursor-pointer"
						@click.stop="remove(category)"
					/>
				</div>
			</div>
			<span v-else class="text-neutral-400 text-sm">{{ t('components.selectMenu.selectCategories') }}</span>
		</template>

		<template #empty>
			<UButton color="success" variant="ghost">{{ t('components.selectMenu.createLabel', { term: searchTerm }) }}</UButton>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import type { Category } from '~/utils/types/category';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const searchTerm = ref('');
const categoryStore = useProductCategoryStore();
const { categories: items } = storeToRefs(categoryStore);

const props = defineProps<{ categories: Category[] | undefined }>();

const emit = defineEmits(['update:categories']);

const categories = computed<Category[]>({
	get() {
		return props.categories ?? [];
	},
	set(value) {
		emit('update:categories', JSON.parse(JSON.stringify(value)));
	},
});

const remove = (category: Category) => {
	categories.value = categories.value.filter((c) => c.code !== category.code);
};
</script>

<style scoped></style>
