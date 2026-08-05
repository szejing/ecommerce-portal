import { defineStore } from 'pinia';
import type { BaseODataReq } from '~/repository/base/base.req';
import type { ErrorResponse } from 'yeppi-common';
import type { StaffDepartment, StaffDepartmentPayload } from '~/utils/types/staff-department';
import { options_page_size } from '~/utils/options';
import { failedNotification, successNotification } from '../AppUi/AppUi';

type StaffDepartmentFilter = {
	query: string;
	page_size: number;
	current_page: number;
};

type StaffDepartmentFormFields = StaffDepartmentPayload & {
	is_active: boolean;
};

const initialFilter: StaffDepartmentFilter = {
	query: '',
	page_size: options_page_size[0] as number,
	current_page: 1,
};

const initialEmptyNewStaffDepartment: StaffDepartmentFormFields = {
	name: '',
	default_commission_rate: 0,
	is_active: true,
};

export const useStaffDepartmentStore = defineStore('staffDepartmentStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		removing: false as boolean,
		departments: [] as StaffDepartment[],
		total_count: 0 as number,
		current_department: undefined as StaffDepartment | undefined,
		new_department: structuredClone(initialEmptyNewStaffDepartment),
		filter: { ...initialFilter },
	}),
	getters: {
		getDisplayDepartments: (state) => state.departments,
		activeDepartments: (state) => state.departments.filter((department) => department.is_active),
		options: (state) =>
			state.departments
				.filter((department) => department.is_active)
				.map((department) => ({
					label: `${department.name} (${Number(department.default_commission_rate ?? 0)}%)`,
					value: department.id,
				})),
	},
	actions: {
		resetNewStaffDepartment() {
			this.new_department = structuredClone(initialEmptyNewStaffDepartment);
		},

		async updatePageSize(size: number) {
			this.filter.page_size = size;
			this.filter.current_page = 1;
			await this.getStaffDepartments();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;
			if (this.filter.current_page < 1) {
				return;
			}
			await this.getStaffDepartments();
		},

		async getStaffDepartments(query?: BaseODataReq) {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const queryParams: BaseODataReq =
					query ??
					({
						$top: this.filter.page_size,
						$count: true,
						$skip: (this.filter.current_page - 1) * this.filter.page_size,
						$orderby: 'name asc',
					} as BaseODataReq);

				if (!query) {
					const q = this.filter.query.trim();
					if (q) {
						queryParams.$search = q;
					}
				}

				const resp = await $api.staffDepartment.getMany(queryParams);
				this.departments = resp.data ?? resp.value ?? [];
				this.total_count = resp['@odata.count'] ?? this.departments.length;
				return this.departments;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load staff departments';
				failedNotification(message);
				return [];
			} finally {
				this.loading = false;
			}
		},

		async getStaffDepartment(id: number): Promise<StaffDepartment | undefined> {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const resp = await $api.staffDepartment.getSingle(id);
				if (resp?.department) {
					this.current_department = resp.department;
					return resp.department;
				}
				return undefined;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load staff department';
				failedNotification(message);
				return undefined;
			} finally {
				this.loading = false;
			}
		},

		async createDepartment(body: StaffDepartmentPayload): Promise<boolean> {
			this.adding = true;
			const { $api } = useNuxtApp();
			try {
				const resp = await $api.staffDepartment.create(body);
				if (resp?.department) {
					successNotification(`${resp.department.name} - Staff department created`);
					this.resetNewStaffDepartment();
					await this.getStaffDepartments();
					return true;
				}
				return false;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to create staff department';
				failedNotification(message);
				return false;
			} finally {
				this.adding = false;
			}
		},

		async updateDepartment(id: number, body: Partial<StaffDepartmentPayload>): Promise<StaffDepartment | undefined> {
			this.updating = true;
			const { $api } = useNuxtApp();
			try {
				const resp = await $api.staffDepartment.update(id, body);
				if (resp?.department) {
					successNotification(`${resp.department.name} - Staff department updated`);
					if (this.current_department?.id === id) {
						this.current_department = resp.department;
					}
					const index = this.departments.findIndex((department) => department.id === id);
					if (index !== -1) {
						this.departments[index] = resp.department;
					}
					return resp.department;
				}
				return undefined;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to update staff department';
				failedNotification(message);
				return undefined;
			} finally {
				this.updating = false;
			}
		},

		async updateStatus(department: StaffDepartment, is_active: boolean): Promise<void> {
			await this.updateDepartment(department.id, { is_active });
		},

		async deleteDepartment(id: number): Promise<boolean> {
			this.removing = true;
			const { $api } = useNuxtApp();
			try {
				await $api.staffDepartment.delete(id);
				successNotification('Staff department deleted');
				this.departments = this.departments.filter((department) => department.id !== id);
				if (this.current_department?.id === id) {
					this.current_department = undefined;
				}
				return true;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to delete staff department';
				failedNotification(message);
				return false;
			} finally {
				this.removing = false;
			}
		},
	},
});
