<template>
	<USelectMenu
		v-model="category"
		v-model:search-term="searchTerm"
		:items="items"
		:search-input="{
			placeholder: 'Search or add category…',
			icon: 'i-lucide-search',
		}"
		size="md"
		label-key="code"
		description-key="description"
		:placeholder="t('components.selectMenu.selectCategory')"
	>
		<template #default>
			<div v-if="category" class="flex items-center">
				<div
					class="flex items-center justify-between w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1"
				>
					<p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ category.code }}</p>
					<UIcon
						:name="ICONS.CROSS"
						class="w-4 h-4 shrink-0 text-error-500 dark:text-error-400 hover:text-error-600 dark:hover:text-error-300 transition-colors ml-2 cursor-pointer"
						@click.stop="remove"
					/>
				</div>
			</div>
			<span v-else class="text-neutral-400 text-sm">{{ t('components.selectMenu.selectCategory') }}</span>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import type { SelectMenuItem } from '@nuxt/ui';
import type { Category } from '~/utils/types/category';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const searchTerm = ref('');
const categoryStore = useProductCategoryStore();
const { categories } = storeToRefs(categoryStore);

const props = defineProps<{ category: Category | undefined; ignoreCodes?: string[] }>();

const availableCategories = computed(() => {
	return categories.value.filter((catg) => !props.ignoreCodes?.includes(catg.code));
});

const items = computed<SelectMenuItem[]>(() => {
	return availableCategories.value.map((category) => ({
		...category,
		label: category.code,
		description: category.description,
	}));
});

const emit = defineEmits(['update:category']);

const category = computed({
	get() {
		return props.category ?? undefined;
	},
	set(value) {
		emit('update:category', JSON.parse(JSON.stringify(value)));
	},
});

const remove = () => {
	emit('update:category', undefined);
};
</script>

<style scoped></style>
