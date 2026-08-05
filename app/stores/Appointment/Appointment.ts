import { options_page_size } from '~/utils/options';
import { defineStore } from 'pinia';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import { AppointmentStatus, getFormattedDate, type ErrorResponse } from 'yeppi-common';
import type { Range } from '~/utils/interface';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import type { Appointment } from '~/utils/types/appointment';

export type AppointmentView = 'listing' | 'daily' | 'weekly' | 'monthly';

type AppointmentFilter = {
	query: string;
	status: AppointmentStatus | string;
	date_range: Range;
	page_size: number;
	current_page: number;
	view: AppointmentView;
};

const initialEmptyAppointmentFilter: AppointmentFilter = (() => {
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
})();

export const useAppointmentStore = defineStore('appointmentStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		exporting: false as boolean,
		appointments: [] as Appointment[],
		errors: [] as string[],
		filter: initialEmptyAppointmentFilter,
	}),
	getters: {
		isListingView: (state) => state.filter.view === 'listing',
		isDailyView: (state) => state.filter.view === 'daily',
		isWeeklyView: (state) => state.filter.view === 'weekly',
		isMonthlyView: (state) => state.filter.view === 'monthly',
	},
	actions: {
		async getAppointments() {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				let filter = '';

				// For 'All' status, don't add any status filter - let all statuses through
				if (this.filter.status === 'pending') {
					filter = `status in ('${AppointmentStatus.PENDING}')`;
				} else if (this.filter.status === 'confirmed') {
					filter = `status eq '${AppointmentStatus.CONFIRMED}'`;
				} else if (this.filter.status === 'completed') {
					filter = `status eq '${AppointmentStatus.COMPLETED}'`;
				} else if (this.filter.status === 'cancelled') {
					filter = `status in ('${AppointmentStatus.CANCELLED}', '${AppointmentStatus.VOIDED}')`;
				}

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

				// Use backend $search support for text search
				if (this.filter.query) {
					(queryParams as any).$search = this.filter.query;
				}

				const { data, '@odata.count': _total } = await $api.appointment.getMany(queryParams);

				if (data) {
					this.appointments = data;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process appointment';
				failedNotification(message);
			} finally {
				this.loading = false;
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
				let filter = '';
				if (this.filter.status === 'pending') {
					filter = `status in ('${AppointmentStatus.PENDING}')`;
				} else if (this.filter.status === 'confirmed') {
					filter = `status eq '${AppointmentStatus.CONFIRMED}'`;
				} else if (this.filter.status === 'completed') {
					filter = `status eq '${AppointmentStatus.COMPLETED}'`;
				} else if (this.filter.status === 'cancelled') {
					filter = `status in ('${AppointmentStatus.CANCELLED}', '${AppointmentStatus.VOIDED}')`;
				}

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
