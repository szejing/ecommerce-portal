<template>
	<USelectMenu
		ref="selectMenu"
		v-model="tags"
		v-model:search-term="searchTerm"
		by="id"
		:items="items"
		:search-input="{
			placeholder: 'Search or add tags…',
			icon: 'i-lucide-search',
		}"
		size="md"
		multiple
		label-key="value"
		:placeholder="t('components.selectMenu.selectTags')"
		variant="formTrigger"
		:loading="tagStore.loading"
		@update:open="onOpen"
	>
		<template #default>
			<div v-if="tags && tags.length > 0" class="flex flex-wrap gap-1.5">
				<div
					v-for="tag in tags"
					:key="tag.value"
					class="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1"
				>
					<p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ tag.value }}</p>
					<UIcon
						:name="ICONS.CROSS"
						class="w-4 h-4 shrink-0 text-error-500 dark:text-error-400 hover:text-error-600 dark:hover:text-error-300 transition-colors ml-2 cursor-pointer"
						@click.stop="remove(tag)"
					/>
				</div>
			</div>
			<span v-else class="text-neutral-400 text-sm">{{ t('components.selectMenu.selectTags') }}</span>
		</template>

		<template #empty>
			<UButton color="success" variant="ghost" @click="createTag">{{ t('components.selectMenu.createLabel', { term: searchTerm }) }}</UButton>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import { useInfiniteScroll } from '@vueuse/core';
import type { Tag } from '~/utils/types/tag';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const searchTerm = ref('');
const tagStore = useProductTagStore();
const { tags: items, new_tag } = storeToRefs(tagStore);

const props = defineProps<{ tags: Tag[] | undefined }>();

const emit = defineEmits(['update:tags']);

const tags = computed<Tag[]>({
	get() {
		return props.tags ?? [];
	},
	set(value) {
		emit('update:tags', value);
	},
});

const selectMenu = useTemplateRef<{ viewportRef: HTMLElement }>('selectMenu');

function onOpen(open: boolean) {
	if (open && !items.value?.length) {
		tagStore.filter.current_page = 1;
		tagStore.getTags();
	}
}

onMounted(() => {
	useInfiniteScroll(
		() => selectMenu.value?.viewportRef,
		() => {
			tagStore.loadMoreTags();
		},
		{
			canLoadMore: () => {
				return !tagStore.loading && tagStore.tags.length < tagStore.total_tags;
			},
		},
	);
});

const remove = (tag: Tag) => {
	tags.value = tags.value.filter((t) => t.value !== tag.value);
};

const createTag = async () => {
	new_tag.value = {
		value: searchTerm.value,
	};
	const tag = await tagStore.addTag(searchTerm.value);
	if (tag) {
		searchTerm.value = '';
		tags.value = [...tags.value, tag];
	}
};
</script>

<style scoped></style>
