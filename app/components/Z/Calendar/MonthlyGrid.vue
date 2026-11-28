<template>
	<div>
		<!-- Desktop: Full calendar grid -->
		<div class="hidden rounded-lg border border-default bg-default lg:block">
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
					:style="{ minHeight: `max(4.75rem, calc((100dvh - 20rem) / ${weeksInGrid}))` }"
					@click="$emit('selectDay', cell.date as Date)"
				>
					<!-- Date number -->
					<div class="shrink-0 flex items-center justify-between px-1.5 sm:px-2 py-1">
						<span
							v-if="cell.date"
							class="w-7 h-7 min-w-7 rounded-full text-xs sm:text-sm font-medium flex items-center justify-center transition-colors"
							:class="[
								cell.isToday ? 'bg-primary text-inverted font-bold' : '',
								cell.isSelected && !cell.isToday ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : '',
								!cell.isCurrentMonth && 'text-gray-400 dark:text-gray-500',
							]"
						>
							{{ cell.dayNumber ?? '' }}
						</span>
					</div>
					<!-- Appointments in this day (desktop only) -->
					<div class="flex-1 overflow-hidden px-1 sm:px-1.5 pb-1 space-y-0.5 hidden sm:block">
						<template v-for="appointment in cell.appointments.slice(0, maxVisibleAppointments)" :key="appointment.code">
							<div
								class="flex items-center gap-1 py-0.5 px-1.5 rounded text-[10px] sm:text-xs cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50"
								:class="[
									selectedCode === appointment.code ? 'ring-1 ring-primary bg-primary-50 dark:bg-primary-900/20' : '',
									isPastAppointment(appointment) ? 'opacity-45' : '',
								]"
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
							@click.stop="emitOpenDayListing(cell.date as Date)"
						>
							+{{ cell.appointments.length - maxVisibleAppointments }} {{ t('components.calendar.more') }}
						</UButton>
					</div>
				</div>
			</div>
		</div>

		<div class="space-y-3 lg:hidden">
			<UCalendar
				:model-value="calendarDate(mobileDay)"
				:placeholder="calendarDate(month)"
				:week-starts-on="1"
				:disable-days-outside-current-view="true"
				:ui="{ header: 'sr-only', body: 'pt-0', cellTrigger: 'mx-auto size-11 shrink-0 flex-col gap-0.5 rounded-full' }"
				@update:model-value="selectMobileDay"
				@update:placeholder="navigateMobileMonth"
			>
				<template #day="{ day }">
					<span>{{ day.day }}</span>
					<span v-if="appointmentsByDate[day.toString()]?.length" class="size-1.5 rounded-full bg-primary" aria-hidden="true" />
				</template>
			</UCalendar>
			<h3 class="text-sm font-semibold text-highlighted" aria-live="polite">{{ format(mobileDay, 'EEEE, d MMMM') }}</h3>
			<ZCalendarDailySlots
				:date="mobileDay"
				:appointments="mobileDayAppointments"
				:selected-code="selectedCode"
				:get-status-color="getStatusColor"
				@select="$emit('selectAppointment', $event)"
			/>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { CalendarDate, type DateValue } from '@internationalized/date';
import { add, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { isAppointmentPast } from '~/utils/appointment-day-ops';
import type { Appointment } from '~/utils/types/appointment';

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
	openDayListing: [date: Date];
	navigateMonth: [date: Date];
	selectAppointment: [appointment: Appointment];
	edit: [appointment: Appointment];
	delete: [code: string];
}>();

const { t } = useI18n();

// Max visible appointments per cell in grid (desktop)
const maxVisibleAppointments = 3;

// Refresh past-booking styling about once a minute.
const now = ref(new Date());
let pastTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
	pastTimer = setInterval(() => {
		now.value = new Date();
	}, 60_000);
});
onUnmounted(() => {
	if (pastTimer) clearInterval(pastTimer);
});

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

const mobileDay = computed(() => {
	if (props.selectedDay && isSameMonth(props.selectedDay, props.month)) return props.selectedDay;
	if (isSameMonth(now.value, props.month)) return now.value;
	return startOfMonth(props.month);
});
const mobileDayAppointments = computed(() => appointmentsByDate.value[dayKey(mobileDay.value)] ?? []);

function calendarDate(date: Date) {
	return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function selectMobileDay(value: unknown) {
	if (!value || typeof value !== 'object' || !('year' in value) || !('month' in value) || !('day' in value)) return;
	const day = value as DateValue;
	emit('selectDay', new Date(day.year, day.month - 1, day.day));
}

function navigateMobileMonth(day: DateValue) {
	const date = new Date(day.year, day.month - 1, 1);
	if (!isSameMonth(date, props.month)) emit('navigateMonth', date);
}

/** "+N more" → parent opens day agenda in the shared Slideover (no nested modal). */
const emitOpenDayListing = (date: Date) => {
	emit('selectDay', date);
	emit('openDayListing', date);
};

const isPastAppointment = (appointment: Appointment) => isAppointmentPast(appointment, now.value);

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
