<template>
	<div>
		<!-- Desktop: 7-column time grid (hidden on mobile) -->
		<div class="hidden lg:flex flex-col rounded-xl overflow-hidden bg-default border border-neutral-200 dark:border-neutral-800">
			<!-- Day headers -->
			<div class="grid shrink-0 border-b border-neutral-200 dark:border-neutral-800 grid-cols-[7.5rem_repeat(7,minmax(0,1fr))]">
				<div class="px-4 py-3 text-sm font-semibold text-neutral-900 dark:text-white border-r border-neutral-200 dark:border-neutral-800 min-w-0">Time</div>
				<div v-for="day in weekDays" :key="dayKey(day)" class="px-4 py-3 border-r border-neutral-200 dark:border-neutral-800 last:border-r-0">
					<p class="text-sm font-semibold text-neutral-900 dark:text-white leading-tight">
						{{ format(day, 'MMM d, yyyy') }}
					</p>
					<p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
						{{ format(day, 'EEEE') }}
					</p>
				</div>
			</div>
			<!-- Time grid: 30-min rows, time axis + 7 day columns -->
			<div class="flex flex-1 min-h-0 overflow-auto items-stretch max-h-[calc(100vh-380px)]">
				<!-- Time axis (weekly style) -->
				<div
					class="shrink-0 w-30 border-r border-neutral-200 dark:border-neutral-800 flex flex-col"
					:style="{ height: `${totalHeightPx}px`, minHeight: `${totalHeightPx}px` }"
				>
					<div
						v-for="(slot, i) in slotRows"
						:key="i"
						class="px-4 flex items-center justify-start text-sm font-semibold text-neutral-900 dark:text-white box-border"
						:style="{ height: `${slotHeightPx}px`, minHeight: `${slotHeightPx}px` }"
					>
						{{ slot.label }}
					</div>
				</div>

				<div class="flex-1 grid min-w-0 min-h-0 relative" :style="{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', minHeight: `${totalHeightPx}px` }">
					<div
						v-for="(day, dayIndex) in weekDays"
						:key="dayKey(day)"
						class="relative border-r border-neutral-100 dark:border-neutral-900 last:border-r-0 min-h-0 bg-default"
						:style="{ minHeight: `${totalHeightPx}px` }"
					>
						<!-- Grid lines -->
						<div class="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
							<template v-for="h in totalSlots" :key="h">
								<div
									:class="['absolute left-0 right-0', 'border-b border-neutral-100 dark:border-neutral-900']"
									:style="{
										top: `${(h - 1) * slotHeightPx}px`,
										height: `${slotHeightPx}px`,
									}"
								/>
							</template>
						</div>

						<!-- Current-time indicator (kept subtle for weekly view) -->
						<div v-if="isToday(day) && nowLinePx !== null" class="absolute left-0 right-0 z-30 pointer-events-none" :style="{ top: `${nowLinePx}px` }">
							<div class="h-px bg-error-500/70 dark:bg-error-400/70" />
						</div>

						<!-- Appointments layer -->
						<div class="absolute inset-0 z-10 overflow-visible">
							<template v-for="block in blocksByDay.get(dayIndex) ?? []" :key="block.appointment.code">
								<UPopover :open="hoveredCode === block.appointment.code" :popper="{ placement: 'right', strategy: 'fixed' }">
									<div
										class="absolute rounded-md cursor-pointer transition-colors overflow-hidden flex flex-col bg-neutral-50 dark:bg-neutral-900/40"
										:class="['border-l-[3px]', block.borderClass, selectedCode === block.appointment.code ? 'ring-2 ring-primary ring-inset' : '']"
										:style="{
											top: `${block.topPx}px`,
											left: `${block.leftPct}%`,
											width: `calc(${block.widthPct}% - 2px)`,
											marginLeft: '1px',
											height: `${block.heightPx}px`,
											minHeight: block.heightPx < 24 ? '24px' : undefined,
										}"
										@click="$emit('select', block.appointment)"
										@mouseenter="hoveredCode = block.appointment.code"
										@mouseleave="hoveredCode = null"
									>
										<div class="px-3 py-2 h-full overflow-hidden flex flex-col gap-0.5 min-w-0">
											<span class="text-xs font-semibold truncate" :class="block.timeTextClass">
												{{ format(block.clipStartMs, 'hh:mm a') }}
											</span>
											<span class="text-xs font-semibold truncate text-neutral-900 dark:text-white">
												{{ block.appointment.customer_name || '—' }}
											</span>
											<span v-if="block.appointment.customer_phone" class="text-xs text-neutral-500 dark:text-neutral-400 truncate">
												{{ block.appointment.customer_phone }}
											</span>
											<span v-if="block.appointment.appt_desc" class="text-xs text-neutral-500 dark:text-neutral-400 truncate">
												{{ block.appointment.appt_desc }}
											</span>
										</div>
									</div>
									<template #content>
										<div class="p-3 w-72 space-y-3" @mouseenter="hoveredCode = block.appointment.code" @mouseleave="hoveredCode = null">
											<div class="space-y-1.5">
												<div class="flex items-center justify-between gap-2">
													<span class="font-semibold text-gray-900 dark:text-white">{{ block.appointment.code }}</span>
													<UBadge :color="block.statusColor" variant="subtle" size="sm">
														{{ t('options.' + block.appointment.status.toLowerCase()) }}
													</UBadge>
												</div>
												<div class="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
													<UIcon name="i-heroicons-clock" class="w-4 h-4 shrink-0" />
													<span>{{ block.timeText }}</span>
												</div>
												<div class="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
													<UIcon name="i-heroicons-user" class="w-4 h-4 shrink-0" />
													<span>{{ block.appointment.customer_name }}</span>
												</div>
												<p class="text-xs text-gray-500 dark:text-gray-500">{{ block.appointment.customer_phone }}</p>
												<p v-if="block.appointment.appt_desc" class="text-xs text-gray-600 dark:text-gray-400">
													{{ block.appointment.appt_desc }}
												</p>
												<p v-if="block.appointment.duration" class="text-xs text-gray-500 flex items-center gap-1">
													<UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
													{{ t('pages.durationMinutes', { n: block.appointment.duration }) }}
												</p>
											</div>
											<div class="flex gap-2 pt-1 border-t border-gray-200 dark:border-gray-700">
												<UButton size="xs" color="primary" variant="soft" :label="t('components.calendar.view')" @click="$emit('select', block.appointment)" />
												<UButton
													size="xs"
													color="neutral"
													variant="outline"
													:label="t('components.calendar.edit')"
													@click="$emit('edit', block.appointment)"
												/>
											</div>
										</div>
									</template>
								</UPopover>
							</template>
						</div>

						<!-- Empty dash markers (subtle), to resemble the table look -->
						<div class="absolute inset-0 z-1 pointer-events-none">
							<template v-for="h in totalSlots" :key="`dash-${h}`">
								<div
									v-if="(h - 1) % 2 === 0"
									class="absolute left-0 right-0 flex items-center justify-center text-neutral-300 dark:text-neutral-700 text-sm"
									:style="{ top: `${(h - 1) * slotHeightPx}px`, height: `${slotHeightPx}px` }"
								>
									—
								</div>
							</template>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Mobile: Agenda-style stacked day cards -->
		<div class="lg:hidden space-y-3">
			<div v-for="(day, dayIndex) in weekDays" :key="dayKey(day)" class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-default">
				<!-- Day header -->
				<div
					class="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 dark:border-gray-800"
					:class="[isToday(day) ? 'bg-primary-50/80 dark:bg-primary-950/40' : 'bg-gray-50/50 dark:bg-gray-800/30']"
				>
					<div
						class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-lg"
						:class="[isToday(day) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300']"
					>
						{{ format(day, 'd') }}
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-sm" :class="[isToday(day) ? 'text-primary-700 dark:text-primary-400' : 'text-gray-900 dark:text-white']">
							{{ format(day, 'EEEE') }}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">{{ format(day, 'd MMM yyyy') }}</p>
					</div>
					<UBadge v-if="(blocksByDay.get(dayIndex) ?? []).length > 0" color="primary" variant="subtle" size="sm">
						{{ (blocksByDay.get(dayIndex) ?? []).length }}
					</UBadge>
				</div>
				<!-- Appointments -->
				<div v-if="(blocksByDay.get(dayIndex) ?? []).length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
					<div
						v-for="block in blocksByDay.get(dayIndex) ?? []"
						:key="block.appointment.code"
						class="flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
						:class="[selectedCode === block.appointment.code ? 'bg-primary-50/50 dark:bg-primary-900/10' : '']"
						@click="$emit('select', block.appointment)"
					>
						<div class="w-1 self-stretch rounded-full shrink-0 mt-0.5" :class="block.borderClass.replace('border-l-', 'bg-')" />
						<div class="flex-1 min-w-0">
							<div class="flex items-center justify-between gap-2">
								<p class="font-medium text-sm text-gray-900 dark:text-white truncate">{{ block.appointment.customer_name }}</p>
								<UBadge :color="block.statusColor" variant="subtle" size="xs" class="shrink-0">
									{{ t('options.' + block.appointment.status.toLowerCase()) }}
								</UBadge>
							</div>
							<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
								<UIcon name="i-heroicons-clock" class="w-3 h-3 shrink-0" />
								{{ block.timeText }}
							</p>
							<p v-if="block.appointment.customer_phone" class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
								{{ block.appointment.customer_phone }}
							</p>
							<p v-if="block.appointment.appt_desc" class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
								{{ block.appointment.appt_desc }}
							</p>
						</div>
					</div>
				</div>
				<!-- Empty day -->
				<div v-else class="px-3 py-4 text-center">
					<p class="text-xs text-gray-400 dark:text-gray-500">{{ t('pages.noAppointmentsFound') }}</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { add, format, isToday as isTodayFn, startOfDay, startOfWeek } from 'date-fns';
import { useCalendarTimeSlots } from '~/composables/useCalendarTimeSlots';
import type { Appointment } from '~/utils/types/appointment';

type BadgeColor = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

export type CalendarBlock = {
	appointment: Appointment;
	topPx: number;
	heightPx: number;
	timeText: string;
	statusColor: BadgeColor;
	borderClass: string;
	timeTextClass: string;
	clipStartMs: number;
	clipEndMs: number;
	columnIndex: number;
	totalColumns: number;
	leftPct: number;
	widthPct: number;
};

const props = withDefaults(
	defineProps<{
		weekStart: Date;
		appointments: Appointment[];
		selectedCode?: string | null;
		startHour?: number;
		endHour?: number;
		slotHeightPx?: number;
		getStatusColor?: (status: string) => string;
	}>(),
	{
		startHour: 6,
		endHour: 24,
		slotHeightPx: 64,
		getStatusColor: () => 'primary',
	},
);

defineEmits<{
	select: [appointment: Appointment];
	edit: [appointment: Appointment];
}>();

const hoveredCode = ref<string | null>(null);
const { t } = useI18n();

const { totalSlots, totalHeightPx, slotHeightPx } = useCalendarTimeSlots(() => ({
	startHour: props.startHour,
	endHour: props.endHour,
	slotHeightPx: props.slotHeightPx,
}));

const slotRows = computed(() => {
	const rows: { label: string }[] = [];
	for (let i = 0; i < totalSlots.value; i++) {
		const hour = props.startHour + Math.floor(i / 2);
		const minute = i % 2 === 0 ? 0 : 30;
		rows.push({ label: format(new Date(2000, 0, 1, hour, minute), 'hh:mm a') });
	}
	return rows;
});

// Current-time indicator
const now = ref(new Date());
let timer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
	timer = setInterval(() => {
		now.value = new Date();
	}, 60_000);
});
onUnmounted(() => {
	if (timer) clearInterval(timer);
});

const nowLinePx = computed(() => {
	const h = now.value.getHours();
	const m = now.value.getMinutes();
	if (h < props.startHour || h >= props.endHour) return null;
	const rangeMs = (props.endHour - props.startHour) * 60 * 60 * 1000;
	const offsetMs = (h - props.startHour) * 60 * 60 * 1000 + m * 60 * 1000;
	return (offsetMs / rangeMs) * totalHeightPx.value;
});

const weekStartsOn = 1;
const weekDays = computed(() => {
	const start = startOfWeek(props.weekStart, { weekStartsOn });
	return Array.from({ length: 7 }, (_, i) => add(start, { days: i }));
});

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');
const isToday = (d: Date) => isTodayFn(d);

/** Left border accent by status. */
const borderClassMap: Record<string, string> = {
	primary: 'border-l-primary-500',
	success: 'border-l-success-500',
	warning: 'border-l-warning-500',
	error: 'border-l-error-500',
	info: 'border-l-info-500',
	neutral: 'border-l-gray-400 dark:border-l-gray-500',
};

const timeTextClassMap: Record<string, string> = {
	primary: 'text-primary-600 dark:text-primary-400',
	success: 'text-success-600 dark:text-success-400',
	warning: 'text-warning-600 dark:text-warning-400',
	error: 'text-error-600 dark:text-error-400',
	info: 'text-info-600 dark:text-info-400',
	neutral: 'text-neutral-500 dark:text-neutral-400',
};

/** Background class map for mobile color strip */
const bgStripMap: Record<string, string> = {
	primary: 'bg-primary-500',
	success: 'bg-success-500',
	warning: 'bg-warning-500',
	error: 'bg-error-500',
	info: 'bg-info-500',
	neutral: 'bg-gray-400',
};

/** Assign overlap columns */
function assignOverlapColumns(blocks: { clipStartMs: number; clipEndMs: number }[]): { columnIndex: number; totalColumns: number }[] {
	if (blocks.length === 0) return [];
	const sorted = [...blocks].sort((a, b) => a.clipStartMs - b.clipStartMs);
	const columnIndex: number[] = [];
	let totalColumns = 1;
	for (let i = 0; i < sorted.length; i++) {
		const current = sorted[i]!;
		let col = 0;
		while (col < totalColumns) {
			let conflict = false;
			for (let j = 0; j < i; j++) {
				const prev = sorted[j]!;
				if (columnIndex[j] === col && prev.clipEndMs > current.clipStartMs && prev.clipStartMs < current.clipEndMs) {
					conflict = true;
					break;
				}
			}
			if (!conflict) break;
			col++;
		}
		if (col >= totalColumns) totalColumns = col + 1;
		columnIndex.push(col);
	}
	return columnIndex.map((col) => ({ columnIndex: col, totalColumns }));
}

const blocksByDay = computed(() => {
	const map = new Map<number, CalendarBlock[]>();
	for (let i = 0; i < 7; i++) map.set(i, []);

	const dayStarts = weekDays.value.map((d) => startOfDay(d).getTime());
	const rangeMs = (props.endHour - props.startHour) * 60 * 60 * 1000;

	for (const appointment of props.appointments) {
		const start = new Date(appointment.start_date_time).getTime();
		const end = new Date(appointment.end_date_time).getTime();

		for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
			const dayBaseMs = dayStarts[dayIndex] ?? 0;
			const dayStartMs = dayBaseMs + props.startHour * 60 * 60 * 1000;
			const dayEndMs = dayBaseMs + props.endHour * 60 * 60 * 1000;
			if (end <= dayStartMs || start >= dayEndMs) continue;

			const clipStartMs = Math.max(start, dayStartMs);
			const clipEndMs = Math.min(end, dayEndMs);
			const topPx = ((clipStartMs - dayStartMs) / rangeMs) * totalHeightPx.value;
			const heightPx = Math.max(4, ((clipEndMs - clipStartMs) / rangeMs) * totalHeightPx.value);
			const timeText = `${format(clipStartMs, 'h:mm a')} – ${format(clipEndMs, 'h:mm a')}`;
			const statusColor = props.getStatusColor(appointment.status) as BadgeColor;
			const borderClass = borderClassMap[statusColor] ?? borderClassMap.primary ?? '';
			const timeTextClass = timeTextClassMap[statusColor] ?? timeTextClassMap.primary ?? 'text-primary-600 dark:text-primary-400';

			map.get(dayIndex)!.push({
				appointment,
				topPx,
				heightPx,
				timeText,
				statusColor,
				borderClass,
				timeTextClass,
				clipStartMs,
				clipEndMs,
				columnIndex: 0,
				totalColumns: 1,
				leftPct: 0,
				widthPct: 100,
			});
		}
	}

	// Resolve overlap layout per day
	for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
		const blocks = map.get(dayIndex)!;
		if (blocks.length === 0) continue;
		const layout = assignOverlapColumns(blocks);
		for (let i = 0; i < blocks.length; i++) {
			const b = blocks[i]!;
			const l = layout[i]!;
			b.columnIndex = l.columnIndex;
			b.totalColumns = l.totalColumns;
			b.leftPct = (l.columnIndex / l.totalColumns) * 100;
			b.widthPct = 100 / l.totalColumns;
		}
	}

	return map;
});
</script>
