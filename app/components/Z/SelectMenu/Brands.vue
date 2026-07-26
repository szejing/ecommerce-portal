<template>
	<USelectMenu
		ref="selectMenu"
		v-model="brands"
		v-model:search-term="searchTerm"
		by="code"
		:items="items"
		:search-input="{
			placeholder: 'Search or add brands…',
			icon: 'i-lucide-search',
		}"
		size="md"
		multiple
		label-key="code"
		description-key="description"
		:placeholder="t('components.selectMenu.selectBrands')"
		variant="formTrigger"
		:loading="brandStore.loading"
		@update:open="onOpen"
	>
		<template #default>
			<div v-if="brands && brands.length > 0" class="flex flex-wrap gap-1.5">
				<div
					v-for="brand in brands"
					:key="brand.code"
					class="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1"
				>
					<p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ brand.code }}</p>
					<UIcon
						:name="ICONS.CROSS"
						class="w-4 h-4 shrink-0 text-error-500 dark:text-error-400 hover:text-error-600 dark:hover:text-error-300 transition-colors ml-2 cursor-pointer"
						@click.stop="remove(brand)"
					/>
				</div>
			</div>
			<span v-else class="text-neutral-400 text-sm">{{ t('components.selectMenu.selectBrands') }}</span>
		</template>

		<template #empty>
			<UButton color="success" variant="ghost" @click="createBrand">{{ t('components.selectMenu.createLabel', { term: searchTerm }) }}</UButton>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import { useInfiniteScroll } from '@vueuse/core';
import type { Brand } from '~/utils/types/brand';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const searchTerm = ref('');
const brandStore = useBrandStore();
const { brands: items, new_brand } = storeToRefs(brandStore);

const props = defineProps<{ brands: Brand[] | undefined }>();

const emit = defineEmits(['update:brands']);

const brands = computed<Brand[]>({
	get() {
		return props.brands ?? [];
	},
	set(value) {
		emit('update:brands', JSON.parse(JSON.stringify(value)));
	},
});

const selectMenu = useTemplateRef<{ viewportRef: HTMLElement }>('selectMenu');

function onOpen(open: boolean) {
	if (open && !items.value?.length) {
		brandStore.filter.current_page = 1;
		brandStore.getBrands();
	}
}

onMounted(() => {
	useInfiniteScroll(
		() => selectMenu.value?.viewportRef,
		() => {
			brandStore.loadMoreBrands();
		},
		{
			canLoadMore: () => {
				return !brandStore.loading && brandStore.brands.length < brandStore.total_brands;
			},
		},
	);
});

const remove = (brand: Brand) => {
	brands.value = brands.value.filter((b) => b.code !== brand.code);
};

const createBrand = async () => {
	new_brand.value = {
		code: searchTerm.value,
		description: searchTerm.value,
		is_active: true,
	};
	const brand = await brandStore.createBrand();
	if (brand) {
		searchTerm.value = '';
		brands.value = [...brands.value, brand];
	}
};
</script>

<style scoped></style>
