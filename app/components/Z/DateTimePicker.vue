<template>
	<div class="space-y-4">
		<UCalendar v-model="internalDate" :min-value="minDateValue" :max-value="maxDateValue" />

		<div class="flex items-center gap-2 px-4 pb-2">
			<UIcon name="i-heroicons-clock" class="text-gray-500" />
			<UInput
				v-model="timeValue"
				type="time"
				:placeholder="selectTimeLabel"
				:aria-label="timeInputLabel"
				class="flex-1"
			/>
		</div>

		<div class="flex justify-end gap-2 px-4 pb-2">
			<UButton variant="ghost" size="sm" @click="emit('close')"> {{ cancelLabel }} </UButton>
			<UButton size="sm" @click="applyDateTime"> {{ applyLabel }} </UButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import { CalendarDate, type DateValue } from '@internationalized/date';

defineOptions({
	inheritAttrs: false,
});

const props = defineProps({
	modelValue: {
		type: [Date, String] as PropType<Date | string | null>,
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
	selectTimeLabel: {
		type: String,
		default: 'Select time',
	},
	timeInputLabel: {
		type: String,
		default: 'Time',
	},
	cancelLabel: {
		type: String,
		default: 'Cancel',
	},
	applyLabel: {
		type: String,
		default: 'Apply',
	},
});

const emit = defineEmits(['update:model-value', 'close']);

// Convert JavaScript Date to CalendarDate
const dateToCalendarDate = (date: Date | null): DateValue | undefined => {
	if (!date) return undefined;
	return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

// Get Date object from modelValue
const getDateFromModelValue = (): Date | null => {
	if (!props.modelValue) return null;
	if (props.modelValue instanceof Date) return props.modelValue;
	if (typeof props.modelValue === 'string') return new Date(props.modelValue);
	return null;
};

const minDateValue = computed(() => dateToCalendarDate(props.minDate));
const maxDateValue = computed(() => dateToCalendarDate(props.maxDate));

const internalDate = shallowRef<DateValue | undefined>(dateToCalendarDate(getDateFromModelValue()));
const timeValue = ref<string>('');

// Initialize time from modelValue
onMounted(() => {
	const date = getDateFromModelValue();
	if (date) {
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		timeValue.value = `${hours}:${minutes}`;
	}
});

// Watch modelValue changes
watch(
	() => props.modelValue,
	(newValue) => {
		const date = getDateFromModelValue();
		if (date) {
			internalDate.value = dateToCalendarDate(date);
			const hours = date.getHours().toString().padStart(2, '0');
			const minutes = date.getMinutes().toString().padStart(2, '0');
			timeValue.value = `${hours}:${minutes}`;
		}
	},
);

const applyDateTime = () => {
	if (!internalDate.value) return;

	let hours = 0;
	let minutes = 0;

	if (timeValue.value) {
		const [h, m] = timeValue.value.split(':').map(Number);
		hours = h || 0;
		minutes = m || 0;
	}

	const dateTime = new Date(internalDate.value.year, internalDate.value.month - 1, internalDate.value.day, hours, minutes);

	emit('update:model-value', dateTime);
	emit('close');
};
</script>
