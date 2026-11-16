<template>
	<div class="flex flex-wrap gap-2" role="tablist" :aria-label="t('pages.appointmentStatusFilter')">
		<button
			v-for="chip in chips"
			:key="chip.value"
			type="button"
			role="tab"
			:aria-selected="modelValue === chip.value"
			class="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
			:class="chipClass(chip)"
			@click="$emit('update:modelValue', chip.value)"
		>
			<span class="size-1.5 shrink-0 rounded-full" :class="chip.dotClass" aria-hidden="true" />
			{{ chip.label }}
			<span class="rounded-full px-1.5 py-0.5 font-mono text-[11px]" :class="chip.countClass">
				{{ chip.count }}
			</span>
		</button>
	</div>
</template>

<script lang="ts" setup>
import { AppointmentStatus } from 'yeppi-common';
import type { AppointmentStatusCounts } from '~/utils/appointment-day-ops';
import { getAppointmentStatusColor } from '~/utils/options';

const props = defineProps<{
	modelValue: string;
	counts: AppointmentStatusCounts;
}>();

defineEmits<{
	'update:modelValue': [value: string];
}>();

const { t } = useI18n();

type ChipTone = 'primary' | 'warning' | 'info' | 'success' | 'error' | 'neutral';

const toneStyles: Record<
	ChipTone,
	{ idle: string; active: string; dot: string; countIdle: string; countActive: string }
> = {
	primary: {
		idle: 'border-primary-200 bg-primary-50/50 text-primary-800 hover:border-primary-300 dark:border-primary-800 dark:bg-primary-950/20 dark:text-primary-200',
		active: 'border-primary-500 bg-primary-100 text-primary-950 dark:border-primary-400 dark:bg-primary-950/50 dark:text-primary-50',
		dot: 'bg-primary-500',
		countIdle: 'bg-primary-100 text-primary-800 dark:bg-primary-900/60 dark:text-primary-100',
		countActive: 'bg-white text-primary-900 dark:bg-primary-900 dark:text-primary-50',
	},
	warning: {
		idle: 'border-warning-200 bg-warning-50/60 text-warning-800 hover:border-warning-300 dark:border-warning-800 dark:bg-warning-950/20 dark:text-warning-200',
		active: 'border-warning-500 bg-warning-100 text-warning-950 dark:border-warning-400 dark:bg-warning-950/50 dark:text-warning-50',
		dot: 'bg-warning-500',
		countIdle: 'bg-warning-100 text-warning-800 dark:bg-warning-900/60 dark:text-warning-100',
		countActive: 'bg-white text-warning-900 dark:bg-warning-900 dark:text-warning-50',
	},
	info: {
		idle: 'border-info-200 bg-info-50/60 text-info-800 hover:border-info-300 dark:border-info-800 dark:bg-info-950/20 dark:text-info-200',
		active: 'border-info-500 bg-info-100 text-info-950 dark:border-info-400 dark:bg-info-950/50 dark:text-info-50',
		dot: 'bg-info-500',
		countIdle: 'bg-info-100 text-info-800 dark:bg-info-900/60 dark:text-info-100',
		countActive: 'bg-white text-info-900 dark:bg-info-900 dark:text-info-50',
	},
	success: {
		idle: 'border-success-200 bg-success-50/60 text-success-800 hover:border-success-300 dark:border-success-800 dark:bg-success-950/20 dark:text-success-200',
		active: 'border-success-500 bg-success-100 text-success-950 dark:border-success-400 dark:bg-success-950/50 dark:text-success-50',
		dot: 'bg-success-500',
		countIdle: 'bg-success-100 text-success-800 dark:bg-success-900/60 dark:text-success-100',
		countActive: 'bg-white text-success-900 dark:bg-success-900 dark:text-success-50',
	},
	error: {
		idle: 'border-error-200 bg-error-50/60 text-error-800 hover:border-error-300 dark:border-error-800 dark:bg-error-950/20 dark:text-error-200',
		active: 'border-error-500 bg-error-100 text-error-950 dark:border-error-400 dark:bg-error-950/50 dark:text-error-50',
		dot: 'bg-error-500',
		countIdle: 'bg-error-100 text-error-800 dark:bg-error-900/60 dark:text-error-100',
		countActive: 'bg-white text-error-900 dark:bg-error-900 dark:text-error-50',
	},
	neutral: {
		idle: 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
		active: 'border-gray-500 bg-gray-100 text-gray-950 dark:border-gray-400 dark:bg-gray-800 dark:text-white',
		dot: 'bg-gray-400',
		countIdle: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
		countActive: 'bg-white text-gray-900 dark:bg-gray-900 dark:text-white',
	},
};

const toneForValue = (value: string): ChipTone => {
	if (value === 'All') return 'primary';
	return getAppointmentStatusColor(value as AppointmentStatus) as ChipTone;
};

const chips = computed(() =>
	[
		{ label: t('options.all'), value: 'All', count: props.counts.all },
		{ label: t('options.pending'), value: AppointmentStatus.PENDING, count: props.counts.pending },
		{ label: t('options.confirmed'), value: AppointmentStatus.CONFIRMED, count: props.counts.confirmed },
		{ label: t('options.completed'), value: AppointmentStatus.COMPLETED, count: props.counts.completed },
		{ label: t('options.cancelled'), value: AppointmentStatus.CANCELLED, count: props.counts.cancelled },
	].map((chip) => {
		const tone = toneStyles[toneForValue(chip.value)];
		const selected = props.modelValue === chip.value;
		return {
			...chip,
			dotClass: tone.dot,
			countClass: selected ? tone.countActive : tone.countIdle,
			_tone: tone,
			_selected: selected,
		};
	}),
);

const chipClass = (chip: (typeof chips.value)[number]) => (chip._selected ? chip._tone.active : chip._tone.idle);
</script>
