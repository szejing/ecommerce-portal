<template>
	<USelectMenu
		v-model="selectedColumns"
		:items="props.columns"
		multiple
		:ui="{
			content: 'w-50 max-h-40 overflow-y-auto scrollbar-hide',
		}"
	>
		<UButton icon="i-heroicons-view-columns" color="neutral" size="xs">{{ t('components.selectMenu.showColumns') }}</UButton>
	</USelectMenu>
</template>

<script lang="ts" setup>
const { t } = useI18n();
const props = defineProps({
	columns: {
		type: Array as PropType<
			{
				key: string;
				label: string;
				sortable?: boolean;
			}[]
		>,
		required: true,
	},
	selectedColumns: {
		type: Array as PropType<
			{
				key: string;
				label: string;
				sortable?: boolean;
			}[]
		>,
		required: true,
	},
});

const selectedColumns = ref(props.columns);

const emit = defineEmits(['update:columns']);

watch(selectedColumns, (value) => {
	emit('update:columns', value);
});
</script>

<style scoped></style>
