<template>
	<div
		class="overflow-hidden rounded-lg border border-gray-200 bg-default dark:border-gray-700"
		role="region"
		:aria-label="format(date, 'EEEE, d MMMM yyyy')"
	>
		<!-- Appointment rows -->
		<div class="divide-y divide-gray-200 dark:divide-gray-700">
			<button
				v-for="item in rows"
				:key="item.appointment.code"
				type="button"
				class="grid min-h-16 w-full grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 px-3 py-3 text-left lg:flex lg:items-center lg:gap-4 lg:px-4 lg:py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
				:class="[
					selectedCode === item.appointment.code ? 'bg-primary-50 dark:bg-primary-900/20' : '',
					item.isPast ? 'lg:opacity-50' : '',
				]"
				@click="$emit('select', item.appointment)"
			>
				<!-- Time & duration -->
				<div class="min-w-0 shrink-0 lg:w-28">
					<p class="text-sm font-semibold text-gray-900 dark:text-white">{{ item.timeText }}</p>
					<p v-if="item.durationText" class="mt-0.5 text-xs text-muted">{{ item.durationText }}</p>
				</div>
				<!-- Client & service -->
				<div class="flex-1 min-w-0">
					<p class="text-sm font-semibold text-highlighted wrap-anywhere lg:truncate">{{ item.appointment.customer_name || item.appointment.code }}</p>
					<p class="mt-0.5 text-sm text-muted wrap-anywhere lg:truncate">
						{{ item.appointment.appt_desc || t('pages.noDescription') }}
					</p>
				</div>
				<!-- Status badge -->
				<div class="col-start-2 shrink-0 justify-self-start">
					<UBadge
						:color="item.statusColor"
						variant="subtle"
						size="sm"
						class="border border-current/20"
					>
						{{ t('options.' + item.appointment.status.toLowerCase()) }}
					</UBadge>
				</div>
			</button>
		</div>

		<!-- Empty state -->
		<div
			v-if="rows.length === 0"
			class="flex flex-col items-center justify-center py-12 gap-3 text-center px-4"
		>
			<UIcon name="i-heroicons-calendar-days" class="w-10 h-10 text-gray-300 dark:text-gray-600" />
			<p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ t('pages.noAppointmentsFound') }}</p>
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
		getStatusColor: () => 'primary',
	},
);

defineEmits<{
	select: [appointment: Appointment];
}>();

const { t } = useI18n();

function formatDurationMinutes(minutes: number): string {
	if (minutes >= 60 && minutes % 60 === 0) {
		const hours = minutes / 60;
		return hours === 1 ? t('pages.durationOneHour') : t('pages.durationHours', { n: hours });
	}
	return t('pages.durationMinutesShort', { n: minutes });
}

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

const rows = computed(() => {
	return props.appointments.map((appointment) => {
		const start = new Date(appointment.start_date_time);
		const timeText = format(start, 'h:mm a');
		const end = appointment.end_date_time ? new Date(appointment.end_date_time) : undefined;
		const minutes = appointment.duration ?? (end ? Math.round((end.getTime() - start.getTime()) / 60_000) : undefined);
		const durationText = minutes != null && Number.isFinite(minutes) && minutes > 0 ? formatDurationMinutes(minutes) : '';
		const statusColor = props.getStatusColor(appointment.status);
		return {
			appointment,
			timeText,
			durationText,
			isPast: isAppointmentPast(appointment, now.value),
			statusColor: statusColor as 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral',
		};
	});
});
</script>
