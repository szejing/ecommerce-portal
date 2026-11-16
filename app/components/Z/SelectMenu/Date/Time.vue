<template>
	<UPopover :popper="{ placement: 'bottom-start' }">
		<UButton
			icon="i-heroicons-calendar-days-20-solid"
			:label="currentDateTime ? getFormattedDate(currentDateTime, format) : placeholder"
			variant="outline"
			color="neutral"
			class="w-full justify-start"
		/>

		<template #content="{ close }">
			<ZDateTimePicker v-model="currentDateTime" is-required :min-date="minDate" :max-date="maxDate" @close="close" />
		</template>
	</UPopover>
</template>

<script lang="ts" setup>
import { getFormattedDate } from 'yeppi-common';

const props = defineProps<{ dateTime: Date | undefined; placeholder: string; minDate?: Date; maxDate?: Date; format?: string }>();

const format = computed(() => {
	if (props.format) {
		return props.format;
	}

	return 'dd/MM/yyyy hh:mm a';
});

const maxDate = computed(() => {
	if (props.maxDate) {
		return props.maxDate;
	}

	return new Date();
});

const emit = defineEmits(['update:dateTime']);

const currentDateTime = computed({
	get() {
		return props.dateTime;
	},
	set(dateTime) {
		emit('update:dateTime', dateTime);
	},
});
</script>

<style scoped></style>
