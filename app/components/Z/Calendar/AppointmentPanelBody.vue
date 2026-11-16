<template>
	<template v-if="appointment">
		<UButton
			v-if="dayDate"
			color="neutral"
			variant="ghost"
			size="sm"
			icon="i-heroicons-arrow-left"
			class="mb-3 w-fit cursor-pointer"
			:label="t('pages.backToDayAgenda')"
			@click="emit('back')"
		/>
		<ZCalendarAppointmentDetail
			:appointment="appointment"
			:position-label="positionLabel"
			:can-go-previous="canGoPrevious"
			:can-go-next="canGoNext"
			@close="emit('close')"
			@previous="emit('previous')"
			@next="emit('next')"
			@edit="emit('edit', $event)"
			@delete="emit('delete', $event)"
		/>
	</template>
	<ZCalendarDayAgenda
		v-else-if="dayDate"
		:date="dayDate"
		:appointments="dayAppointments"
		:get-status-color="statusColor"
		@select="emit('select', $event)"
		@close="emit('close')"
	/>
</template>

<script lang="ts" setup>
import { AppointmentStatus } from 'yeppi-common';
import type { Appointment } from '~/utils/types/appointment';
import { getAppointmentStatusColor } from '~/utils/options';

defineProps<{
	appointment: Appointment | null;
	dayDate: Date | null;
	dayAppointments: Appointment[];
	positionLabel: string | null;
	canGoPrevious: boolean;
	canGoNext: boolean;
}>();

const emit = defineEmits<{
	close: [];
	back: [];
	previous: [];
	next: [];
	edit: [appointment: Appointment];
	delete: [code: string];
	select: [appointment: Appointment];
}>();

const { t } = useI18n();

const statusColor = (status: string) => getAppointmentStatusColor(status as AppointmentStatus);
</script>
