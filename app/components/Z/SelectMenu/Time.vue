<template>
	<USelectMenu
		v-model="selectedLabel"
		:items="items"
		value-key="label"
		size="md"
		class="min-w-0 w-full"
		:search-input="{
			placeholder: t('components.selectMenu.searchTime'),
			icon: 'i-lucide-search',
		}"
	>
		<template #default>
			<span v-if="selectedLabel" class="truncate"> {{ prefix }}: {{ selectedLabel }} </span>
			<span v-else class="text-muted">{{ title }}</span>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import { HOUR_SELECT_LABELS, hhmmToSelectLabel, selectLabelToHhmm } from '~/utils/time-select-hh24';

const hourLabels = HOUR_SELECT_LABELS as readonly string[];
const items = computed(() => hourLabels.map((t) => ({ label: t })));

const props = withDefaults(
	defineProps<{
		title: string;
		time: string | null;
		type: 'start' | 'end';
		/** `display` = v-model is 12h label. `hh24` = 4-digit HHmm (e.g. 0900, 1900). */
		valueFormat?: 'display' | 'hh24';
	}>(),
	{ valueFormat: 'display' },
);

const emit = defineEmits<{
	'update:time': [value: string];
}>();

const { t } = useI18n();
const prefix = computed(() => (props.type === 'start' ? t('components.zInput.startTime') : t('components.zInput.endTime')));

const selectedLabel = computed({
	get(): string {
		if (props.valueFormat === 'hh24') {
			return props.time ? hhmmToSelectLabel(props.time) : '';
		}
		return props.time ?? '';
	},
	set(val: string) {
		if (props.valueFormat === 'hh24') {
			if (!val) {
				emit('update:time', '');
				return;
			}
			const out = selectLabelToHhmm(val);
			emit('update:time', out ?? '');
			return;
		}
		emit('update:time', val);
	},
});
</script>
