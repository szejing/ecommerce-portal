<template>
	<div>
		<!-- Desktop: Full calendar grid -->
		<div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-default">
			<!-- Weekday headers -->
			<div class="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
				<div v-for="wd in weekdayLabels" :key="wd.full" class="py-2 text-center text-xs font-medium text-gray-600 dark:text-gray-400">
					<!-- Full name on desktop, short on mobile -->
					<span class="hidden sm:inline">{{ wd.full }}</span>
					<span class="sm:hidden">{{ wd.short }}</span>
				</div>
			</div>
			<!-- Month grid: 6 rows × 7 days -->
			<div class="grid grid-cols-7 auto-rows-fr" :style="{ gridTemplateRows: `repeat(${weeksInGrid}, minmax(0, 1fr))` }">
				<div
					v-for="cell in gridCells"
					:key="cell.key"
					class="border-b border-r border-gray-100 dark:border-gray-800 last:border-r-0 flex flex-col transition-colors cursor-pointer overflow-hidden"
					:class="[
						cell.isToday ? 'bg-primary/5 dark:bg-primary/10' : cell.isCurrentMonth ? 'bg-default' : 'bg-gray-50/80 dark:bg-gray-900/50',
						cell.isSelected ? 'ring-2 ring-primary ring-inset bg-primary/5 dark:bg-primary/10' : '',
					]"
					:style="{ minHeight: isMobileView ? '56px' : '100px' }"
					@click="$emit('selectDay', cell.date as Date)"
				>
					<!-- Date number -->
					<div class="shrink-0 flex items-center justify-between px-1.5 sm:px-2 py-1">
						<span
							v-if="cell.date"
							class="w-7 h-7 min-w-7 rounded-full text-xs sm:text-sm font-medium flex items-center justify-center transition-colors"
							:class="[
								cell.isToday ? 'bg-primary text-white font-bold' : '',
								cell.isSelected && !cell.isToday ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : '',
								!cell.isCurrentMonth && 'text-gray-400 dark:text-gray-500',
							]"
						>
							{{ cell.dayNumber ?? '' }}
						</span>
						<!-- Appointment count dot for mobile -->
						<span v-if="cell.appointments.length > 0" class="sm:hidden flex items-center gap-0.5">
							<span
								v-for="(dot, dotIdx) in Math.min(cell.appointments.length, 3)"
								:key="dotIdx"
								class="w-1.5 h-1.5 rounded-full"
								:class="getDotColorClass(cell.appointments[dotIdx]?.status)"
							/>
						</span>
					</div>
					<!-- Appointments in this day (desktop only) -->
					<div class="flex-1 overflow-hidden px-1 sm:px-1.5 pb-1 space-y-0.5 hidden sm:block">
						<template v-for="(appointment, idx) in cell.appointments.slice(0, maxVisibleAppointments)" :key="appointment.code">
							<div
								class="flex items-center gap-1 py-0.5 px-1.5 rounded text-[10px] sm:text-xs cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50"
								:class="[selectedCode === appointment.code ? 'ring-1 ring-primary bg-primary-50 dark:bg-primary-900/20' : '']"
								@click.stop="$emit('selectAppointment', appointment)"
							>
								<span class="w-1.5 h-1.5 rounded-full shrink-0" :class="getDotColorClass(appointment.status)" />
								<span class="font-medium truncate text-gray-900 dark:text-gray-100">
									{{ formatTime(appointment.start_date_time) }}
								</span>
								<span class="truncate text-gray-600 dark:text-gray-400">
									{{ appointment.customer_name }}
								</span>
							</div>
						</template>
						<!-- "+N more" overflow indicator -->
						<UButton
							v-if="cell.appointments.length > maxVisibleAppointments"
							variant="link"
							color="primary"
							size="xs"
							class="w-full justify-start text-[10px] sm:text-xs font-medium px-1.5 py-0.5 min-h-0"
							@click.stop="openDayListing(cell.date as Date)"
						>
							+{{ cell.appointments.length - maxVisibleAppointments }} {{ t('components.calendar.more') }}
						</UButton>
					</div>
				</div>
			</div>
		</div>

		<!-- Mobile: Selected day agenda panel (shown below calendar when a day is selected) -->
		<div v-if="selectedDay && isMobileView" class="mt-3 lg:hidden">
			<div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-default">
				<div class="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
					<div
						class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
						:class="[isSelectedDayToday ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300']"
					>
						{{ format(selectedDay, 'd') }}
					</div>
					<div class="flex-1 min-w-0">
						<p class="font-semibold text-sm text-gray-900 dark:text-white">{{ format(selectedDay, 'EEEE, d MMMM') }}</p>
					</div>
					<UBadge v-if="selectedDayAppointments.length > 0" color="primary" variant="subtle" size="sm">
						{{ selectedDayAppointments.length }}
					</UBadge>
				</div>
				<div v-if="selectedDayAppointments.length > 0" class="divide-y divide-gray-100 dark:divide-gray-800">
					<div
						v-for="appointment in selectedDayAppointments"
						:key="appointment.code"
						class="flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
						:class="[selectedCode === appointment.code ? 'bg-primary-50/50 dark:bg-primary-900/10' : '']"
						@click="$emit('selectAppointment', appointment)"
					>
						<div class="w-1 self-stretch rounded-full shrink-0 mt-0.5" :class="getDotColorClass(appointment.status)" />
						<div class="flex-1 min-w-0">
							<div class="flex items-center justify-between gap-2">
								<p class="font-medium text-sm text-gray-900 dark:text-white truncate">{{ appointment.customer_name }}</p>
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
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ZModalDayAppointments } from '#components';
import { add, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';
import type { Appointment } from '~/utils/types/appointment';

const overlay = useOverlay();
const dayModal = overlay.create(ZModalDayAppointments);

const props = withDefaults(
	defineProps<{
		month: Date;
		appointments: Appointment[];
		selectedCode?: string | null;
		selectedDay?: Date | null;
		weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
		getStatusColor?: (status: string) => string;
	}>(),
	{
		weekStartsOn: 1,
		selectedDay: null,
		getStatusColor: () => 'primary',
	},
);

const emit = defineEmits<{
	selectDay: [date: Date];
	selectAppointment: [appointment: Appointment];
	edit: [appointment: Appointment];
	delete: [code: string];
}>();

const { t } = useI18n();

// Max visible appointments per cell in grid (desktop)
const maxVisibleAppointments = 3;

// Simple mobile detection
const isMobileView = ref(false);
onMounted(() => {
	checkMobile();
	window.addEventListener('resize', checkMobile);
});
onUnmounted(() => {
	window.removeEventListener('resize', checkMobile);
});
const checkMobile = () => {
	isMobileView.value = window.innerWidth < 640;
};

// Weekday headers with full & short labels
const weekdayLabels = computed(() => {
	const monday = new Date(2024, 0, 1); // Jan 1 2024 is Monday
	const labels: { full: string; short: string }[] = [];
	for (let i = 0; i < 7; i++) {
		const d = add(monday, { days: i });
		labels.push({ full: format(d, 'EEE'), short: format(d, 'EEEEE') });
	}
	return labels;
});

const weeksInGrid = 6;

const dayKey = (d: Date) => format(d, 'yyyy-MM-dd');
const todayKey = dayKey(new Date());

const isSelectedDayToday = computed(() => {
	if (!props.selectedDay) return false;
	return dayKey(props.selectedDay) === todayKey;
});

const appointmentsByDate = computed(() => {
	const map: Record<string, Appointment[]> = {};
	for (const a of props.appointments) {
		const key = dayKey(new Date(a.start_date_time));
		if (!map[key]) map[key] = [];
		map[key].push(a);
	}
	for (const key of Object.keys(map)) {
		const arr = map[key];
		if (arr) arr.sort((x, y) => new Date(x.start_date_time).getTime() - new Date(y.start_date_time).getTime());
	}
	return map;
});

const gridCells = computed(() => {
	const first = startOfMonth(props.month);
	const last = endOfMonth(props.month);
	const gridStart = startOfWeek(first, { weekStartsOn: props.weekStartsOn });
	const selectedKey = props.selectedDay ? dayKey(props.selectedDay) : null;
	const cells: {
		key: string;
		date: Date | null;
		dayNumber: number | null;
		isCurrentMonth: boolean;
		isToday: boolean;
		isSelected: boolean;
		appointments: Appointment[];
	}[] = [];
	let cursor = new Date(gridStart);
	const totalCells = 7 * weeksInGrid;
	for (let i = 0; i < totalCells; i++) {
		const key = dayKey(cursor);
		const isCurrentMonth = cursor.getMonth() === props.month.getMonth();
		const isToday = key === todayKey;
		const isSelected = selectedKey === key;
		const appointments = isCurrentMonth ? (appointmentsByDate.value[key] ?? []) : [];
		cells.push({
			key: `${key}-${i}`,
			date: new Date(cursor),
			dayNumber: cursor.getDate(),
			isCurrentMonth,
			isToday,
			isSelected,
			appointments,
		});
		cursor = add(cursor, { days: 1 });
	}
	return cells;
});

const selectedDayAppointments = computed(() => {
	if (!props.selectedDay) return [];
	return appointmentsByDate.value[dayKey(props.selectedDay)] ?? [];
});

// Day listing modal: open programmatically via useOverlay when clicking "+N more"
const openDayListing = (date: Date) => {
	emit('selectDay', date);
	const appointments = appointmentsByDate.value[dayKey(date)] ?? [];
	dayModal.open({
		date,
		appointments,
		getStatusColor: props.getStatusColor,
		onSelectAppointment: (a) => emit('selectAppointment', a),
		onEdit: (a) => emit('edit', a),
		onDelete: (c) => emit('delete', c),
	});
};

const formatTime = (d: string | Date) => format(new Date(d), 'h:mm a');

/** Get the color dot class for a status */
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
