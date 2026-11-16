<template>
	<UModal
		:default-open="true"
		:title="t('components.zModal.updateAppointment')"
		:ui="{
			content: 'max-w-2xl',
		}"
	>
		<template #header>
			<div class="flex w-full flex-col gap-4">
				<div class="flex min-w-0 items-start gap-3">
					<div class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
						<UIcon name="i-lucide-calendar-days" class="size-5" aria-hidden="true" />
					</div>
					<div class="min-w-0 flex-1">
						<h2 class="text-lg font-semibold text-highlighted">{{ t('components.zModal.appointment') }}</h2>
						<div class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
							<UBadge color="neutral" variant="subtle" class="font-mono">#{{ appointment.code }}</UBadge>
							<NuxtLink
								v-if="appointment.order_no"
								:to="`/orders/${appointment.order_no}?type=order`"
								class="text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
								@click="onCancel"
							>
								{{ t('components.zModal.orderNo') }} #{{ appointment.order_no }}
							</NuxtLink>
						</div>
					</div>
				</div>
				<AppointmentStatusControl
					:status="state.appointment.status"
					:updating="updating"
					@update:status="onStatusSelected"
				/>
			</div>
		</template>

		<template #body>
			<UForm ref="formRef" :schema="appointmentSchema" :state="state.appointment" class="space-y-5" @submit="onSubmit">
				<div
					v-if="isNoShowSelected"
					class="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-3"
					data-testid="no-show-disposition"
				>
					<div>
						<p class="text-sm font-medium text-highlighted">{{ t('components.zModal.noShowDispositionTitle') }}</p>
						<p class="mt-1 text-xs text-muted">{{ t('components.zModal.noShowDispositionHint') }}</p>
					</div>
					<URadioGroup
						:model-value="noShowAction"
						:items="dispositionOptions"
						value-key="value"
						variant="card"
						color="warning"
						:disabled="updating"
						:aria-label="t('components.zModal.noShowDispositionTitle')"
						@update:model-value="onDispositionSelected"
					/>
					<p v-if="dispositionError" class="text-xs text-error" role="alert">{{ dispositionError }}</p>
				</div>

				<div class="grid gap-4 sm:grid-cols-2">
					<section class="min-w-0 rounded-lg border border-default bg-elevated/60 p-3">
						<h3 class="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{{ t('pages.serviceDetails') }}</h3>
						<p class="font-semibold wrap-break-word text-highlighted">{{ appointment.appt_desc || t('pages.noDescription') }}</p>
					</section>
					<section class="min-w-0 rounded-lg border border-default bg-elevated/60 p-3">
						<h3 class="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{{ t('components.orderDetail.customerInformation') }}</h3>
						<p class="font-semibold wrap-break-word text-highlighted">{{ appointment.customer_name }}</p>
						<a
							v-if="appointment.customer_phone"
							:href="`tel:${appointment.customer_phone}`"
							class="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
						>
							<UIcon name="i-lucide-phone" class="size-3.5" aria-hidden="true" />
							{{ appointment.customer_phone }}
						</a>
					</section>
				</div>

				<section class="space-y-3">
					<div class="flex items-center justify-between gap-3">
						<h3 class="flex items-center gap-2 text-sm font-medium text-highlighted">
							<UIcon name="i-lucide-clock" class="size-4 text-muted" aria-hidden="true" />
							{{ t('components.zModal.schedule') }}
						</h3>
						<p v-if="durationLabel" class="text-xs text-muted tabular-nums">{{ durationLabel }}</p>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<UFormField :label="t('components.zModal.appointmentStartDate')" name="start_date_time">
							<ZSelectMenuDateTime
								v-model:date-time="state.appointment.start_date_time"
								:placeholder="t('components.zModal.appointmentStartDate')"
								:min-date="new Date()"
								:max-date="scheduleMaxDate"
								class="w-full"
							/>
						</UFormField>
						<UFormField :label="t('components.zModal.appointmentEndDate')" name="end_date_time">
							<ZSelectMenuDateTime
								v-model:date-time="state.appointment.end_date_time"
								:placeholder="t('components.zModal.appointmentEndDate')"
								:min-date="state.appointment.start_date_time ?? new Date()"
								:max-date="scheduleMaxDate"
								class="w-full"
							/>
						</UFormField>
					</div>
				</section>

				<UFormField :label="t('pages.reference')" name="ref_no">
					<UInput
						:model-value="state.appointment.ref_no ?? ''"
						:placeholder="t('pages.reference')"
						:disabled="updating"
						class="w-full"
						@update:model-value="state.appointment.ref_no = $event"
					/>
				</UFormField>
			</UForm>
		</template>

		<template #footer>
			<div class="flex w-full items-center justify-between gap-3">
				<UButton color="error" variant="ghost" size="sm" class="opacity-70 hover:opacity-100" :disabled="updating" @click="onDelete">
					<UIcon name="i-lucide-trash-2" class="size-4" />
					{{ t('components.zModal.delete') }}
				</UButton>
				<div class="flex flex-wrap items-center justify-end gap-3">
					<UButton color="neutral" variant="soft" :disabled="updating" @click="onCancel">{{ t('common.cancel') }}</UButton>
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
import { AppointmentStatus } from 'yeppi-common';
import { UpdateAppointmentValidation } from '~/utils/schema';
import type { Appointment, AppointmentDepositDisposition } from '~/utils/types/appointment';
import { failedNotification } from '~/stores/AppUi/AppUi';

const { t } = useI18n();
const appointmentSchema = computed(() => UpdateAppointmentValidation(t));

type Schema = z.infer<ReturnType<typeof UpdateAppointmentValidation>>;
type NoShowAction = AppointmentDepositDisposition | 'reschedule';

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

const toDate = (value: Date | string | undefined): Date | undefined => {
	if (value == null) return undefined;
	return value instanceof Date ? value : new Date(value as string);
};

const getTimeSafe = (value: Date | string | undefined): number | undefined => {
	const date = toDate(value);
	return date != null && !Number.isNaN(date.getTime()) ? date.getTime() : undefined;
};

const props = defineProps({
	appointment: {
		type: Object as PropType<Appointment>,
		required: true,
	},
});

const emit = defineEmits(['update', 'status', 'delete', 'cancel']);

const state = reactive({
	appointment: (() => {
		const draft = { ...props.appointment };
		if (!draft.end_date_time && draft.start_date_time) {
			const start = toDate(draft.start_date_time)!;
			draft.end_date_time = new Date(start.getTime() + DEFAULT_DURATION_MS);
		}
		return draft;
	})(),
});

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

const savedStatus = ref<AppointmentStatus>(props.appointment.status);
const savedDisposition = ref<AppointmentDepositDisposition | undefined>(props.appointment.deposit_disposition ?? undefined);
const noShowAction = ref<NoShowAction | undefined>(props.appointment.deposit_disposition ?? undefined);
const dispositionError = ref<string | null>(null);

const scheduleMaxDate = computed(() => {
	const max = new Date();
	max.setMonth(max.getMonth() + 2);
	return max;
});

const durationLabel = computed(() => {
	const start = getTimeSafe(state.appointment.start_date_time);
	const end = getTimeSafe(state.appointment.end_date_time);
	if (start == null || end == null || end < start) return '';
	const minutes = Math.round((end - start) / 60000);
	if (minutes <= 0) return '';
	return t('pages.durationMinutes', { n: minutes });
});

const isNoShowSelected = computed(() => state.appointment.status === AppointmentStatus.NO_SHOW);

const dispositionOptions = computed(() => [
	{
		value: 'retain' as const,
		label: t('components.zModal.noShowRetain'),
		description: t('components.zModal.noShowRetainDesc'),
	},
	{
		value: 'refund' as const,
		label: t('components.zModal.noShowRefund'),
		description: t('components.zModal.noShowRefundDesc'),
	},
	{
		value: 'reschedule' as const,
		label: t('components.zModal.noShowReschedule'),
		description: t('components.zModal.noShowRescheduleDesc'),
	},
]);

const onStatusSelected = (status: AppointmentStatus) => {
	if (updating.value || status === state.appointment.status) return;
	if (status === AppointmentStatus.NO_SHOW) {
		state.appointment.status = status;
		if (savedStatus.value !== AppointmentStatus.NO_SHOW) {
			noShowAction.value = undefined;
		}
		dispositionError.value = null;
		return;
	}
	void persistStatus(status);
};

const onDispositionSelected = (value: NoShowAction | undefined) => {
	if (!value || updating.value) return;
	noShowAction.value = value;
	dispositionError.value = null;
	if (value === 'reschedule') {
		state.appointment.status = savedStatus.value;
		noShowAction.value = savedStatus.value === AppointmentStatus.NO_SHOW ? savedDisposition.value : undefined;
		failedNotification(t('components.zModal.noShowRescheduleHint'));
		return;
	}
	if (savedStatus.value === AppointmentStatus.NO_SHOW && savedDisposition.value === value) return;
	void persistStatus(AppointmentStatus.NO_SHOW, value);
};

const persistStatus = async (status: AppointmentStatus, disposition?: AppointmentDepositDisposition) => {
	if (updating.value) return;
	if (status === savedStatus.value && (disposition ?? undefined) === savedDisposition.value) return;

	const previousStatus = state.appointment.status;
	const previousAction = noShowAction.value;
	state.appointment.status = status;
	state.appointment.deposit_disposition = disposition ?? null;

	const saved = await appointmentStore.updateAppointment({
		...props.appointment,
		status,
		deposit_disposition: disposition,
	});

	if (!saved) {
		state.appointment.status = previousStatus;
		state.appointment.deposit_disposition = savedDisposition.value ?? null;
		noShowAction.value = previousAction;
		return;
	}

	savedStatus.value = status;
	savedDisposition.value = disposition;
	if (status !== AppointmentStatus.NO_SHOW) {
		noShowAction.value = undefined;
		dispositionError.value = null;
	}
	emit('status', {
		...props.appointment,
		status,
		deposit_disposition: disposition ?? null,
	});
};

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { start_date_time, end_date_time, ref_no, status } = event.data;
	const end = end_date_time ?? start_date_time;

	if (status === AppointmentStatus.NO_SHOW) {
		if (!noShowAction.value || noShowAction.value === 'reschedule') {
			dispositionError.value = t('components.zModal.noShowDispositionRequired');
			return;
		}
		emit('update', {
			...props.appointment,
			start_date_time,
			end_date_time: end,
			ref_no,
			status,
			deposit_disposition: noShowAction.value,
		});
		return;
	}

	emit('update', { ...props.appointment, start_date_time, end_date_time: end, ref_no, status });
};

const onCancel = () => {
	emit('cancel');
};

const onDelete = () => {
	emit('delete');
};
</script>
