<template>
	<UModal
		v-model:open="isOpen"
		:title="date ? format(date, 'EEEE, d MMMM') : ''"
		:ui="{ content: 'w-full sm:max-w-[90%]' }"
		:close="{
			onClick: () => {
				isOpen = false;
			},
		}"
		@update:open="onOpenChange"
	>
		<template #body>
			<div class="flex flex-col lg:flex-row gap-4 lg:gap-6">
				<!-- Appointments list -->
				<div class="flex-1 min-w-0">
					<div v-if="appointments.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800 max-h-[60vh] overflow-y-auto pr-1">
						<div
							v-for="appointment in appointments"
							:key="appointment.code"
							class="flex items-start gap-3 px-1.5 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors rounded-lg"
							:class="[selectedAppointment?.code === appointment.code ? 'bg-primary-50/50 dark:bg-primary-900/10' : '']"
							@click="onSelectAppointment(appointment)"
						>
							<div class="w-1 self-stretch rounded-full shrink-0 mt-0.5" :class="getDotColorClass(appointment.status)" />
							<div class="flex-1 min-w-0">
								<div class="flex items-center justify-between gap-2">
									<p class="font-medium text-sm text-gray-900 dark:text-white truncate">
										{{ appointment.customer_name }}
									</p>
									<UBadge
										:color="getStatusColor(appointment.status) as 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'"
										variant="subtle"
										size="xs"
										class="shrink-0"
									>
										{{ t('options.' + appointment.status.toLowerCase()) }}
									</UBadge>
								</div>
								<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
									<UIcon name="i-heroicons-clock" class="w-3 h-3 shrink-0" />
									{{ formatTime(appointment.start_date_time) }}
									<span v-if="appointment.duration" class="text-gray-400 dark:text-gray-500">
										· {{ t('pages.durationMinutes', { n: appointment.duration }) }}
									</span>
								</p>
								<p v-if="appointment.appt_desc" class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
									{{ appointment.appt_desc }}
								</p>
							</div>
						</div>
					</div>
					<div v-else class="px-3 py-8 text-center">
						<UIcon name="i-heroicons-calendar-days" class="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
						<p class="text-xs text-gray-400 dark:text-gray-500">
							{{ t('pages.noAppointmentsFound') }}
						</p>
					</div>
				</div>

				<!-- Appointment detail -->
				<div v-if="selectedAppointment" class="flex-1 min-w-0 lg:max-w-sm">
					<ZCalendarAppointmentDetail :appointment="selectedAppointment" @close="selectedAppointment = null" @edit="onEdit" @delete="onDelete" />
				</div>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import { format } from 'date-fns';
import type { Appointment } from '~/utils/types/appointment';

const isOpen = ref(true);

const props = withDefaults(
	defineProps<{
		date: Date | null;
		appointments: Appointment[];
		getStatusColor?: (status: string) => string;
		onSelectAppointment?: (appointment: Appointment) => void;
		onEdit?: (appointment: Appointment) => void;
		onDelete?: (code: string) => void;
	}>(),
	{
		appointments: () => [],
		selectedCode: null,
		getStatusColor: () => 'primary',
	},
);

const emit = defineEmits<{
	close: [value?: unknown];
	selectAppointment: [appointment: Appointment];
	edit: [appointment: Appointment];
	delete: [code: string];
}>();

const onOpenChange = (value: boolean) => {
	if (!value) emit('close', undefined);
};

const { t } = useI18n();

const selectedAppointment = ref<Appointment | null>(null);

watch(
	() => props.appointments,
	(list) => {
		if (!list || list.length === 0) {
			selectedAppointment.value = null;
			return;
		}

		// If current selected appointment is no longer in list, or none selected, pick first
		if (!selectedAppointment.value || !list.some((a) => a.code === selectedAppointment.value?.code)) {
			selectedAppointment.value = list[0] ?? null;
		}
	},
	{ immediate: true },
);

const onSelectAppointment = (appointment: Appointment) => {
	selectedAppointment.value = appointment;
	props.onSelectAppointment?.(appointment);
	emit('selectAppointment', appointment);
};

const onEdit = (appointment: Appointment) => {
	props.onEdit?.(appointment);
	emit('edit', appointment);
};

const onDelete = (code: string) => {
	props.onDelete?.(code);
	emit('delete', code);
};

const formatTime = (d: string | Date) => format(new Date(d), 'h:mm a');

const getDotColorClass = (status?: string): string => {
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

const getStatusColor = (status: string) => props.getStatusColor(status);
</script>
