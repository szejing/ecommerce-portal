<template>
	<div class="flex h-full flex-col">
		<div class="mb-4 flex items-start justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-700">
			<div class="min-w-0">
				<h3 class="truncate text-lg font-bold text-gray-900 dark:text-white">
					{{ dateLabel }}
				</h3>
				<p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
					{{ t('pages.appointmentsCount', appointments.length) }}
				</p>
			</div>
			<UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="sm" :aria-label="t('common.close')" @click="$emit('close')" />
		</div>

		<div v-if="appointments.length > 0" class="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
			<button
				v-for="appointment in appointments"
				:key="appointment.code"
				type="button"
				class="flex w-full cursor-pointer items-start gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-gray-800/40"
				:class="[
					selectedCode === appointment.code ? 'bg-primary-50/50 dark:bg-primary-900/10' : '',
					isPastAppointment(appointment) ? 'opacity-50' : '',
				]"
				@click="$emit('select', appointment)"
			>
				<div class="mt-0.5 h-auto w-1 shrink-0 self-stretch rounded-full" :class="dotClass(appointment.status)" />
				<div class="min-w-0 flex-1">
					<div class="flex items-center justify-between gap-2">
						<p class="truncate text-sm font-medium text-gray-900 dark:text-white">
							{{ appointment.customer_name }}
						</p>
						<UBadge :color="statusColor(appointment.status)" variant="subtle" size="xs" class="shrink-0">
							{{ t('options.' + appointment.status.toLowerCase()) }}
						</UBadge>
					</div>
					<p class="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
						<UIcon name="i-heroicons-clock" class="size-3 shrink-0" aria-hidden="true" />
						{{ formatTime(appointment.start_date_time) }}
						<span v-if="appointment.duration" class="text-gray-400 dark:text-gray-500">
							· {{ t('pages.durationMinutes', { n: appointment.duration }) }}
						</span>
					</p>
					<p v-if="appointment.appt_desc" class="mt-0.5 truncate text-xs text-gray-400 dark:text-gray-500">
						{{ appointment.appt_desc }}
					</p>
				</div>
			</button>
		</div>

		<div v-else class="px-3 py-10 text-center">
			<UIcon name="i-heroicons-calendar-days" class="mx-auto mb-2 size-8 text-gray-300 dark:text-gray-600" aria-hidden="true" />
			<p class="text-sm text-gray-500 dark:text-gray-400">{{ t('pages.noAppointmentsFound') }}</p>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { format } from 'date-fns';
import { isAppointmentPast } from '~/utils/appointment-day-ops';
import type { Appointment } from '~/utils/types/appointment';

const props = withDefaults(
	defineProps<{
		date: Date;
		appointments: Appointment[];
		selectedCode?: string | null;
		getStatusColor?: (status: string) => string;
	}>(),
	{
		selectedCode: null,
		getStatusColor: () => 'primary',
	},
);

defineEmits<{
	select: [appointment: Appointment];
	close: [];
}>();

const { t } = useI18n();

const dateLabel = computed(() => format(props.date, 'EEEE, d MMMM'));

const now = ref(new Date());
let pastTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
	pastTimer = setInterval(() => {
		now.value = new Date();
	}, 60_000);
});
onUnmounted(() => {
	if (pastTimer) clearInterval(pastTimer);
});

const isPastAppointment = (appointment: Appointment) => isAppointmentPast(appointment, now.value);

const formatTime = (d: string | Date) => format(new Date(d), 'h:mm a');

const statusColor = (status: string) => props.getStatusColor(status) as 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

const dotClass = (status?: string): string => {
	if (!status) return 'bg-gray-400';
	const color = props.getStatusColor(status);
	const map: Record<string, string> = {
		primary: 'bg-primary-500',
		success: 'bg-success-500',
		warning: 'bg-warning-500',
		error: 'bg-error-500',
		info: 'bg-info-500',
		neutral: 'bg-gray-400',
	};
	return map[color] ?? 'bg-primary-500';
};
</script>
