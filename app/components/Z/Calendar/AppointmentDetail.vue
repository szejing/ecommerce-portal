<template>
	<UCard>
		<div class="flex items-center justify-between mb-4 sm:mb-6">
			<div class="flex items-center gap-2 sm:gap-3 min-w-0">
				<UIcon name="i-heroicons-document-text" class="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400 shrink-0" />
				<div class="min-w-0">
					<h3 class="font-bold text-lg sm:text-xl text-gray-900 dark:text-white truncate">{{ appointment.code }}</h3>
					<p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{{ t('pages.appointmentDetails') }}</p>
				</div>
			</div>
			<div class="flex items-center gap-2 shrink-0">
				<UBadge :color="getAppointmentStatusColor(appointment.status)" variant="subtle" size="md" class="hidden sm:inline-flex">
					{{ t('options.' + appointment.status.toLowerCase()) }}
				</UBadge>
				<UBadge :color="getAppointmentStatusColor(appointment.status)" variant="subtle" size="sm" class="sm:hidden">
					{{ t('options.' + appointment.status.toLowerCase()) }}
				</UBadge>
				<UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" size="sm" @click="$emit('close')" />
			</div>
		</div>
		<div class="space-y-4 sm:space-y-6">
			<div class="p-3 sm:p-4 bg-primary-50 dark:bg-primary-900/10 rounded-lg border border-primary-200 dark:border-primary-800">
				<div class="flex items-center gap-3 sm:gap-4">
					<div class="p-2 sm:p-3 bg-primary-100 dark:bg-primary-900/20 rounded-lg shrink-0">
						<UIcon name="i-heroicons-calendar-days" class="w-5 h-5 sm:w-7 sm:h-7 text-primary-600 dark:text-primary-400" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">{{ t('pages.appointmentDateTime') }}</p>
						<p class="text-sm sm:text-lg font-bold text-gray-900 dark:text-white wrap-break-word">
							{{ formatAppointmentDateRange(appointment.start_date_time, appointment.end_date_time) }}
						</p>
						<p v-if="appointment.duration" class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
							<UIcon name="i-heroicons-clock" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
							{{ t('pages.durationMinutes', { n: appointment.duration }) }}
						</p>
					</div>
				</div>
			</div>
			<div>
				<h4 class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">{{ t('pages.serviceDetails') }}</h4>
				<div :class="['flex gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg', appointment.ref_no ? 'items-start' : 'items-center']">
					<div class="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0">
						<UIcon name="i-heroicons-wrench" class="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-gray-900 dark:text-white mb-1 wrap-break-word">{{ appointment.appt_desc || t('pages.noDescription') }}</p>
						<p v-if="appointment.ref_no" class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
							<UIcon name="i-heroicons-hashtag" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
							{{ t('pages.reference') }}: {{ appointment.ref_no }}
						</p>
					</div>
				</div>
			</div>
			<div>
				<h4 class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">{{ t('components.orderDetail.customerInformation') }}</h4>
				<div class="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
					<div class="p-2 sm:p-3 bg-primary-100 dark:bg-primary-900/20 rounded-lg shrink-0">
						<UIcon name="i-heroicons-user" class="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" />
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-gray-900 dark:text-white wrap-break-word">{{ appointment.customer_name }}</p>
						<p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
							<UIcon name="i-heroicons-phone" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
							{{ appointment.customer_phone }}
						</p>
					</div>
				</div>
			</div>
			<div class="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
				<UButton color="primary" variant="solid" class="justify-center" @click="$emit('edit', appointment)">
					<UIcon name="i-heroicons-pencil-square" class="w-4 h-4 mr-2" />
					{{ t('pages.editAppointment') }}
				</UButton>
				<UButton color="error" variant="soft" class="justify-center" @click="$emit('delete', appointment.code)">
					<UIcon name="i-heroicons-trash" class="w-4 h-4 mr-2 sm:mr-0" />
					<span class="sm:hidden">{{ t('common.delete') }}</span>
				</UButton>
			</div>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import { getAppointmentStatusColor } from '~/utils/options/appointment-status';
import type { Appointment } from '~/utils/types/appointment';
import { formatAppointmentDateRange } from '~/utils/utils';

const { t } = useI18n();

defineProps<{
	appointment: Appointment;
}>();

defineEmits<{
	close: [];
	edit: [appointment: Appointment];
	delete: [code: string];
}>();
</script>
