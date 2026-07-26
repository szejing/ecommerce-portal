<template>
	<div class="space-y-3">
		<p class="text-sm text-neutral-600 dark:text-neutral-400">
			{{ t('components.productUpdate.productTypeDescription') }}
		</p>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<button
				v-for="type in items"
				:key="type.id"
				type="button"
				class="flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
				:class="
					productTypeId === type.id
						? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-200 shadow-sm'
						: 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 text-neutral-800 dark:text-neutral-200'
				"
				@click="selectType(type.id)"
			>
				<div
					class="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
					:class="productTypeId === type.id ? 'bg-primary-500 text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'"
				>
					<UIcon :name="iconForType(type)" class="w-5 h-5" />
				</div>
				<div class="min-w-0 flex-1">
					<span class="block font-semibold capitalize">{{ type.value }}</span>
					<span
						class="mt-0.5 block text-xs"
						:class="productTypeId === type.id ? 'text-primary-600 dark:text-primary-300' : 'text-neutral-500 dark:text-neutral-400'"
					>
						{{ descriptionForType(type) }}
					</span>
				</div>
				<div v-show="productTypeId === type.id" class="shrink-0 text-primary-500" aria-hidden="true">
					<UIcon name="i-heroicons-check-circle-20-solid" class="w-5 h-5" />
				</div>
			</button>
		</div>
		<p v-if="!items.length" class="text-sm text-neutral-500">
			{{ t('components.selectMenu.selectType') }}
		</p>
	</div>
</template>

<script lang="ts" setup>
import type { ProductType } from '~/utils/types/product-type';
import { ICONS } from '~/utils/icons';

const productTypeStore = useProductTypeStore();
const { prod_types: items } = storeToRefs(productTypeStore);

const props = defineProps<{ typeId: number | undefined }>();

const emit = defineEmits(['update:typeId']);

const productTypeId = computed({
	get() {
		return props.typeId;
	},
	set(value) {
		emit('update:typeId', value);
	},
});

function selectType(id: number) {
	emit('update:typeId', id);
}

function iconForType(type: ProductType): string {
	const v = type.value.toLowerCase();
	if (v.includes('item') || v.includes('product') || v.includes('physical')) return ICONS.CUBE;
	if (v.includes('service')) return 'i-heroicons-wrench-screwdriver';
	return ICONS.CUBE;
}

const { t } = useI18n();

function descriptionForType(type: ProductType): string {
	const v = type.value.toLowerCase();
	if (v.includes('item') || v.includes('product') || v.includes('physical')) return t('components.selectMenu.productTypeItemDesc');
	if (v.includes('service')) return t('components.selectMenu.productTypeServiceDesc');
	return type.value;
}
</script>
