<template>
	<div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-default">
		<!-- Date group -->
		<div class="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
			<span class="font-semibold text-gray-900 dark:text-white">{{ dateHeader }}</span>
			<span class="text-gray-500 dark:text-gray-400 font-normal ml-1">{{ dayOfWeek }}</span>
		</div>

		<!-- Appointment rows -->
		<div class="divide-y divide-gray-200 dark:divide-gray-700">
			<button
				v-for="item in rows"
				:key="item.appointment.code"
				type="button"
				class="w-full flex items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
				:class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedCode === item.appointment.code }"
				@click="$emit('select', item.appointment)"
			>
				<!-- Time & duration -->
				<div class="shrink-0 w-24 sm:w-28">
					<p class="text-sm font-semibold text-gray-900 dark:text-white">{{ item.timeText }}</p>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ item.durationText }}</p>
				</div>
				<!-- Client & service -->
				<div class="flex-1 min-w-0">
					<p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ item.appointment.customer_name }}</p>
					<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
						{{ item.appointment.appt_desc || t('pages.noDescription') }}
					</p>
				</div>
				<!-- Status badge -->
				<div class="shrink-0">
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

const dateHeader = computed(() => format(props.date, 'MMM d, yyyy'));
const dayOfWeek = computed(() => format(props.date, 'EEEE'));

function formatDurationMinutes(minutes: number): string {
	if (minutes >= 60 && minutes % 60 === 0) {
		const hours = minutes / 60;
		return hours === 1 ? t('pages.durationOneHour') : t('pages.durationHours', { n: hours });
	}
	return t('pages.durationMinutesShort', { n: minutes });
}

const rows = computed(() => {
	return props.appointments.map((appointment) => {
		const start = new Date(appointment.start_date_time);
		const end = new Date(appointment.end_date_time);
		const timeText = format(start, 'h:mm a');
		const minutes = appointment.duration ?? Math.round((end.getTime() - start.getTime()) / 60_000);
		const durationText = formatDurationMinutes(minutes);
		const statusColor = props.getStatusColor(appointment.status);
		return {
			appointment,
			timeText,
			durationText,
			statusColor: statusColor as 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral',
		};
	});
});
</script>
