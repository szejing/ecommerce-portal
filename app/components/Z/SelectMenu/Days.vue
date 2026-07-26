<template>
	<USelectMenu
		v-model="days"
		:items="daysItems"
		size="md"
		multiple
		value-key="short"
		class="min-w-0 w-full"
		:search-input="{
			placeholder: t('components.selectMenu.searchDays'),
			icon: 'i-lucide-search',
		}"
	>
		<template #default>
			<span v-if="days.length > 0" class="truncate">{{ displayDays }}</span>
			<span v-else class="text-muted">{{ t('components.zInput.selectDays') }}</span>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
const { t } = useI18n();
const days_options = [
	{ seq: 1, short: 'Mon', long: 'Monday' },
	{ seq: 2, short: 'Tue', long: 'Tuesday' },
	{ seq: 3, short: 'Wed', long: 'Wednesday' },
	{ seq: 4, short: 'Thu', long: 'Thursday' },
	{ seq: 5, short: 'Fri', long: 'Friday' },
	{ seq: 6, short: 'Sat', long: 'Saturday' },
	{ seq: 7, short: 'Sun', long: 'Sunday' },
];

const daysItems = computed(() =>
	days_options.map((day) => ({
		...day,
		label: day.long,
	})),
);

const props = defineProps<{ days: string[] | null }>();

const emit = defineEmits(['update:days']);

const days = computed({
	get() {
		return (
			props.days?.toSorted((a, b) => {
				const aSeq = days_options.find((d) => d.short === a)?.seq ?? 0;
				const bSeq = days_options.find((d) => d.short === b)?.seq ?? 0;
				return aSeq - bSeq;
			}) ?? []
		);
	},
	set(val) {
		emit('update:days', val);
	},
});

const displayDays = computed(() =>
	days.value.map((short) => days_options.find((d) => d.short === short)?.short ?? short).join(', '),
);
</script>
