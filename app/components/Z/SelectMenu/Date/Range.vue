<template>
	<UPopover :content="{ align: 'start' }" :modal="true">
		<UButton
			:color="props.buttonColor"
			:variant="props.buttonVariant"
			icon="i-lucide-calendar"
			class="data-[state=open]:bg-wemotooPrimary group"
			v-bind="props.buttonProps"
		>
			<span class="truncate">
				<template v-if="selected.start">
					<template v-if="selected.end"> {{ df.format(selected.start) }} - {{ df.format(selected.end) }} </template>
					<template v-else>
						{{ df.format(selected.start) }}
					</template>
				</template>
				<template v-else> {{ t('components.selectMenu.pickADate') }} </template>
			</span>

			<template #trailing>
				<UIcon
					name="i-lucide-chevron-down"
					class="shrink-0 text-dimmed size-5 group-data-[state=open]:rotate-180 transition-transform duration-200"
					:class="[props.buttonColor === 'neutral' ? 'text-default' : 'text-inverted']"
				/>
			</template>
		</UButton>

		<template #content>
			<div class="flex items-stretch sm:divide-x divide-default">
				<div class="hidden sm:flex flex-col justify-center">
					<UButton
						v-for="(range, index) in ranges"
						:key="index"
						:label="range.label"
						color="neutral"
						variant="ghost"
						class="rounded-none px-4"
						:class="[isRangeSelected(range) ? 'bg-elevated' : 'hover:bg-elevated/50']"
						truncate
						@click="selectRange(range)"
					/>
				</div>

				<UCalendar v-model="calendarRange" class="p-2" :number-of-months="numberOfMonths" range />
			</div>
		</template>
	</UPopover>
</template>

<script setup lang="ts">
import { DateFormatter, getLocalTimeZone, CalendarDate, today } from '@internationalized/date';
import type { Range } from '~/utils/interface';

const df = new DateFormatter('en-US', {
	dateStyle: 'medium',
});

const selected = defineModel<Range>({ required: true });

const props = withDefaults(
	defineProps<{
		buttonVariant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link';
		buttonColor?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral';
		buttonProps?: Record<string, unknown>;
	}>(),
	{
		buttonVariant: 'soft',
		buttonColor: 'neutral',
		buttonProps: () => ({}),
	},
);

const { t } = useI18n();
const ranges = computed(() => [
	{ label: t('components.dateRange.last7Days'), days: 7 },
	{ label: t('components.dateRange.last14Days'), days: 14 },
	{ label: t('components.dateRange.last30Days'), days: 30 },
	{ label: t('components.dateRange.last3Months'), months: 3 },
	{ label: t('components.dateRange.last6Months'), months: 6 },
	{ label: t('components.dateRange.lastYear'), years: 1 },
]);

const toCalendarDate = (date: Date) => {
	return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

const calendarRange = computed({
	get: () => ({
		start: selected.value.start ? toCalendarDate(selected.value.start) : undefined,
		end: selected.value.end ? toCalendarDate(selected.value.end) : undefined,
	}),
	set: (newValue: { start: CalendarDate | null; end: CalendarDate | null }) => {
		selected.value = {
			start: newValue.start ? newValue.start.toDate(getLocalTimeZone()) : new Date(),
			end: newValue.end ? newValue.end.toDate(getLocalTimeZone()) : new Date(),
		};
	},
});

const isRangeSelected = (range: { days?: number; months?: number; years?: number; label?: string }) => {
	if (!selected.value.start || !selected.value.end) return false;

	const currentDate = today(getLocalTimeZone());
	let startDate = currentDate.copy();

	if (range.days) {
		startDate = startDate.subtract({ days: range.days });
	} else if (range.months) {
		startDate = startDate.subtract({ months: range.months });
	} else if (range.years) {
		startDate = startDate.subtract({ years: range.years });
	}

	const selectedStart = toCalendarDate(selected.value.start);
	const selectedEnd = toCalendarDate(selected.value.end);

	return selectedStart.compare(startDate) === 0 && selectedEnd.compare(currentDate) === 0;
};

const selectRange = (range: { days?: number; months?: number; years?: number }) => {
	const endDate = today(getLocalTimeZone());
	let startDate = endDate.copy();

	if (range.days) {
		startDate = startDate.subtract({ days: range.days });
	} else if (range.months) {
		startDate = startDate.subtract({ months: range.months });
	} else if (range.years) {
		startDate = startDate.subtract({ years: range.years });
	}

	selected.value = {
		start: startDate.toDate(getLocalTimeZone()),
		end: endDate.toDate(getLocalTimeZone()),
	};
};

// Check if screen is mobile
const isMobile = ref(false);

const checkMobile = () => {
	isMobile.value = window.innerWidth < 640; // sm breakpoint
};

// Number of months to display in calendar
const numberOfMonths = computed(() => (isMobile.value ? 1 : 2));

onMounted(() => {
	checkMobile();
	window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
	window.removeEventListener('resize', checkMobile);
});
</script>
