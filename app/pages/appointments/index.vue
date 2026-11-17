<!-- eslint-disable indent -->
<template>
	<ZPagePanel id="appointments" :title="t('nav.appointments')" toolbar-fill>
		<template #toolbar>
			<div class="flex w-full min-w-0 flex-col gap-2">
				<ZSectionFilterAppointments />
				<div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
					<ZSectionAppointmentsStatusChips class="min-w-0" :model-value="uiStatus" :counts="statusCounts" @update:model-value="onStatusChip" />
					<p class="text-sm text-gray-500 lg:shrink-0 lg:text-right dark:text-gray-400">
						{{
							t('pages.appointmentDayOpsSummary', {
								bookings: dayStatusCounts.all,
								pending: dayStatusCounts.pending,
							})
						}}
					</p>
				</div>
			</div>
		</template>
		<div class="space-y-3 pb-24 lg:pb-0">
			<ZSectionAppointmentsAttentionRail v-if="showAttentionRail" :items="attentionRailItems" @select="selectAppointment" @select-gap="onSelectGap" />

			<!-- Listing view -->
			<template v-if="appointmentStore.isListingView">
				<UCard>
					<div class="flex items-center justify-between mb-4">
						<div>
							<h3 class="font-semibold">{{ t('pages.upcomingAppointments') }}</h3>
							<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
								{{ t('pages.appointmentsCount', displayedAppointments.length) }}
							</p>
						</div>
					</div>
					<ZLoading v-if="showInitialLoader" />
					<UTable
						v-else
						:data="displayedAppointments"
						:columns="appointment_columns"
						:meta="appointmentTableMeta"
						@select="onSelectAppointment"
					>
						<template #empty>
							<div class="flex flex-col items-center justify-center py-12 gap-3">
								<UIcon name="i-heroicons-calendar-days" class="w-16 h-16 text-gray-400" />
								<div class="text-center">
									<p class="font-medium text-gray-900 dark:text-white">{{ t('pages.noAppointmentsFound') }}</p>
									<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
										{{ filters.query ? t('pages.tryAdjustingFilters') : t('pages.scheduleFirstAppointment') }}
									</p>
								</div>
							</div>
						</template>
					</UTable>
				</UCard>
			</template>

			<!-- Daily view -->
			<template v-else-if="appointmentStore.isDailyView">
				<UCard>
					<div class="mb-3 flex items-center gap-2">
						<UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-chevron-left" class="min-h-10 min-w-10" :aria-label="t('pages.previousAppointment')" @click="goPrevDay" />
						<span class="min-w-0 flex-1 truncate text-center text-sm font-medium sm:text-base">{{ format(calendarFocusDate, 'EEE, d MMM yyyy') }}</span>
						<UButton color="neutral" variant="outline" size="sm" icon="i-heroicons-chevron-right" class="min-h-10 min-w-10" :aria-label="t('pages.nextAppointment')" @click="goNextDay" />
						<UPopover v-model:open="dayPickerOpen">
							<UButton
								color="neutral"
								variant="outline"
								size="sm"
								icon="i-heroicons-calendar-days"
								class="min-h-10 min-w-10"
								:aria-label="t('components.selectMenu.pickADate')"
							/>
							<template #content>
								<div class="p-2">
									<UCalendar
										:model-value="dailyCalendarDate"
										:month-controls="true"
										:year-controls="true"
										:week-starts-on="1"
										@update:model-value="onDailyCalendarDateSelect"
									>
										<template #day="{ day }">
											<UChip :show="hasAppointmentsOnDate(day)" color="primary" size="2xs">
												{{ day.day }}
											</UChip>
										</template>
									</UCalendar>
								</div>
							</template>
						</UPopover>
						<UButton color="primary" variant="soft" size="sm" :label="t('pages.today')" class="hidden min-h-10 sm:flex" @click="goToTodayMonth" />
					</div>
					<ZLoading v-if="showInitialLoader" />
					<ZCalendarDailySlots
						v-else
						:date="calendarFocusDate"
						:appointments="dailyAppointments"
						:selected-code="selectedAppointment?.code ?? null"
						:get-status-color="(s: string) => getAppointmentStatusColor(s as AppointmentStatus)"
						@select="selectAppointment"
					/>
				</UCard>
			</template>

			<!-- Weekly view -->
			<template v-else-if="appointmentStore.isWeeklyView">
				<UCard>
					<div class="mb-3 flex items-center gap-2">
						<UButton
							color="neutral"
							variant="outline"
							size="sm"
							icon="i-heroicons-chevron-left"
							class="min-h-10 min-w-10"
							:aria-label="t('pages.previousAppointment')"
							@click="goPrevWeek"
						/>
						<div class="min-w-0 flex-1 text-center">
							<span class="text-sm font-medium sm:text-base">
								{{ format(weekStartDate, 'd MMM') }} – {{ format(add(weekStartDate, { days: 6 }), 'd MMM yyyy') }}
							</span>
							<span class="ml-1 hidden text-xs font-normal text-gray-500 sm:inline sm:text-sm dark:text-gray-400">{{
								t('pages.weekNumber', { n: getISOWeek(weekStartDate) })
							}}</span>
						</div>
						<UButton
							color="neutral"
							variant="outline"
							size="sm"
							icon="i-heroicons-chevron-right"
							class="min-h-10 min-w-10"
							:aria-label="t('pages.nextAppointment')"
							@click="goNextWeek"
						/>
						<UButton color="primary" variant="soft" size="sm" :label="t('pages.today')" class="hidden min-h-10 sm:flex" @click="goToTodayMonth" />
					</div>
					<ZLoading v-if="showInitialLoader" />
					<div v-else>
						<ZCalendarWeeklySlots
							:week-start="weekStartDate"
							:appointments="visibleAppointments"
							:selected-code="selectedAppointment?.code ?? null"
							:get-status-color="(s: string) => getAppointmentStatusColor(s as AppointmentStatus)"
							@select="selectAppointment"
							@edit="openEditModal"
						/>
					</div>
				</UCard>
			</template>

			<!-- Calendar (month) view -->
			<template v-else-if="appointmentStore.isMonthlyView">
				<UCard>
					<div class="mb-3 flex items-center gap-2">
						<UButton
							color="neutral"
							variant="outline"
							size="sm"
							icon="i-heroicons-chevron-left"
							class="min-h-10 min-w-10"
							:aria-label="t('pages.previousAppointment')"
							@click="goPrevMonth"
						/>
						<span class="min-w-0 flex-1 truncate text-center text-sm font-medium sm:text-base">{{ format(monthDate, 'MMMM yyyy') }}</span>
						<UButton
							color="neutral"
							variant="outline"
							size="sm"
							icon="i-heroicons-chevron-right"
							class="min-h-10 min-w-10"
							:aria-label="t('pages.nextAppointment')"
							@click="goNextMonth"
						/>
						<UButton color="primary" variant="soft" size="sm" :label="t('pages.today')" class="hidden min-h-10 sm:flex" @click="goToTodayMonth" />
					</div>
					<ZLoading v-if="showInitialLoader" />
					<div v-else>
						<ZCalendarMonthlyGrid
							:month="monthDate"
							:appointments="visibleAppointments"
							:selected-code="selectedAppointment?.code ?? null"
							:selected-day="selectedCalendarDay"
							:get-status-color="(s: string) => getAppointmentStatusColor(s as AppointmentStatus)"
							@select-day="selectDayInCalendarFromDate"
							@open-day-listing="openDayListing"
							@select-appointment="selectAppointment"
							@edit="openEditModal"
							@delete="deleteAppointment"
						/>
					</div>
				</UCard>
			</template>

			<ZCalendarAppointmentPanel
				v-model:open="isPanelOpen"
				:appointment="selectedAppointment"
				:day-date="dayListingDate"
				:day-appointments="dayListingAppointments"
				:position-label="panelNavPositionLabel"
				:can-go-previous="canGoPreviousAppointment"
				:can-go-next="canGoNextAppointment"
				@close="closePanel"
				@back="backToDayAgenda"
				@previous="goPreviousAppointment"
				@next="goNextAppointment"
				@edit="openEditModal"
				@delete="deleteAppointment"
				@select="(appointment) => selectAppointment(appointment, { fromDayAgenda: true })"
			/>

			<!-- Mobile day-ops dock -->
			<div
				class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-3 py-2 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 lg:hidden"
				style="padding-bottom: max(0.5rem, env(safe-area-inset-bottom))"
			>
				<div class="mx-auto grid max-w-lg grid-cols-3 gap-2">
					<UButton color="neutral" variant="outline" class="min-h-12 justify-center" @click="setView('weekly')">
						{{ t('components.filter.weekly') }}
					</UButton>
					<UButton color="neutral" variant="outline" class="min-h-12 justify-center" @click="setView('monthly')">
						{{ t('components.filter.monthly') }}
					</UButton>
					<UButton color="primary" class="min-h-12 justify-center" :disabled="!nextPending" @click="onNextPending">
						{{ t('pages.appointmentNextPending') }}
					</UButton>
				</div>
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { CalendarDate, type DateValue } from '@internationalized/date';
import type { TableRow } from '@nuxt/ui';
import { ZModalAppointmentDetail, ZModalConfirmation } from '#components';
import { add, addMonths, endOfMonth, endOfDay, endOfWeek, format, getISOWeek, isWithinInterval, startOfDay, startOfMonth, startOfWeek, sub } from 'date-fns';
import { AppointmentStatus } from 'yeppi-common';
import type { AppointmentView } from '~/stores/Appointment/Appointment';
import {
	appointmentsOnDay,
	buildAttentionRailItems,
	countAppointmentsByStatus,
	findNextPendingAppointment,
	isAppointmentPast,
	sortAppointmentsForListing,
} from '~/utils/appointment-day-ops';
import type { Row, TableMeta } from '@tanstack/table-core';
import type { Appointment } from '~/utils/types/appointment';
import { getAppointmentColumns } from '~/utils/table-columns';
import { getAppointmentStatusColor } from '~/utils/options';
import { failedNotification } from '~/stores/AppUi/AppUi';

const overlay = useOverlay();
const appointmentStore = useAppointmentStore();
const { appointments, filter, filters, listFailure } = storeToRefs(appointmentStore);
const selectedAppointment = ref<Appointment | null>(null);
/** When set, Slideover/Drawer shows day agenda until an appointment is chosen (Back returns here). */
const dayListingDate = ref<Date | null>(null);
const route = useRoute();
const router = useRouter();
/** Client-side status chip filter so range counts stay stable (API keeps status All). */
const uiStatus = ref<string>('All');
const listingNow = ref(new Date());

watch(listFailure, (failure) => {
	if (failure) failedNotification(failure.message);
});

// Calendar view state
const today = new Date();
const calendarPlaceholder = ref(new CalendarDate(today.getFullYear(), today.getMonth() + 1, 1));
const calendarFocusDate = ref(new Date());
const selectedCalendarDay = ref<Date | null>(null);
const dayPickerOpen = ref(false);

const { t } = useI18n();
const appointment_columns = computed(() => getAppointmentColumns(t));
const appointmentTableMeta: TableMeta<Appointment> = {
	class: {
		tr: (row: Row<Appointment>) => (isAppointmentPast(row.original) ? 'opacity-50' : undefined),
	},
};
useHead({ title: () => t('pages.appointmentsTitle') });

const dateKey = (d: Date) => format(d, 'yyyy-MM-dd');

const visibleAppointments = computed(() => {
	if (uiStatus.value === 'All') return appointments.value;
	if (uiStatus.value === AppointmentStatus.CANCELLED) {
		return appointments.value.filter((a) => a.status === AppointmentStatus.CANCELLED || a.status === AppointmentStatus.VOIDED);
	}
	return appointments.value.filter((a) => a.status === uiStatus.value);
});

const showInitialLoader = computed(
	() => appointmentStore.loading && appointments.value.length === 0,
);
const statusCounts = computed(() => countAppointmentsByStatus(appointments.value));
const dayAppointments = computed(() => appointmentsOnDay(appointments.value, calendarFocusDate.value));
const dayStatusCounts = computed(() => countAppointmentsByStatus(dayAppointments.value));
const nextPending = computed(() => findNextPendingAppointment(appointments.value));
const showAttentionRail = computed(() => appointmentStore.isDailyView);
const attentionRailItems = computed(() =>
	buildAttentionRailItems(visibleAppointments.value, {
		now: new Date(),
		day: calendarFocusDate.value,
		maxPending: 2,
		minGapMinutes: 30,
	}),
);

const dayListingAppointments = computed(() => {
	if (!dayListingDate.value) return [];
	return appointmentsOnDay(visibleAppointments.value, dayListingDate.value);
});

/** Shared open state for desktop Slideover / mobile Drawer (day agenda or detail). */
const isPanelOpen = computed({
	get: () => dayListingDate.value !== null || selectedAppointment.value !== null,
	set: (open: boolean) => {
		if (!open) closePanel();
	},
});

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

// Appointments grouped by date (YYYY-MM-DD) — respects status chips
const appointmentsByDate = computed(() => {
	const map: Record<string, Appointment[]> = {};
	for (const a of visibleAppointments.value) {
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

// Listing: not yet started, soonest first, then already started, closest first.
// Other views that reuse this list stay in start-time order.
const displayedAppointments = computed(() => {
	const result = [...visibleAppointments.value];
	if (appointmentStore.isListingView) return sortAppointmentsForListing(result, listingNow.value);
	return result.sort((a, b) => new Date(a.start_date_time).getTime() - new Date(b.start_date_time).getTime());
});

const weekAppointments = computed(() => {
	const start = weekStartDate.value;
	const keys = Array.from({ length: 7 }, (_, i) => dateKey(add(start, { days: i })));
	const list: Appointment[] = [];
	for (const key of keys) {
		const day = appointmentsByDate.value[key];
		if (day?.length) list.push(...day);
	}
	return list;
});

/**
 * Hybrid nav: same day from day agenda; else the list staff see in the active view
 * (Day / Week / Month|List), respecting status chips.
 */
const panelNavAppointments = computed(() => {
	if (dayListingDate.value) return dayListingAppointments.value;
	if (appointmentStore.isDailyView) return dailyAppointments.value;
	if (appointmentStore.isWeeklyView) return weekAppointments.value;
	return displayedAppointments.value;
});

const panelNavIndex = computed(() => {
	const code = selectedAppointment.value?.code;
	if (!code) return -1;
	return panelNavAppointments.value.findIndex((a) => a.code === code);
});

const panelNavPositionLabel = computed(() => {
	const total = panelNavAppointments.value.length;
	if (total < 2 || panelNavIndex.value < 0) return null;
	return `${panelNavIndex.value + 1} / ${total}`;
});

const canGoPreviousAppointment = computed(() => panelNavIndex.value > 0);
const canGoNextAppointment = computed(() => {
	const idx = panelNavIndex.value;
	return idx >= 0 && idx < panelNavAppointments.value.length - 1;
});

const monthDate = computed(() => new Date(calendarPlaceholder.value.year, calendarPlaceholder.value.month - 1, 1));

const onStatusChip = (status: string) => {
	uiStatus.value = status;
};

const setView = (view: AppointmentView) => {
	filter.value.view = view;
};

const onNextPending = () => {
	const pending = nextPending.value;
	if (!pending) return;
	selectAppointment(pending);
};

const onSelectGap = (start: Date) => {
	calendarFocusDate.value = start;
	filter.value.view = 'daily';
};

const onDailyCalendarDateSelect = async (value: DateValue | DateValue[] | { start?: DateValue; end?: DateValue } | null | undefined) => {
	const dateValue =
		value == null ? null : Array.isArray(value) ? value[0] : 'start' in (value as object) ? (value as { start?: DateValue }).start : (value as DateValue);
	if (!dateValue || !('year' in dateValue) || !('month' in dateValue) || !('day' in dateValue)) return;
	dayPickerOpen.value = false;
	const d = new Date(dateValue.year, dateValue.month - 1, dateValue.day);
	calendarFocusDate.value = d;
	if (dateInLoadedRange(d)) return;
	await appointmentStore.setDateRange(fourMonthForwardRange(d));
};

const goPrevDay = async () => {
	calendarFocusDate.value = sub(calendarFocusDate.value, { days: 1 });
	if (dateInLoadedRange(calendarFocusDate.value)) return;
	await appointmentStore.setDateRange(fourMonthForwardRange(calendarFocusDate.value));
};

const goNextDay = async () => {
	calendarFocusDate.value = add(calendarFocusDate.value, { days: 1 });
	if (dateInLoadedRange(calendarFocusDate.value)) return;
	await appointmentStore.setDateRange(fourMonthForwardRange(calendarFocusDate.value));
};

const goPrevWeek = async () => {
	calendarFocusDate.value = sub(weekStartDate.value, { days: 7 });
	const ws = weekStartDate.value;
	const we = endOfWeek(calendarFocusDate.value, { weekStartsOn: 1 });
	if (weekFullyInLoadedRange(ws, we)) return;
	await appointmentStore.setDateRange(fourMonthForwardRange(ws));
};

const goNextWeek = async () => {
	calendarFocusDate.value = add(weekStartDate.value, { days: 7 });
	const ws = weekStartDate.value;
	const we = endOfWeek(calendarFocusDate.value, { weekStartsOn: 1 });
	if (weekFullyInLoadedRange(ws, we)) return;
	await appointmentStore.setDateRange(fourMonthForwardRange(ws));
};

const goPrevMonth = async () => {
	const prev = sub(monthDate.value, { months: 1 });
	calendarPlaceholder.value = new CalendarDate(prev.getFullYear(), prev.getMonth() + 1, 1);
	const anchor = new Date(prev.getFullYear(), prev.getMonth(), 1);
	await appointmentStore.setDateRange(fourMonthForwardRange(anchor));
};

const goNextMonth = async () => {
	const next = add(monthDate.value, { months: 1 });
	calendarPlaceholder.value = new CalendarDate(next.getFullYear(), next.getMonth() + 1, 1);
	const anchor = new Date(next.getFullYear(), next.getMonth(), 1);
	await appointmentStore.setDateRange(fourMonthForwardRange(anchor));
};

const goToTodayMonth = async () => {
	const now = new Date();
	calendarPlaceholder.value = new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1);
	if (appointmentStore.isWeeklyView) {
		calendarFocusDate.value = now;
		await appointmentStore.setDateRange(fourMonthForwardRange(startOfWeek(now, { weekStartsOn: 1 })));
		return;
	}
	if (appointmentStore.isDailyView) {
		calendarFocusDate.value = now;
		await appointmentStore.setDateRange(fourMonthForwardRange(now));
		return;
	}
	await appointmentStore.setDateRange(fourMonthForwardRange(new Date(now.getFullYear(), now.getMonth(), 1)));
};

const selectDayInCalendarFromDate = (date: Date) => {
	selectedCalendarDay.value = date;
};

const openDayListing = (date: Date) => {
	selectedCalendarDay.value = date;
	dayListingDate.value = date;
	selectedAppointment.value = null;
};

const backToDayAgenda = () => {
	selectedAppointment.value = null;
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
					if (dayListingDate.value) backToDayAgenda();
					else closePanel();
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

const clearQueryCode = () => {
	if (!route.query.code) return;
	const nextQuery = { ...route.query };
	delete nextQuery.code;
	void router.replace({ query: nextQuery });
};

const closePanel = () => {
	selectedAppointment.value = null;
	dayListingDate.value = null;
	clearQueryCode();
};

const openAppointmentFromQuery = async () => {
	const code = typeof route.query.code === 'string' ? route.query.code.trim() : '';
	if (!code) return;

	filter.value.current_page = 1;
	filter.value.status = 'All';
	uiStatus.value = 'All';

	let found = appointments.value.find((appointment) => appointment.code === code) ?? null;
	if (!found) {
		found = await appointmentStore.getAppointmentByCode(code);
		if (found) {
			const start = new Date(found.start_date_time);
			if (!Number.isNaN(start.getTime())) {
				filter.value.date_range = fourMonthForwardRange(start);
				await appointmentStore.refreshListing();
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

	dayListingDate.value = null;
	selectedAppointment.value = found;
};

let listingClock: ReturnType<typeof setInterval> | undefined;

onMounted(async () => {
	listingClock = setInterval(() => {
		listingNow.value = new Date();
	}, 30_000);
	applyDashboardDateQueryToFilter();
	// Day Ops counts need the full status mix for the loaded range
	filter.value.status = 'All';
	uiStatus.value = 'All';
	await appointmentStore.refreshListing();
	await openAppointmentFromQuery();
});

onUnmounted(() => {
	if (listingClock) clearInterval(listingClock);
});

watch(
	() => route.query.code,
	async () => {
		await openAppointmentFromQuery();
	},
);

const selectAppointment = (appointment: Appointment, opts?: { fromDayAgenda?: boolean }) => {
	if (!appointment) return;
	if (!opts?.fromDayAgenda) dayListingDate.value = null;
	selectedAppointment.value = appointment;
};

const goAdjacentAppointment = (delta: -1 | 1) => {
	const idx = panelNavIndex.value;
	if (idx < 0) return;
	const next = panelNavAppointments.value[idx + delta];
	if (!next) return;
	selectAppointment(next, { fromDayAgenda: Boolean(dayListingDate.value) });
};

const goPreviousAppointment = () => goAdjacentAppointment(-1);
const goNextAppointment = () => goAdjacentAppointment(1);

const onSelectAppointment = (_e: Event, row: TableRow<Appointment>) => {
	const appointment = row.original;
	if (appointment) selectAppointment(appointment);
};

const openEditModal = async (appointment: Appointment) => {
	if (!appointment) return;

	const syncSelectedAppointment = (updated: Appointment) => {
		if (selectedAppointment.value?.code !== updated.code) return;
		selectedAppointment.value = appointments.value.find((item) => item.code === updated.code) ?? updated;
	};

	const appointmentModal = overlay.create(ZModalAppointmentDetail, {
		props: {
			appointment: appointment,
			onUpdate: async (updated: Appointment) => {
				const saved = await appointmentStore.updateAppointment(updated);
				if (!saved) return;
				appointmentModal.close();
				syncSelectedAppointment(updated);
			},
			onStatus: (updated: Appointment) => {
				syncSelectedAppointment(updated);
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
</script>

<style scoped></style>
