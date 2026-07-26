<template>
	<USelectMenu
		v-model="taxes"
		v-model:search-term="searchTerm"
		:items="items"
		:search-input="{
			placeholder: 'Search...',
			icon: 'i-lucide-search',
		}"
		size="md"
		multiple
		label-key="code"
		description-key="description"
		:placeholder="t('components.selectMenu.selectTaxes')"
	>
		<template #default>
			<div v-if="taxes && taxes.length > 0" class="flex flex-wrap gap-1.5">
				<div
					v-for="tax in taxes"
					:key="tax.code"
					class="flex items-center justify-between bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1"
				>
					<p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ tax.code }}</p>
					<UIcon
						:name="ICONS.CROSS"
						class="w-4 h-4 shrink-0 text-error-500 dark:text-error-400 hover:text-error-600 dark:hover:text-error-300 transition-colors ml-2 cursor-pointer"
						@click.stop="remove(tax)"
					/>
				</div>
			</div>
			<span v-else class="text-neutral-400 text-sm">{{ t('components.selectMenu.selectTaxes') }}</span>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import type { Tax } from '~/utils/types/tax';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const searchTerm = ref('');
const taxStore = useTaxStore();
const { taxes: items } = storeToRefs(taxStore);

const props = defineProps<{ taxes: Tax[] | undefined }>();

const emit = defineEmits(['update:taxes']);

onMounted(async () => {
	if (items.value.length === 0) {
		await taxStore.getTaxes();
	}
});

const taxes = computed({
	get() {
		return props.taxes ?? [];
	},
	set(value) {
		emit('update:taxes', value);
	},
});

const remove = (tax: Tax) => {
	taxes.value = taxes.value.filter((t) => t.code !== tax.code);
};
</script>

<style scoped></style>
