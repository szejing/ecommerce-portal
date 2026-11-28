<template>
	<UCalendar v-model="internalRange" range :number-of-months="isWide ? 2 : 1" :min-value="minDateValue" :max-value="maxDateValue" />
</template>

<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core';
import { CalendarDate, type DateValue } from '@internationalized/date';

defineOptions({
	inheritAttrs: false,
});

export interface DateRange {
	start: Date | null;
	end: Date | null;
}

const isWide = useMediaQuery('(min-width: 640px)', { ssrWidth: 640 });

const props = defineProps({
	modelValue: {
		type: Object as PropType<DateRange | null>,
		default: null,
	},
	minDate: {
		type: Date,
		default: null,
	},
	maxDate: {
		type: Date,
		default: null,
	},
});

const emit = defineEmits(['update:model-value', 'close']);

// Convert JavaScript Date to CalendarDate
const dateToCalendarDate = (date: Date | null): DateValue | undefined => {
	if (!date) return undefined;
	return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

// Convert CalendarDate to JavaScript Date
const calendarDateToDate = (calendarDate: DateValue | undefined): Date | null => {
	if (!calendarDate) return null;
	return new Date(calendarDate.year, calendarDate.month - 1, calendarDate.day);
};

const minDateValue = computed(() => dateToCalendarDate(props.minDate));
const maxDateValue = computed(() => dateToCalendarDate(props.maxDate));

const internalRange = computed({
	get: () => {
		if (!props.modelValue) return undefined;
		return {
			start: dateToCalendarDate(props.modelValue.start),
			end: dateToCalendarDate(props.modelValue.end),
		};
	},
	set: (value) => {
		if (!value) {
			emit('update:model-value', null);
			return;
		}

		const range: DateRange = {
			start: calendarDateToDate(value.start),
			end: calendarDateToDate(value.end),
		};

		emit('update:model-value', range);

		// Only emit close when both start and end dates are selected
		// if (range.start && range.end) {
		// 	emit('close');
		// }
	},
});
</script>
