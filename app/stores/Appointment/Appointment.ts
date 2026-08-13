import { options_page_size } from '~/utils/options';
import { defineStore } from 'pinia';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import { AppointmentStatus, getFormattedDate, type ErrorResponse } from 'yeppi-common';
import type { Range } from '~/utils/interface';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import type { Appointment } from '~/utils/types/appointment';

export const APPOINTMENT_FILTER_DEBOUNCE_MS = 500;

export type AppointmentFailure = { kind: 'request_failed'; message: string };
export type AppointmentRefreshOutcome =
	| { status: 'completed' }
	| { status: 'stale' }
	| { status: 'failed'; failure: AppointmentFailure };

export type AppointmentView = 'listing' | 'daily' | 'weekly' | 'monthly';

type AppointmentFilter = {
	query: string;
	status: AppointmentStatus | string;
	date_range: Range;
	page_size: number;
	current_page: number;
	view: AppointmentView;
};

const initialEmptyAppointmentFilter = (): AppointmentFilter => {
	const now = new Date();
	return {
		query: '',
		status: 'All',
		date_range: {
			start: startOfMonth(now),
			end: endOfMonth(addMonths(now, 2)),
		},
		page_size: options_page_size[0] as number,
		current_page: 1,
		view: 'listing',
	};
};

let appointmentFilterTimer: ReturnType<typeof setTimeout> | undefined;

const appointmentStatusFilter = (status: AppointmentStatus | string): string => {
	if (status === 'pending') return `status in ('${AppointmentStatus.PENDING}')`;
	if (status === 'confirmed') return `status eq '${AppointmentStatus.CONFIRMED}'`;
	if (status === 'completed') return `status eq '${AppointmentStatus.COMPLETED}'`;
	if (status === 'cancelled') return `status in ('${AppointmentStatus.CANCELLED}', '${AppointmentStatus.VOIDED}')`;
	return '';
};

export const useAppointmentStore = defineStore('appointmentStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		exporting: false as boolean,
		appointments: [] as Appointment[],
		errors: [] as string[],
		filter: initialEmptyAppointmentFilter(),
		listFailure: undefined as AppointmentFailure | undefined,
		listingGeneration: 0 as number,
	}),
	getters: {
		isListingView: (state) => state.filter.view === 'listing',
		isDailyView: (state) => state.filter.view === 'daily',
		isWeeklyView: (state) => state.filter.view === 'weekly',
		isMonthlyView: (state) => state.filter.view === 'monthly',
		filters: (state) => ({
			query: state.filter.query,
			status: state.filter.status,
			date_range: { ...state.filter.date_range },
			page_size: state.filter.page_size,
			current_page: state.filter.current_page,
		}),
	},
	actions: {
		setSearch(search: string) {
			this.filter.query = search;
			this.filter.current_page = 1;
			if (appointmentFilterTimer) clearTimeout(appointmentFilterTimer);
			appointmentFilterTimer = setTimeout(() => {
				appointmentFilterTimer = undefined;
				void this.refreshListing();
			}, APPOINTMENT_FILTER_DEBOUNCE_MS);
		},

		async setStatus(status: AppointmentStatus | string): Promise<AppointmentRefreshOutcome> {
			this.filter.status = status;
			this.filter.current_page = 1;
			return this.refreshListing();
		},

		async setDateRange(range: Range): Promise<AppointmentRefreshOutcome> {
			this.filter.date_range = { start: range.start, end: range.end };
			this.filter.current_page = 1;
			return this.refreshListing();
		},

		async setPage(page: number): Promise<AppointmentRefreshOutcome> {
			this.filter.current_page = page;
			return this.refreshListing();
		},

		async setPageSize(size: number): Promise<AppointmentRefreshOutcome> {
			this.filter.page_size = size;
			this.filter.current_page = 1;
			return this.refreshListing();
		},

		async clearFilters(): Promise<AppointmentRefreshOutcome> {
			if (appointmentFilterTimer) clearTimeout(appointmentFilterTimer);
			appointmentFilterTimer = undefined;
			const view = this.filter.view;
			this.filter = initialEmptyAppointmentFilter();
			this.filter.view = view;
			return this.refreshListing();
		},

		async getAppointments(): Promise<AppointmentRefreshOutcome> {
			return this.refreshListing();
		},

		async refreshListing(): Promise<AppointmentRefreshOutcome> {
			const generation = ++this.listingGeneration;
			this.loading = true;
			this.listFailure = undefined;
			const { $api } = useNuxtApp();
			try {
				let filter = appointmentStatusFilter(this.filter.status);
				let { start, end } = this.filter.date_range;
				start = start ?? new Date();
				end = end ?? new Date();
				const dateFilter = end
					? `(start_date_time between '${getFormattedDate(start, 'yyyy-MM-dd')}' and '${getFormattedDate(end, 'yyyy-MM-dd')}')`
					: `start_date_time le '${getFormattedDate(start, 'yyyy-MM-dd')}'`;
				filter = filter ? `${filter} and ${dateFilter}` : dateFilter;
				const queryParams: Record<string, unknown> = {
					$top: this.filter.page_size,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$count: true,
					$filter: filter,
					$orderby: 'start_date_time desc',
				};
				const search = this.filter.query.trim();
				if (search) queryParams.$search = search;
				const { data } = await $api.appointment.getMany(queryParams);
				if (generation !== this.listingGeneration) return { status: 'stale' };
				if (data) this.appointments = data;
				return { status: 'completed' };
			} catch (err: unknown | ErrorResponse) {
				if (generation !== this.listingGeneration) return { status: 'stale' };
				const failure = { kind: 'request_failed' as const, message: (err as ErrorResponse).message ?? 'Failed to process appointment' };
				this.listFailure = failure;
				return { status: 'failed', failure };
			} finally {
				if (generation === this.listingGeneration) this.loading = false;
			}
		},

		async getAppointmentByCode(code: string): Promise<Appointment | null> {
			const { $api } = useNuxtApp();
			try {
				const resp = await $api.appointment.getSingle(code);
				return resp?.appointment ?? resp ?? null;
			} catch {
				return null;
			}
		},

		async updateAppointment(appointment: Appointment) {
			this.updating = true;
			const { $api } = useNuxtApp();
			try {
				const updated = await $api.appointment.update(appointment.code, {
					order_no: appointment.order_no ?? '',
					start_date_time: appointment.start_date_time,
					end_date_time: appointment.end_date_time ?? appointment.start_date_time,
					ref_no: appointment.ref_no,
					status: appointment.status,
				});

				if (updated.appointment) {
					this.appointments = this.appointments.map((a) => (a.code === appointment.code ? updated.appointment : a));
				}
				successNotification('Appointment updated successfully');
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process appointment';
				failedNotification(message);
			} finally {
				this.updating = false;
			}
		},

		async deleteAppointment(code: string) {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				await $api.appointment.delete(code);
				successNotification('Appointment deleted successfully');
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process appointment';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async getAppointmentsByCustomer(customer_no: string): Promise<Appointment[]> {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				let filter = appointmentStatusFilter(this.filter.status);
				let { start, end } = this.filter.date_range;

				start = start ?? new Date();
				end = end ?? new Date();

				// Add date filter
				const dateFilter = end
					? `(start_date_time between '${getFormattedDate(start, 'yyyy-MM-dd')}' and '${getFormattedDate(end, 'yyyy-MM-dd')}')`
					: `start_date_time le '${getFormattedDate(start, 'yyyy-MM-dd')}'`;

				filter = filter ? `${filter} and ${dateFilter}` : dateFilter;

				const queryParams = {
					$top: this.filter.page_size,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$count: true,
					$filter: filter,
					$orderby: 'start_date_time desc',
				} as const;

				const { data } = await $api.appointment.getByCustomer(customer_no, queryParams);

				return data;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process appointment';
				failedNotification(message);
				return [];
			} finally {
				this.loading = false;
			}
		},
	},
});
