<template>
	<USelectMenu
		v-model="tax"
		v-model:search-term="searchTerm"
		:items="items"
		:search-input="{
			placeholder: 'Search tax…',
			icon: 'i-lucide-search',
		}"
		size="md"
		label-key="code"
		description-key="description"
		:placeholder="t('components.selectMenu.selectTax')"
	>
	</USelectMenu>
</template>

<script lang="ts" setup>
import type { Tax } from '~/utils/types/tax';

const { t } = useI18n();

const searchTerm = ref('');
const taxStore = useTaxStore();
const { taxes: items } = storeToRefs(taxStore);

const props = defineProps<{ tax: Tax | string | undefined }>();

const emit = defineEmits(['update:tax']);

onMounted(async () => {
	if (items.value.length === 0) {
		await taxStore.getTaxes();
	}
});

const tax = computed({
	get() {
		if (typeof props.tax === 'string') {
			return items.value.find((tax) => tax.code === props.tax);
		}

		return props.tax ?? undefined;
	},
	set(value) {
		emit('update:tax', value);
	},
});

const remove = () => {
	emit('update:tax', undefined);
};
</script>

<style scoped></style>
