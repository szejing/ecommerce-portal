import { defineStore } from 'pinia';
import { KEY, UserRoles, type ErrorResponse } from 'yeppi-common';
import { options_page_size } from '~/utils/options';
import type { CRMUser, CrmUserCreate } from '~/utils/types/crm-user';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import type { BaseODataReq } from '~/repository/base/base.req';
import type { UpdateCrmUserReq } from '~/repository/modules/crm-user/request/update-crm-user.req';
import type { ChangePasswordReq } from '~/repository/modules/crm-user/request/change-password.req';
import type { ResetPasswordReq } from '~/repository/modules/crm-user/request/reset-password.req';

type CrmUserFilter = {
	query: string;
	page_size: number;
	current_page: number;
};

const initialFilter: CrmUserFilter = {
	query: '',
	page_size: options_page_size[0] as number,
	current_page: 1,
};

const initialEmptyCrmUser: CrmUserCreate = {
	name: undefined as string | undefined,
	email_address: undefined as string | undefined,
	dial_code: '+60',
	phone_no: undefined as string | undefined,
	role: UserRoles.MERCHANT_STAFF,
	is_active: true,
	staff_department_id: null,
};

export const useCRMUserStore = defineStore('crmUserStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		new_crm_user: structuredClone(initialEmptyCrmUser),
		crm_users: [] as CRMUser[],
		total_count: 0 as number,
		errors: [] as string[],
		current_crm_user: undefined as CRMUser | undefined,
		filter: initialFilter,
		department_users: [] as CRMUser[],
		department_users_total: 0 as number,
		department_users_loading: false as boolean,
		department_users_filter: {
			page_size: options_page_size[0] as number,
			current_page: 1,
		},
	}),
	actions: {
		async updatePageSize(size: number) {
			this.filter.page_size = size;
			if (this.filter.page_size > this.crm_users.length) {
				this.filter.current_page = 1;
				return;
			}
			await this.getCrmUsers();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;
			if (this.filter.current_page < 1 || this.crm_users.length === this.total_count) {
				return;
			}
			await this.getCrmUsers();
		},

		async getCrmUsers() {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$orderby: 'created_at desc',
				};
				if (this.filter.query?.trim()) {
					queryParams.$search = this.filter.query.trim();
				}

				const resp = await $api.crmUser.getMany(queryParams);
				const data = (resp as { data?: CRMUser[] }).data ?? (resp as { value?: CRMUser[] }).value ?? [];
				const total = (resp as { '@odata.count'?: number })['@odata.count'] ?? 0;

				this.crm_users = data;
				this.total_count = total;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load staff';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async fetchUsersByStaffDepartment(staffDepartmentId: number) {
			this.department_users_loading = true;
			const { $api } = useNuxtApp();
			try {
				const queryParams: BaseODataReq = {
					$top: this.department_users_filter.page_size,
					$count: true,
					$skip: (this.department_users_filter.current_page - 1) * this.department_users_filter.page_size,
					$filter: `staff_department_id eq ${staffDepartmentId}`,
					$orderby: 'name asc',
				};

				const resp = await $api.crmUser.getMany(queryParams);
				const data = (resp as { data?: CRMUser[] }).data ?? (resp as { value?: CRMUser[] }).value ?? [];
				const total = (resp as { '@odata.count'?: number })['@odata.count'] ?? 0;

				this.department_users = data;
				this.department_users_total = total;
				return data;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load staff for department';
				failedNotification(message);
				return [];
			} finally {
				this.department_users_loading = false;
			}
		},

		async updateDepartmentUsersPage(staffDepartmentId: number, page: number) {
			this.department_users_filter.current_page = page;
			if (this.department_users_filter.current_page < 1) {
				return;
			}
			await this.fetchUsersByStaffDepartment(staffDepartmentId);
		},

		resetDepartmentUsers() {
			this.department_users = [];
			this.department_users_total = 0;
			this.department_users_filter.current_page = 1;
		},

		async getCrmUser(id: string) {
			const { $api } = useNuxtApp();
			this.loading = true;
			try {
				const resp = await $api.crmUser.getSingle(id);
				return resp.user;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load staff';
				failedNotification(message);
				return null;
			} finally {
				this.loading = false;
			}
		},

		async createCrmUser() {
			this.adding = true;
			const { $api } = useNuxtApp();

			try {
				const resp = await $api.crmUser.create({
					name: this.new_crm_user.name!,
					email_address: this.new_crm_user.email_address!,
					dial_code: this.new_crm_user.dial_code!,
					phone_no: this.new_crm_user.phone_no!,
					role: this.new_crm_user.role as UserRoles,
					is_active: this.new_crm_user.is_active,
					staff_department_id: this.new_crm_user.staff_department_id ?? null,
				});

				if (resp?.user) {
					this.resetNewCrmUser();
					successNotification(`${resp.user.name} - Staff Created !`);
					return true;
				}
				return false;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to create staff';
				failedNotification(message);
				return false;
			} finally {
				this.adding = false;
				this.loading = false;
			}
		},

		async updateStatus(crmUser: CRMUser, is_active: boolean) {
			await this.updateCrmUser(crmUser.id, { is_active });
		},

		async updateCrmUser(id: string, body: UpdateCrmUserReq) {
			const { $api } = useNuxtApp();
			this.updating = true;
			try {
				const resp = await $api.crmUser.update(id, body);
				if (resp?.user) {
					this.crm_users = this.crm_users.map((user) => {
						if (user.id === id) {
							return resp.user;
						}
						return user;
					});
					successNotification(`${resp.user.name} - Staff Updated !`);
				}
				return null;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to update staff';
				failedNotification(message);
				return null;
			} finally {
				this.updating = false;
			}
		},

		async updateCrmUserPassword(id: string, body: ChangePasswordReq): Promise<true | undefined> {
			const nuxtApp = useNuxtApp();
			const { $api } = nuxtApp;
			const t = nuxtApp.$i18n.t;
			this.updating = true;
			try {
				const resp = await $api.crmUser.updatePassword(id, body);
				if (resp?.user) {
					successNotification(`${resp.user.name} - Staff Password Updated !`);
					return true;
				}
				return undefined;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to delete staff';
				failedNotification(message);
			} finally {
				this.updating = false;
			}
		},

		async resetCrmUserPassword(id: string, body: ResetPasswordReq): Promise<true | undefined> {
			const nuxtApp = useNuxtApp();
			const { $api } = nuxtApp;
			const t = nuxtApp.$i18n.t;
			this.updating = true;
			try {
				const resp = await $api.crmUser.resetPassword(id, body);
				if (resp?.user) {
					successNotification(`${resp.user.name} - Staff Password Reset !`);
					return true;
				}
				return undefined;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to reset staff password';
				failedNotification(message);
			} finally {
				this.updating = false;
			}
		},

		async deleteCrmUser(crmUser: CRMUser) {
			const { $api } = useNuxtApp();
			this.updating = true;
			try {
				await $api.crmUser.delete(crmUser);
				successNotification(`${crmUser.name} - Staff Deleted !`);

				const index = this.crm_users.findIndex((t) => t.id === crmUser.id);
				this.crm_users.splice(index, 1);
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to delete staff';
				failedNotification(message);
			} finally {
				this.updating = false;
			}
		},

		resetNewCrmUser() {
			this.new_crm_user = structuredClone(initialEmptyCrmUser);
		},
	},
});
