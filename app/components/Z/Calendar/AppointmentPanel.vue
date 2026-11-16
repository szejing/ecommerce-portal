<template>
	<USlideover v-if="isLgUp" v-model:open="open" side="right" :ui="{ content: 'max-w-md w-full' }">
		<template #content>
			<div class="flex h-full flex-col overflow-y-auto p-4 sm:p-6">
				<ZCalendarAppointmentPanelBody
					:appointment="appointment"
					:day-date="dayDate"
					:day-appointments="dayAppointments"
					:position-label="positionLabel"
					:can-go-previous="canGoPrevious"
					:can-go-next="canGoNext"
					@close="emit('close')"
					@back="emit('back')"
					@previous="emit('previous')"
					@next="emit('next')"
					@edit="emit('edit', $event)"
					@delete="emit('delete', $event)"
					@select="emit('select', $event)"
				/>
			</div>
		</template>
	</USlideover>

	<UDrawer v-else v-model:open="open" :title="title" direction="bottom" handle-only>
		<button type="button" class="sr-only" tabindex="-1" aria-hidden="true">{{ title }}</button>
		<template #body>
			<div class="max-h-[min(82dvh,48rem)] overflow-y-auto overscroll-contain pb-4">
				<ZCalendarAppointmentPanelBody
					:appointment="appointment"
					:day-date="dayDate"
					:day-appointments="dayAppointments"
					:position-label="positionLabel"
					:can-go-previous="canGoPrevious"
					:can-go-next="canGoNext"
					@close="emit('close')"
					@back="emit('back')"
					@previous="emit('previous')"
					@next="emit('next')"
					@edit="emit('edit', $event)"
					@delete="emit('delete', $event)"
					@select="emit('select', $event)"
				/>
			</div>
		</template>
	</UDrawer>
</template>

<script lang="ts" setup>
import { useMediaQuery } from '@vueuse/core';
import { format } from 'date-fns';
import type { Appointment } from '~/utils/types/appointment';

const props = defineProps<{
	open: boolean;
	appointment: Appointment | null;
	dayDate: Date | null;
	dayAppointments: Appointment[];
	positionLabel: string | null;
	canGoPrevious: boolean;
	canGoNext: boolean;
}>();

const emit = defineEmits<{
	'update:open': [open: boolean];
	close: [];
	back: [];
	previous: [];
	next: [];
	edit: [appointment: Appointment];
	delete: [code: string];
	select: [appointment: Appointment];
}>();

const { t } = useI18n();
const isLgUp = useMediaQuery('(min-width: 1024px)');

const open = computed({
	get: () => props.open,
	set: (value: boolean) => emit('update:open', value),
});

const title = computed(() => {
	if (props.appointment) return t('pages.appointmentDetails');
	if (props.dayDate) return format(props.dayDate, 'EEEE, d MMMM');
	return t('pages.appointmentDetails');
});
</script>
