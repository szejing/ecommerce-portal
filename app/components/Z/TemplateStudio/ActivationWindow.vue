<template>
	<UCard :ui="{ body: 'p-4 sm:p-4' }">
		<div class="space-y-4">
			<div>
				<h2 class="font-semibold text-default">{{ t('components.templateStudio.activation') }}</h2>
				<p class="text-sm text-muted">{{ t('components.templateStudio.activationDescription') }}</p>
			</div>

			<div class="grid grid-cols-2 rounded-lg bg-elevated p-1">
				<UButton
					data-mode="publish-now"
					type="button"
					color="neutral"
					:variant="mode === 'publish-now' ? 'solid' : 'ghost'"
					:aria-pressed="mode === 'publish-now'"
					class="min-h-11 justify-center"
					@click="setMode('publish-now')"
				>
					{{ t('components.templateStudio.publishNow') }}
				</UButton>
				<UButton
					data-mode="schedule"
					type="button"
					color="neutral"
					:variant="mode === 'schedule' ? 'solid' : 'ghost'"
					:aria-pressed="mode === 'schedule'"
					class="min-h-11 justify-center"
					@click="setMode('schedule')"
				>
					{{ t('components.templateStudio.schedule') }}
				</UButton>
			</div>

			<div v-if="mode === 'schedule'" class="space-y-4">
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
									{{ dateLabel(startDate, 'components.templateStudio.immediate') }}
								</UButton>
								<template #content="{ close }">
									<ZDateTimePicker
										v-model="startDate"
										:select-time-label="t('components.templateStudio.selectTime')"
										:time-input-label="t('components.templateStudio.activationTimeInput')"
										:cancel-label="t('components.templateStudio.cancelDateTime')"
										:apply-label="t('components.templateStudio.applyDateTime')"
										@close="close"
									/>
								</template>
							</UPopover>
							<UButton
								v-if="startDate"
								data-clear-date="start"
								type="button"
								color="neutral"
								variant="ghost"
								icon="i-lucide-x"
								:aria-label="t('components.templateStudio.clearStartDate')"
								class="min-h-11 min-w-11"
								@click="startDate = null"
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
									{{ dateLabel(endDate, 'components.templateStudio.indefinite') }}
								</UButton>
								<template #content="{ close }">
									<ZDateTimePicker
										v-model="endDate"
										:select-time-label="t('components.templateStudio.selectTime')"
										:time-input-label="t('components.templateStudio.activationTimeInput')"
										:cancel-label="t('components.templateStudio.cancelDateTime')"
										:apply-label="t('components.templateStudio.applyDateTime')"
										@close="close"
									/>
								</template>
							</UPopover>
							<UButton
								v-if="endDate"
								data-clear-date="end"
								type="button"
								color="neutral"
								variant="ghost"
								icon="i-lucide-x"
								:aria-label="t('components.templateStudio.clearEndDate')"
								class="min-h-11 min-w-11"
								@click="endDate = null"
							/>
						</div>
					</UFormField>
				</div>
				<p class="text-xs text-muted">{{ t('components.templateStudio.scheduleTimezone', { timezone }) }}</p>
				<p v-if="validationError" role="alert" class="text-sm text-error">{{ validationError }}</p>
			</div>

			<p v-if="disabledReason" class="text-sm text-warning">{{ disabledReason }}</p>
			<UButton
				:data-action="mode === 'publish-now' ? 'publish-now' : 'schedule'"
				type="button"
				:icon="mode === 'publish-now' ? 'i-lucide-send' : 'i-lucide-calendar-check'"
				:disabled="disabled"
				:loading="loading"
				class="min-h-11 w-full justify-center"
				@click="confirmActivation"
			>
				{{ t(mode === 'publish-now' ? 'components.templateStudio.publishNow' : 'components.templateStudio.schedulePublish') }}
			</UButton>
		</div>
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
const mode = ref<'publish-now' | 'schedule'>('publish-now');
const startDate = ref<Date | null>(props.startDate ? new Date(props.startDate) : null);
const endDate = ref<Date | null>(props.endDate ? new Date(props.endDate) : null);
const validationError = ref('');

watch(() => props.startDate, value => { startDate.value = value ? new Date(value) : null; });
watch(() => props.endDate, value => { endDate.value = value ? new Date(value) : null; });

function setMode(value: 'publish-now' | 'schedule'): void {
	mode.value = value;
	validationError.value = '';
}

function dateLabel(value: Date | null, fallbackKey: string): string {
	if (!value || Number.isNaN(value.getTime())) return t(fallbackKey);
	return new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(value);
}

function confirmActivation(): void {
	if (props.disabled) return;
	validationError.value = '';
	if (mode.value === 'publish-now') {
		emit('confirm', { startDate: null, endDate: null });
		return;
	}
	const start = startDate.value;
	const end = endDate.value;
	if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
		validationError.value = t('components.templateStudio.scheduleInvalidDate');
		return;
	}
	if (start && end && end.getTime() <= start.getTime()) {
		validationError.value = t('components.templateStudio.scheduleEndAfterStart');
		return;
	}
	if (end && end.getTime() <= (props.now ?? new Date()).getTime()) {
		validationError.value = t('components.templateStudio.scheduleEndFuture');
		return;
	}
	emit('confirm', {
		startDate: start ? new Date(start) : null,
		endDate: end ? new Date(end) : null,
	});
}
</script>
