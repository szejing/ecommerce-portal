<template>
	<UModal
		:default-open="true"
		:title="t('components.zModal.updateAppointment')"
		:ui="{
			content: 'max-w-[85%] md:max-w-[55%] ',
		}"
	>
		<template #header>
			<div class="flex flex-col gap-3 w-full">
				<div class="flex items-center gap-2">
					<UIcon name="i-lucide-calendar-days" class="size-5 text-main-500" aria-hidden="true" />
					<h2 class="text-main text-lg font-semibold">{{ t('components.zModal.appointment') }}</h2>
				</div>
				<div class="flex flex-row flex-jbetween-icenter w-full gap-4">
					<div class="flex flex-col gap-1">
						<UBadge color="neutral" variant="subtle" size="lg" class="font-mono w-fit">#{{ appointment!.code }}</UBadge>
						<template v-if="appointment!.order_no">
							<span class="text-neutral-600 text-sm">{{ t('components.zModal.orderNo') }} #{{ appointment!.order_no }}</span>
						</template>
					</div>
					<div class="flex flex-col gap-2">
						<label class="text-neutral-500 text-sm">{{ t('table.status') }}</label>
						<ZSelectMenuAppointmentStatus v-model:status="state.appointment.status" />
					</div>
				</div>
			</div>
		</template>

		<template #body>
			<UForm ref="formRef" :schema="appointmentSchema" :state="state.appointment" class="space-y-5" @submit="onSubmit">
				<!-- Service details -->
				<div>
					<h4 class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">{{ t('pages.serviceDetails') }}</h4>
					<div :class="['flex gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg', appointment!.ref_no ? 'items-start' : 'items-center']">
						<div class="p-2 sm:p-3 bg-gray-100 dark:bg-gray-700 rounded-lg shrink-0">
							<UIcon name="i-heroicons-wrench" class="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-gray-900 dark:text-white mb-1 wrap-break-word">{{ appointment!.appt_desc || t('pages.noDescription') }}</p>
							<p v-if="appointment!.ref_no" class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
								<UIcon name="i-heroicons-hashtag" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
								{{ t('pages.reference') }}: {{ appointment!.ref_no }}
							</p>
						</div>
					</div>
				</div>

				<!-- Customer information -->
				<div>
					<h4 class="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">{{ t('components.orderDetail.customerInformation') }}</h4>
					<div class="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
						<div class="p-2 sm:p-3 bg-primary-100 dark:bg-primary-900/20 rounded-lg shrink-0">
							<UIcon name="i-heroicons-user" class="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 dark:text-primary-400" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-semibold text-gray-900 dark:text-white wrap-break-word">{{ appointment!.customer_name }}</p>
							<p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
								<UIcon name="i-heroicons-phone" class="w-3.5 h-3.5 sm:w-4 sm:h-4" />
								{{ appointment!.customer_phone }}
							</p>
						</div>
					</div>
				</div>

				<!-- Schedule -->
				<div class="space-y-4">
					<h3 class="flex items-center gap-2 text-sm font-medium text-neutral-700">
						<UIcon name="i-lucide-clock" class="size-4 text-neutral-500" aria-hidden="true" />
						{{ t('components.zModal.appointmentStartDate') }} / {{ t('components.zModal.appointmentEndDate') }}
					</h3>
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="flex flex-col gap-2">
							<label class="text-neutral-500 text-sm">{{ t('components.zModal.appointmentStartDate') }}</label>
							<ZSelectMenuDateTime
								v-model:date-time="state.appointment.start_date_time"
								:placeholder="t('components.zModal.appointmentStartDate')"
								:min-date="new Date()"
								:max-date="new Date(new Date().setMonth(new Date().getMonth() + 2))"
							/>
						</div>
						<div class="flex flex-col gap-2">
							<label class="text-neutral-500 text-sm">{{ t('components.zModal.appointmentEndDate') }}</label>
							<ZSelectMenuDateTime
								v-model:date-time="state.appointment.end_date_time"
								:placeholder="t('components.zModal.appointmentEndDate')"
								:min-date="state.appointment.start_date_time ?? new Date()"
								:max-date="new Date(new Date().setMonth(new Date().getMonth() + 2))"
							/>
						</div>
					</div>
				</div>
			</UForm>
		</template>

		<template #footer>
			<div class="flex-jbetween-icenter w-full">
				<UButton color="error" variant="ghost" size="sm" class="opacity-70 hover:opacity-100" @click="onDelete">
					<UIcon name="i-lucide-trash-2" class="size-4" />
					{{ t('components.zModal.delete') }}
				</UButton>
				<div class="flex flex-wrap items-center justify-end gap-3">
					<UButton color="neutral" variant="soft" @click="onCancel">{{ t('common.cancel') }}</UButton>
					<UButton color="primary" variant="solid" :loading="updating" @click="formRef?.submit()">
						{{ t('components.zModal.update') }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { UpdateAppointmentValidation } from '~/utils/schema';
import type { Appointment } from '~/utils/types/appointment';

const { t } = useI18n();
const appointmentSchema = computed(() => UpdateAppointmentValidation(t));

type Schema = z.infer<ReturnType<typeof UpdateAppointmentValidation>>;

const DEFAULT_DURATION_MS = 60 * 60 * 1000; // 1 hour

const toDate = (value: Date | string | undefined): Date | undefined => {
	if (value == null) return undefined;
	return value instanceof Date ? value : new Date(value as string);
};

const getTimeSafe = (value: Date | string | undefined): number | undefined => {
	const d = toDate(value);
	return d != null && !Number.isNaN(d.getTime()) ? d.getTime() : undefined;
};

const props = defineProps({
	appointment: {
		type: Object as PropType<Appointment> | undefined,
		required: true,
	},
});

const emit = defineEmits(['update', 'delete', 'cancel']);

const state = reactive({
	appointment: (() => {
		const a = { ...props.appointment };
		if (!a.end_date_time && a.start_date_time) {
			const start = toDate(a.start_date_time)!;
			a.end_date_time = new Date(start.getTime() + DEFAULT_DURATION_MS);
		}
		return a;
	})(),
});

// Duration in ms; when start changes, end is set to start + durationMs
const initialDuration = (() => {
	const start = getTimeSafe(state.appointment.start_date_time);
	const end = getTimeSafe(state.appointment.end_date_time);
	if (start != null && end != null && end >= start) return end - start;
	return DEFAULT_DURATION_MS;
})();
const durationMs = ref<number>(initialDuration);

watch(
	() => state.appointment.start_date_time,
	(newStart) => {
		const startTime = getTimeSafe(newStart);
		if (startTime == null || durationMs.value <= 0) return;
		state.appointment.end_date_time = new Date(startTime + durationMs.value);
	},
);

watch(
	() => state.appointment.end_date_time,
	(newEnd) => {
		const startTime = getTimeSafe(state.appointment.start_date_time);
		const endTime = getTimeSafe(newEnd);
		if (startTime != null && endTime != null && endTime >= startTime) {
			durationMs.value = endTime - startTime;
		}
	},
);

const formRef = ref<{ submit: () => void } | null>(null);
const appointmentStore = useAppointmentStore();
const { updating } = storeToRefs(appointmentStore);

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { start_date_time, end_date_time, ref_no, status } = event.data;
	const end = end_date_time ?? start_date_time;

	emit('update', { ...props.appointment, start_date_time, end_date_time: end, ref_no, status });
};

const onCancel = () => {
	emit('cancel');
};

const onDelete = () => {
	emit('delete');
};
</script>

<style scoped></style>
