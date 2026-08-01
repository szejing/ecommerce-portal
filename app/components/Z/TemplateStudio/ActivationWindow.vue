<template>
	<UCard :ui="{ body: 'p-4 sm:p-4' }">
		<div class="space-y-4">
			<div>
				<h2 class="font-semibold text-default">{{ t('components.templateStudio.activation') }}</h2>
				<p class="text-sm text-muted">{{ t('components.templateStudio.activationDescription') }}</p>
			</div>

			<p v-if="disabledReason" class="text-sm text-warning">{{ disabledReason }}</p>
			<p v-if="validationError" role="alert" class="text-sm text-error">{{ validationError }}</p>

			<div class="flex min-h-11 w-full overflow-hidden rounded-lg">
				<UButton
					:data-action="scheduled ? 'schedule' : 'publish-now'"
					type="button"
					class="min-h-11 min-w-0 flex-1 justify-center rounded-none"
					:disabled="disabled"
					:loading="loading"
					:icon="scheduled ? 'i-lucide-calendar-check' : 'i-lucide-send'"
					@click="confirmActivation"
				>
					{{ primaryLabel }}
				</UButton>
				<div class="w-px bg-white/30" aria-hidden="true" />
				<UButton
					v-if="!scheduled"
					data-action="open-schedule"
					type="button"
					class="min-h-11 w-12 shrink-0 justify-center rounded-none px-0"
					icon="i-lucide-clock"
					:disabled="disabled"
					:aria-label="t('components.templateStudio.openSchedule')"
					@click="openScheduleModal"
				/>
				<UButton
					v-else
					data-action="clear-schedule"
					type="button"
					class="min-h-11 w-12 shrink-0 justify-center rounded-none px-0"
					icon="i-lucide-x"
					:disabled="disabled"
					:aria-label="t('components.templateStudio.clearSchedule')"
					@click="clearSchedule"
				/>
			</div>
		</div>

		<UModal
			v-model:open="scheduleOpen"
			:title="t('components.templateStudio.scheduleModalTitle')"
			:portal="false"
			:ui="{ content: 'w-full sm:max-w-lg' }"
		>
			<template #body>
				<div class="space-y-4">
					<div class="grid gap-4 sm:grid-cols-2">
						<UFormField :label="t('components.templateStudio.startDate')" :description="t('components.templateStudio.startDateHint')">
							<div class="flex gap-2">
								<UPopover class="min-w-0 flex-1">
									<UButton
										data-date="start"
										type="button"
										color="neutral"
										variant="outline"
										icon="i-lucide-calendar-clock"
										class="min-h-11 w-full justify-start"
									>
										{{ dateLabel(draftStart, 'components.templateStudio.immediate') }}
									</UButton>
									<template #content="{ close }">
										<ZDateTimePicker
											v-model="draftStart"
											:select-time-label="t('components.templateStudio.selectTime')"
											:time-input-label="t('components.templateStudio.activationTimeInput')"
											:cancel-label="t('components.templateStudio.cancelDateTime')"
											:apply-label="t('components.templateStudio.applyDateTime')"
											@close="close"
										/>
									</template>
								</UPopover>
								<UButton
									v-if="draftStart"
									data-clear-date="start"
									type="button"
									color="neutral"
									variant="ghost"
									icon="i-lucide-x"
									:aria-label="t('components.templateStudio.clearStartDate')"
									class="min-h-11 min-w-11"
									@click="draftStart = null"
								/>
							</div>
						</UFormField>

						<UFormField :label="t('components.templateStudio.endDate')" :description="t('components.templateStudio.endDateHint')">
							<div class="flex gap-2">
								<UPopover class="min-w-0 flex-1">
									<UButton
										data-date="end"
										type="button"
										color="neutral"
										variant="outline"
										icon="i-lucide-calendar-clock"
										class="min-h-11 w-full justify-start"
									>
										{{ dateLabel(draftEnd, 'components.templateStudio.indefinite') }}
									</UButton>
									<template #content="{ close }">
										<ZDateTimePicker
											v-model="draftEnd"
											:select-time-label="t('components.templateStudio.selectTime')"
											:time-input-label="t('components.templateStudio.activationTimeInput')"
											:cancel-label="t('components.templateStudio.cancelDateTime')"
											:apply-label="t('components.templateStudio.applyDateTime')"
											@close="close"
										/>
									</template>
								</UPopover>
								<UButton
									v-if="draftEnd"
									data-clear-date="end"
									type="button"
									color="neutral"
									variant="ghost"
									icon="i-lucide-x"
									:aria-label="t('components.templateStudio.clearEndDate')"
									class="min-h-11 min-w-11"
									@click="draftEnd = null"
								/>
							</div>
						</UFormField>
					</div>
					<p class="text-xs text-muted">{{ t('components.templateStudio.scheduleTimezone', { timezone }) }}</p>
					<p v-if="draftValidationError" role="alert" class="text-sm text-error">{{ draftValidationError }}</p>
				</div>
			</template>
			<template #footer>
				<div class="flex w-full justify-end gap-2">
					<UButton data-action="cancel-schedule" color="neutral" variant="outline" @click="cancelScheduleModal">
						{{ t('components.templateStudio.cancelSchedule') }}
					</UButton>
					<UButton data-action="apply-schedule" @click="applySchedule">
						{{ t('components.templateStudio.applySchedule') }}
					</UButton>
				</div>
			</template>
		</UModal>
	</UCard>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
	startDate?: Date | null;
	endDate?: Date | null;
	timezone: string;
	disabled?: boolean;
	disabledReason?: string;
	loading?: boolean;
	now?: Date;
}>(), {
	startDate: null,
	endDate: null,
	disabled: false,
	disabledReason: undefined,
	loading: false,
});

const emit = defineEmits<{
	confirm: [window: { startDate: Date | null; endDate: Date | null }];
}>();

const { t, locale } = useI18n();

const scheduleOpen = ref(false);
const appliedStart = ref<Date | null>(props.startDate ? new Date(props.startDate) : null);
const appliedEnd = ref<Date | null>(props.endDate ? new Date(props.endDate) : null);
const draftStart = ref<Date | null>(null);
const draftEnd = ref<Date | null>(null);
const scheduled = ref(Boolean(props.startDate || props.endDate));
const validationError = ref('');
const draftValidationError = ref('');

watch(() => props.startDate, value => {
	appliedStart.value = value ? new Date(value) : null;
	scheduled.value = Boolean(value || props.endDate);
});
watch(() => props.endDate, value => {
	appliedEnd.value = value ? new Date(value) : null;
	scheduled.value = Boolean(props.startDate || value);
});

const primaryLabel = computed(() => {
	if (!scheduled.value) return t('components.templateStudio.publishNow');
	return t('components.templateStudio.scheduleOnRange', {
		start: dateLabel(appliedStart.value, 'components.templateStudio.immediate'),
		end: dateLabel(appliedEnd.value, 'components.templateStudio.indefinite'),
	});
});

function dateLabel(value: Date | null, fallbackKey: string): string {
	if (!value || Number.isNaN(value.getTime())) return t(fallbackKey);
	return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

function openScheduleModal(): void {
	if (props.disabled) return;
	draftStart.value = appliedStart.value ? new Date(appliedStart.value) : null;
	draftEnd.value = appliedEnd.value ? new Date(appliedEnd.value) : null;
	draftValidationError.value = '';
	scheduleOpen.value = true;
}

function cancelScheduleModal(): void {
	scheduleOpen.value = false;
	draftValidationError.value = '';
}

function clearSchedule(): void {
	if (props.disabled) return;
	scheduled.value = false;
	appliedStart.value = null;
	appliedEnd.value = null;
	validationError.value = '';
}

function validateWindow(start: Date | null, end: Date | null): string {
	if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
		return t('components.templateStudio.scheduleInvalidDate');
	}
	if (start && end && end.getTime() <= start.getTime()) {
		return t('components.templateStudio.scheduleEndAfterStart');
	}
	if (end && end.getTime() <= (props.now ?? new Date()).getTime()) {
		return t('components.templateStudio.scheduleEndFuture');
	}
	return '';
}

function applySchedule(): void {
	const error = validateWindow(draftStart.value, draftEnd.value);
	if (error) {
		draftValidationError.value = error;
		return;
	}
	appliedStart.value = draftStart.value ? new Date(draftStart.value) : null;
	appliedEnd.value = draftEnd.value ? new Date(draftEnd.value) : null;
	scheduled.value = true;
	validationError.value = '';
	scheduleOpen.value = false;
}

function confirmActivation(): void {
	if (props.disabled) return;
	validationError.value = '';
	if (!scheduled.value) {
		emit('confirm', { startDate: null, endDate: null });
		return;
	}
	const error = validateWindow(appliedStart.value, appliedEnd.value);
	if (error) {
		validationError.value = error;
		return;
	}
	emit('confirm', {
		startDate: appliedStart.value ? new Date(appliedStart.value) : null,
		endDate: appliedEnd.value ? new Date(appliedEnd.value) : null,
	});
}
</script>
