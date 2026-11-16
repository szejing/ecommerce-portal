<template>
	<div v-if="items.length" class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scroll-smooth" role="list" :aria-label="t('pages.appointmentAttentionRail')">
		<button
			v-for="(item, index) in items"
			:key="itemKey(item, index)"
			type="button"
			role="listitem"
			class="min-h-14 min-w-[12.5rem] sm:min-w-[14rem] shrink-0 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
			:class="cardClass(item)"
			@click="onSelect(item)"
		>
			<div class="flex items-start gap-2">
				<span class="mt-1.5 size-2 shrink-0 rounded-full" :class="dotClass(item)" aria-hidden="true" />
				<div class="min-w-0 flex-1">
					<p class="text-[11px] font-bold uppercase tracking-wide" :class="tagClass(item)">
						{{ kindLabel(item.kind) }}
					</p>
					<p class="truncate text-sm font-semibold text-gray-900 dark:text-white">
						{{ title(item) }}
					</p>
					<p class="truncate text-xs text-gray-500 dark:text-gray-400">
						{{ subtitle(item) }}
					</p>
				</div>
				<span class="shrink-0 font-mono text-[11px] text-gray-500 dark:text-gray-400">
					{{ timeLabel(item) }}
				</span>
			</div>
		</button>
	</div>
</template>

<script lang="ts" setup>
import { format } from 'date-fns';
import type { AttentionRailItem } from '~/utils/appointment-day-ops';
import type { Appointment } from '~/utils/types/appointment';

defineProps<{
	items: AttentionRailItem[];
}>();

const emit = defineEmits<{
	select: [appointment: Appointment];
	'select-gap': [start: Date, end: Date];
}>();

const { t } = useI18n();

const itemKey = (item: AttentionRailItem, index: number) => {
	if (item.kind === 'open_gap') return `gap-${item.start.toISOString()}-${index}`;
	return `${item.kind}-${item.appointment.code}`;
};

const kindLabel = (kind: AttentionRailItem['kind']) => {
	if (kind === 'needs_confirm') return t('pages.appointmentNeedsConfirm');
	if (kind === 'next_up') return t('pages.appointmentNextUp');
	return t('pages.appointmentOpenGap');
};

const title = (item: AttentionRailItem) => {
	if (item.kind === 'open_gap') {
		return `${format(item.start, 'HH:mm')}–${format(item.end, 'HH:mm')}`;
	}
	return item.appointment.customer_name;
};

const subtitle = (item: AttentionRailItem) => {
	if (item.kind === 'open_gap') {
		return t('pages.appointmentGapBookHint');
	}
	return item.appointment.appt_desc || t('pages.noDescription');
};

const timeLabel = (item: AttentionRailItem) => {
	if (item.kind === 'open_gap') {
		return t('pages.durationMinutesShort', { n: item.durationMinutes });
	}
	return format(item.start, 'HH:mm');
};

const cardClass = (item: AttentionRailItem) => {
	if (item.kind === 'needs_confirm') {
		return 'border-amber-300 bg-gradient-to-br from-amber-50 to-white dark:border-amber-700 dark:from-amber-950/40 dark:to-gray-900';
	}
	if (item.kind === 'open_gap') {
		return 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30';
	}
	return 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900';
};

const dotClass = (item: AttentionRailItem) => {
	if (item.kind === 'needs_confirm') return 'bg-amber-500';
	if (item.kind === 'open_gap') return 'bg-emerald-500';
	return 'bg-primary-500';
};

const tagClass = (item: AttentionRailItem) => {
	if (item.kind === 'needs_confirm') return 'text-amber-800 dark:text-amber-300';
	if (item.kind === 'open_gap') return 'text-emerald-800 dark:text-emerald-300';
	return 'text-primary-700 dark:text-primary-300';
};

const onSelect = (item: AttentionRailItem) => {
	if (item.kind === 'open_gap') {
		emit('select-gap', item.start, item.end);
		return;
	}
	emit('select', item.appointment);
};
</script>
