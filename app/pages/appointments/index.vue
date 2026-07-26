<!-- eslint-disable indent -->
<template>
	<ZPagePanel id="appointments" :title="t('nav.appointments')">
		<template #toolbar>
			<ZSectionFilterAppointments />
		</template>
		<div class="space-y-6">
			<!-- Status Filter -->
			<div class="flex flex-col gap-1.5">
				<div class="flex flex-wrap gap-2">
					<UButton
						v-for="(tab, index) in appointmentTabs"
						:key="tab.value"
						:variant="selectedTab === index ? 'solid' : 'soft'"
						:color="selectedTab === index ? 'primary' : 'neutral'"
						@click="selectTab(index)"
					>
						{{ tab.label }}
					</UButton>
				</div>
			</div>

			<!-- Listing view (default) -->
			<template v-if="appointmentStore.isListingView">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div :class="selectedAppointment ? 'lg:col-span-2' : 'lg:col-span-3'">
						<UCard>
							<div class="flex items-center justify-between mb-4">
								<div>
									<h3 class="font-semibold">{{ t('pages.upcomingAppointments') }}</h3>
									<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
										{{ t('pages.appointmentsCount', displayedAppointments.length) }}
									</p>
								</div>
							</div>
							<ZLoading v-if="appointmentStore.loading" />
							<UTable v-else :data="displayedAppointments" :columns="appointment_columns" @select="onSelectAppointment">
								<template #empty>
									<div class="flex flex-col items-center justify-center py-12 gap-3">
										<UIcon name="i-heroicons-calendar-days" class="w-16 h-16 text-gray-400" />
										<div class="text-center">
											<p class="font-medium text-gray-900 dark:text-white">{{ t('pages.noAppointmentsFound') }}</p>
											<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
												{{ filter.query ? t('pages.tryAdjustingFilters') : t('pages.scheduleFirstAppointment') }}
											</p>
										</div>
									</div>
								</template>
							</UTable>
						</UCard>
					</div>
					<div v-if="selectedAppointment" class="lg:col-span-1">
						<ZCalendarAppointmentDetail
							:appointment="selectedAppointment"
							@close="clearSelectedAppointment"
							@edit="openEditModal"
							@delete="deleteAppointment"
						/>
					</div>
				</div>
			</template>

			<!-- Daily view (UCalendar + timeslots, macOS Calendar style) -->
			<template v-else-if="appointmentStore.isDailyView">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div :class="selectedAppointment ? 'lg:col-span-2' : 'lg:col-span-3'">
						<UCard>
							<div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
								<h3 class="font-semibold hidden sm:block">{{ t('pages.dailyView') }}</h3>
								<div class="flex items-center gap-2 justify-between sm:justify-end w-full sm:w-auto">
									<UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-chevron-left" @click="goPrevDay" />
									<span class="text-center font-medium text-sm sm:text-base min-w-0 truncate">{{ format(calendarFocusDate, 'EEE, d MMM yyyy') }}</span>
									<UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-chevron-right" @click="goNextDay" />
									<UButton color="primary" variant="soft" size="sm" :label="t('pages.today')" class="hidden sm:flex" @click="goToTodayMonth" />
								</div>
							</div>
							<ZLoading v-if="appointmentStore.loading" />
							<div v-else class="flex flex-col lg:flex-row gap-6">
								<!-- Mini calendar: hidden on mobile, shown on desktop -->
								<div class="shrink-0 hidden lg:block">
									<UCard class="p-2">
										<UCalendar
											:model-value="dailyCalendarDate"
											@update:model-value="onDailyCalendarDateSelect"
											:month-controls="true"
											:year-controls="true"
											:weekStartsOn="1"
										>
											<template #day="{ day }">
												<UChip :show="hasAppointmentsOnDate(day)" color="primary" size="2xs">
													{{ day.day }}
												</UChip>
											</template>
										</UCalendar>
									</UCard>
								</div>
								<div class="flex-1 min-w-0">
									<ZCalendarDailySlots
										:date="calendarFocusDate"
										:appointments="dailyAppointments"
										:selected-code="selectedAppointment?.code ?? null"
										:get-status-color="(s: string) => getAppointmentStatusColor(s as AppointmentStatus)"
										@select="selectAppointment"
									/>
								</div>
							</div>
						</UCard>
					</div>
					<div v-if="selectedAppointment" class="lg:col-span-1">
						<div class="lg:sticky lg:top-4">
							<ZCalendarAppointmentDetail
								:appointment="selectedAppointment"
								@close="clearSelectedAppointment"
								@edit="openEditModal"
								@delete="deleteAppointment"
							/>
						</div>
					</div>
				</div>
			</template>

			<!-- Weekly view (timeslots, macOS Calendar style) -->
			<template v-else-if="appointmentStore.isWeeklyView">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div :class="selectedAppointment ? 'lg:col-span-2' : 'lg:col-span-3'">
						<UCard>
							<div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
								<h3 class="font-semibold hidden sm:block">{{ t('pages.weeklyView') }}</h3>
								<div class="flex items-center gap-2 justify-between sm:justify-end w-full sm:w-auto">
									<UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-chevron-left" @click="goPrevWeek" />
									<div class="text-center min-w-0">
										<span class="font-medium text-sm sm:text-base">
											{{ format(weekStartDate, 'd MMM') }} – {{ format(add(weekStartDate, { days: 6 }), 'd MMM yyyy') }}
										</span>
										<span class="text-gray-500 dark:text-gray-400 font-normal text-xs sm:text-sm ml-1 hidden sm:inline">{{
											t('pages.weekNumber', { n: getISOWeek(weekStartDate) })
										}}</span>
									</div>
									<UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-chevron-right" @click="goNextWeek" />
									<UButton color="primary" variant="soft" size="sm" :label="t('pages.today')" class="hidden sm:flex" @click="goToTodayMonth" />
								</div>
							</div>
							<ZLoading v-if="appointmentStore.loading" />
							<div v-else>
								<ZCalendarWeeklySlots
									:week-start="weekStartDate"
									:appointments="appointments"
									:selected-code="selectedAppointment?.code ?? null"
									:get-status-color="(s: string) => getAppointmentStatusColor(s as AppointmentStatus)"
									@select="selectAppointment"
									@edit="openEditModal"
								/>
							</div>
						</UCard>
					</div>
					<div v-if="selectedAppointment" class="lg:col-span-1">
						<div class="lg:sticky lg:top-4">
							<ZCalendarAppointmentDetail
								:appointment="selectedAppointment"
								@close="clearSelectedAppointment"
								@edit="openEditModal"
								@delete="deleteAppointment"
							/>
						</div>
					</div>
				</div>
			</template>

			<!-- Monthly view (full calendar grid with appointments in each day) -->
			<template v-else-if="appointmentStore.isMonthlyView">
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div :class="selectedAppointment ? 'lg:col-span-2' : 'lg:col-span-3'">
						<UCard>
							<div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
								<h3 class="font-semibold hidden sm:block">{{ t('pages.monthlyView') }}</h3>
								<div class="flex items-center gap-2 justify-between sm:justify-end w-full sm:w-auto">
									<UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-chevron-left" @click="goPrevMonth" />
									<span class="text-center font-medium text-sm sm:text-base">{{ format(monthDate, 'MMMM yyyy') }}</span>
									<UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-chevron-right" @click="goNextMonth" />
									<UButton color="primary" variant="soft" size="sm" :label="t('pages.today')" class="hidden sm:flex" @click="goToTodayMonth" />
								</div>
							</div>
							<ZLoading v-if="appointmentStore.loading" />
							<div v-else>
								<ZCalendarMonthlyGrid
									:month="monthDate"
									:appointments="appointments"
									:selected-code="selectedAppointment?.code ?? null"
									:selected-day="selectedCalendarDay"
									:get-status-color="(s: string) => getAppointmentStatusColor(s as AppointmentStatus)"
									@select-day="selectDayInCalendarFromDate"
									@select-appointment="selectAppointment"
									@edit="openEditModal"
									@delete="deleteAppointment"
								/>
							</div>
						</UCard>
					</div>
					<div v-if="selectedAppointment" class="lg:col-span-1">
						<div class="lg:sticky lg:top-4">
							<ZCalendarAppointmentDetail
								:appointment="selectedAppointment"
								@close="clearSelectedAppointment"
								@edit="openEditModal"
								@delete="deleteAppointment"
							/>
						</div>
					</div>
				</div>
			</template>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { CalendarDate, type DateValue } from '@internationalized/date';
import type { TableRow } from '@nuxt/ui';
import { ZModalAppointmentDetail, ZModalConfirmation } from '#components';
import { add, addMonths, endOfMonth, endOfDay, endOfWeek, format, getISOWeek, isWithinInterval, startOfDay, startOfMonth, startOfWeek, sub } from 'date-fns';
import { AppointmentStatus } from 'yeppi-common';
import type { Appointment } from '~/utils/types/appointment';
import { getAppointmentColumns } from '~/utils/table-columns';
import { getAppointmentStatusColor } from '~/utils/options';
import { failedNotification } from '~/stores/AppUi/AppUi';

const overlay = useOverlay();
const appointmentStore = useAppointmentStore();
const { appointments, filter } = storeToRefs(appointmentStore);
const selectedAppointment = ref<Appointment | null>(null);
const route = useRoute();
const router = useRouter();

// Calendar view state
const today = new Date();
const calendarPlaceholder = ref(new CalendarDate(today.getFullYear(), today.getMonth() + 1, 1));
const calendarFocusDate = ref(new Date());
const selectedCalendarDay = ref<Date | null>(null);
const selectedTab = ref(0);

const { t } = useI18n();
const appointment_columns = computed(() => getAppointmentColumns(t));
useHead({ title: () => t('pages.appointmentsTitle') });

const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');

/** Current month, next month, and the following two months (four calendar months total). */
const fourMonthForwardRange = (anchor: Date) => {
	const monthStart = startOfMonth(anchor);
	return {
		start: monthStart,
		end: endOfMonth(addMonths(monthStart, 3)),
	};
};

const dateInLoadedRange = (d: Date) => {
	const { start, end } = filter.value.date_range;
	if (!start || !end) return false;
	return isWithinInterval(d, { start: startOfDay(start), end: endOfDay(end) });
};

const weekFullyInLoadedRange = (weekStart: Date, weekEnd: Date) => dateInLoadedRange(weekStart) && dateInLoadedRange(weekEnd);

const appointmentTabs = computed(() => [
	{ label: t('options.all'), value: 'All' },
	{ label: t('options.pending'), value: AppointmentStatus.PENDING },
	{ label: t('options.confirmed'), value: AppointmentStatus.CONFIRMED },
	{ label: t('options.completed'), value: AppointmentStatus.COMPLETED },
	{ label: t('options.cancelled'), value: AppointmentStatus.CANCELLED },
]);

// Appointments grouped by date (YYYY-MM-DD)
const appointmentsByDate = computed(() => {
	const map: Record<string, Appointment[]> = {};
	for (const a of appointments.value) {
		const key = dateKey(new Date(a.start_date_time));
		if (!map[key]) map[key] = [];
		map[key].push(a);
	}
	for (const key of Object.keys(map)) {
		const arr = map[key];
		if (arr) arr.sort((x, y) => new Date(x.start_date_time).getTime() - new Date(y.start_date_time).getTime());
	}
	return map;
});

// For the UCalendar #day slot: check if a DateValue has appointments
const hasAppointmentsOnDate = (day: DateValue): boolean => {
	const key = `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`;
	return (appointmentsByDate.value[key]?.length ?? 0) > 0;
};

// For daily view: appointments on the focused day
const dailyAppointments = computed(() => {
	const key = dateKey(calendarFocusDate.value);
	return appointmentsByDate.value[key] ?? [];
});

// Daily view: CalendarDate for UCalendar (single-day picker)
const dailyCalendarDate = computed(
	() => new CalendarDate(calendarFocusDate.value.getFullYear(), calendarFocusDate.value.getMonth() + 1, calendarFocusDate.value.getDate()),
);

// For weekly view: start of week (Monday) and 7 days
const weekStartDate = computed(() => startOfWeek(calendarFocusDate.value, { weekStartsOn: 1 }));

// Display appointments based on filter state (listing view)
const displayedAppointments = computed(() => {
	const result = [...appointments.value];
	return result.sort((a, b) => new Date(a.start_date_time).getTime() - new Date(b.start_date_time).getTime());
});

const monthDate = computed(() => new Date(calendarPlaceholder.value.year, calendarPlaceholder.value.month - 1, 1));

const selectTab = async (index: number) => {
	selectedTab.value = index;
	filter.value.current_page = 1;
	filter.value.status = appointmentTabs.value[index]?.value as AppointmentStatus | string;
	await search();
};

// Emit events to parent
const search = async () => {
	await appointmentStore.getAppointments();
};

const onDailyCalendarDateSelect = async (value: DateValue | DateValue[] | { start?: DateValue; end?: DateValue } | null | undefined) => {
	const dateValue =
		value == null ? null : Array.isArray(value) ? value[0] : 'start' in (value as object) ? (value as { start?: DateValue }).start : (value as DateValue);
	if (!dateValue || !('year' in dateValue) || !('month' in dateValue) || !('day' in dateValue)) return;
	const d = new Date(dateValue.year, dateValue.month - 1, dateValue.day);
	calendarFocusDate.value = d;
	if (dateInLoadedRange(d)) return;
	filter.value.date_range = fourMonthForwardRange(d);
	await appointmentStore.getAppointments();
};

const goPrevDay = async () => {
	calendarFocusDate.value = sub(calendarFocusDate.value, { days: 1 });
	if (dateInLoadedRange(calendarFocusDate.value)) return;
	filter.value.date_range = fourMonthForwardRange(calendarFocusDate.value);
	await appointmentStore.getAppointments();
};

const goNextDay = async () => {
	calendarFocusDate.value = add(calendarFocusDate.value, { days: 1 });
	if (dateInLoadedRange(calendarFocusDate.value)) return;
	filter.value.date_range = fourMonthForwardRange(calendarFocusDate.value);
	await appointmentStore.getAppointments();
};

const goPrevWeek = async () => {
	calendarFocusDate.value = sub(weekStartDate.value, { days: 7 });
	const ws = weekStartDate.value;
	const we = endOfWeek(calendarFocusDate.value, { weekStartsOn: 1 });
	if (weekFullyInLoadedRange(ws, we)) return;
	filter.value.date_range = fourMonthForwardRange(ws);
	await appointmentStore.getAppointments();
};

const goNextWeek = async () => {
	calendarFocusDate.value = add(weekStartDate.value, { days: 7 });
	const ws = weekStartDate.value;
	const we = endOfWeek(calendarFocusDate.value, { weekStartsOn: 1 });
	if (weekFullyInLoadedRange(ws, we)) return;
	filter.value.date_range = fourMonthForwardRange(ws);
	await appointmentStore.getAppointments();
};

const goPrevMonth = async () => {
	const prev = sub(monthDate.value, { months: 1 });
	calendarPlaceholder.value = new CalendarDate(prev.getFullYear(), prev.getMonth() + 1, 1);
	const anchor = new Date(prev.getFullYear(), prev.getMonth(), 1);
	filter.value.date_range = fourMonthForwardRange(anchor);
	await appointmentStore.getAppointments();
};

const goNextMonth = async () => {
	const next = add(monthDate.value, { months: 1 });
	calendarPlaceholder.value = new CalendarDate(next.getFullYear(), next.getMonth() + 1, 1);
	const anchor = new Date(next.getFullYear(), next.getMonth(), 1);
	filter.value.date_range = fourMonthForwardRange(anchor);
	await appointmentStore.getAppointments();
};

const goToTodayMonth = async () => {
	const now = new Date();
	calendarPlaceholder.value = new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1);
	if (appointmentStore.isWeeklyView) {
		calendarFocusDate.value = now;
		filter.value.date_range = fourMonthForwardRange(startOfWeek(now, { weekStartsOn: 1 }));
	} else if (appointmentStore.isDailyView) {
		calendarFocusDate.value = now;
		filter.value.date_range = fourMonthForwardRange(now);
	} else {
		filter.value.date_range = fourMonthForwardRange(new Date(now.getFullYear(), now.getMonth(), 1));
	}
	await appointmentStore.getAppointments();
};

const selectDayInCalendarFromDate = (date: Date) => {
	selectedCalendarDay.value = date;
};

const deleteAppointment = async (code: string) => {
	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: t('pages.confirmDeleteAppointment'),
			action: 'delete',
			onConfirm: async () => {
				await appointmentStore.deleteAppointment(code);
				confirmModal.close();
				// Clear selected appointment if it's the one being deleted
				if (selectedAppointment.value?.code === code) {
					clearSelectedAppointment();
				}
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};

// When switching view, align date range and calendar focus; refetch is handled elsewhere
// watch(
// 	() => filter.value.view,
// 	(view) => {
// 		selectedAppointment.value = null;
// 		if (view === 'monthly') {
// 			const anchor = new Date(calendarPlaceholder.value.year, calendarPlaceholder.value.month - 1, 1);
// 			filter.value.date_range = fourMonthForwardRange(anchor);
// 		} else if (view === 'daily') {
// 			calendarFocusDate.value = new Date();
// 			filter.value.date_range = fourMonthForwardRange(calendarFocusDate.value);
// 		} else if (view === 'weekly') {
// 			const start = startOfWeek(new Date(), { weekStartsOn: 1 });
// 			calendarFocusDate.value = start;
// 			filter.value.date_range = fourMonthForwardRange(start);
// 		} else {
// 			filter.value.date_range = {
// 				start: sub(new Date(), { days: 14 }),
// 				end: add(new Date(), { days: 14 }),
// 			};
// 		}
// 	},
// 	{ immediate: false },
// );

const applyDashboardDateQueryToFilter = () => {
	const start = route.query.start_date;
	const end = route.query.end_date;
	if (typeof start === 'string' && start) {
		const d = new Date(start);
		if (!Number.isNaN(d.getTime())) {
			filter.value.date_range.start = d;
		}
	}
	if (typeof end === 'string' && end) {
		const d = new Date(end);
		if (!Number.isNaN(d.getTime())) {
			filter.value.date_range.end = d;
		}
	}
};

const clearSelectedAppointment = () => {
	selectedAppointment.value = null;
	if (!route.query.code) return;

	const nextQuery = { ...route.query };
	delete nextQuery.code;
	void router.replace({ query: nextQuery });
};

const openAppointmentFromQuery = async () => {
	const code = typeof route.query.code === 'string' ? route.query.code.trim() : '';
	if (!code) return;

	filter.value.view = 'listing';
	filter.value.current_page = 1;
	filter.value.status = 'All';
	selectedTab.value = 0;

	let found = appointments.value.find((appointment) => appointment.code === code) ?? null;
	if (!found) {
		found = await appointmentStore.getAppointmentByCode(code);
		if (found) {
			const start = new Date(found.start_date_time);
			if (!Number.isNaN(start.getTime())) {
				filter.value.date_range = fourMonthForwardRange(start);
				await appointmentStore.getAppointments();
				found = appointments.value.find((appointment) => appointment.code === code) ?? found;
			}
			if (found && !appointments.value.some((appointment) => appointment.code === found?.code)) {
				appointments.value = [found, ...appointments.value];
			}
		}
	}

	if (!found) {
		failedNotification('Appointment not found');
		return;
	}

	selectedAppointment.value = found;
};

onMounted(async () => {
	applyDashboardDateQueryToFilter();
	await appointmentStore.getAppointments();
	await openAppointmentFromQuery();
});

watch(
	() => route.query.code,
	async () => {
		await openAppointmentFromQuery();
	},
);

const selectAppointment = (appointment: Appointment) => {
	if (!appointment) return;
	selectedAppointment.value = appointment;
};

const onSelectAppointment = (_e: Event, row: TableRow<Appointment>) => {
	const appointment = row.original;
	if (appointment) selectAppointment(appointment);
};

const openEditModal = async (appointment: Appointment) => {
	if (!appointment) return;

	const appointmentModal = overlay.create(ZModalAppointmentDetail, {
		props: {
			appointment: appointment,
			onUpdate: async (appointment: Appointment) => {
				await appointmentStore.updateAppointment(appointment);
				appointmentModal.close();
				if (selectedAppointment.value?.code === appointment.code) {
					selectedAppointment.value = appointments.value.find((a) => a.code === appointment.code) || null;
				}
			},
			onDelete: async () => {
				appointmentModal.close();
				await deleteAppointment(appointment.code);
			},
			onCancel: () => {
				appointmentModal.close();
			},
		},
	});

	appointmentModal.open();
};

const exportAppointments = async () => {
	// await appointmentStore.exportAppointments();
};
</script>

<style scoped></style>
