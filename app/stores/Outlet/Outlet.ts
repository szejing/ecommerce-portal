import { options_page_size } from '~/utils/options';
import type { Outlet } from '~/utils/types/outlet';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import type { ErrorResponse } from 'yeppi-common';
import type { OutletCreate } from '~/utils/types/form/outlet-creation';
import type { BaseODataReq } from '~/repository/base/base.req';

type OutletFilter = {
	query: string;
	page_size: number;
	current_page: number;
};
const initialEmptyOutlet: OutletCreate = {
	code: '',
	description: '',
	dial_code: '+60',
	phone_no: '',
	address1: '',
	address2: '',
	address3: undefined,
	city: '',
	country_code: '',
	state: '',
	postal_code: '',
	longitude: undefined,
	latitude: undefined,
	tax_rule_code: undefined,
};

const initialEmptyOutletFilter: OutletFilter = {
	query: '',
	page_size: options_page_size[0] as number,
	current_page: 1,
};

export const useOutletStore = defineStore('outletStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		removing: false as boolean,
		exporting: false as boolean,
		outlets: [] as Outlet[],
		total_outlets: 0 as number,
		current_outlet: undefined as Outlet | undefined,
		new_outlet: structuredClone(initialEmptyOutlet),
		errors: [] as string[],
		filter: initialEmptyOutletFilter,
	}),
	actions: {
		resetNewOutlet() {
			this.new_outlet = structuredClone(initialEmptyOutlet);
		},

		async updatePageSize(size: number) {
			this.filter.page_size = size;

			if (this.filter.page_size > this.outlets.length) {
				this.filter.current_page = 1;
				return;
			}

			this.getOutlets();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;

			if (this.filter.current_page < 0 || this.outlets.length === this.total_outlets) {
				return;
			}

			this.getOutlets();
		},

		async getOutlets() {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$expand: 'tax_rule',
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$orderby: 'updated_at desc',
				};

				if (this.filter.query) {
					queryParams.$search = this.filter.query;
				}

				const { data, '@odata.count': total } = await $api.outlet.getMany(queryParams);

				if (data) {
					this.outlets = data;
					this.total_outlets = total ?? 0;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process outlet';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async getOutletByCode(code: string): Promise<Outlet | undefined> {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const data = await $api.outlet.getSingle(code);
				if (data.outlet) {
					this.current_outlet = data.outlet;
					return data.outlet;
				}
				this.current_outlet = undefined;
				return undefined;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process outlet';
				failedNotification(message);
				this.current_outlet = undefined;
				return undefined;
			} finally {
				this.loading = false;
			}
		},

		async createOutlet(): Promise<Outlet> {
			this.adding = true;
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.outlet.create(this.new_outlet);

				if (data.outlet) {
					successNotification(`${this.new_outlet.code} - Outlet Created !`);
					this.outlets.push(data.outlet);
				}
				this.resetNewOutlet();

				return data.outlet;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process outlet';
				failedNotification(message);
				throw new Error(message);
			} finally {
				this.adding = false;
				this.loading = false;
			}
		},

		async updateOutlet(code: string, outlet: Outlet): Promise<boolean> {
			this.updating = true;

			const { $api } = useNuxtApp();

			try {
				const lon = outlet.longitude as number | string | null | undefined;
				const lat = outlet.latitude as number | string | null | undefined;
				const data = await $api.outlet.update(code, {
					description: outlet.description,
					dial_code: outlet.dial_code,
					phone_no: outlet.phone_no,
					address1: outlet.address1,
					address2: outlet.address2 || undefined,
					address3: outlet.address3 || undefined,
					city: outlet.city,
					country_code: outlet.country_code,
					state: outlet.state,
					postal_code: outlet.postal_code,
					longitude: lon === '' || lon == null ? null : typeof lon === 'string' ? Number(lon) : lon,
					latitude: lat === '' || lat == null ? null : typeof lat === 'string' ? Number(lat) : lat,
					tax_rule: outlet.tax_rule as string | undefined,
				});

				if (data.outlet) {
					this.current_outlet = data.outlet;
					successNotification(`Outlet Updated !`);
					this.getOutlets();
					return true;
				}
				return false;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process outlet';
				failedNotification(message);
				return false;
			} finally {
				this.updating = false;
			}
		},

		async deleteOutlet(code: string) {
			this.removing = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.outlet.delete({ code });

				if (data.outlet.code) {
					successNotification(`Outlet #${data.outlet.code} Deleted !`);

					const index = this.outlets.findIndex((t) => t.code === data.outlet.code);
					this.outlets.splice(index, 1);
					if (this.current_outlet?.code === data.outlet.code) {
						this.current_outlet = undefined;
					}
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process outlet';
				failedNotification(message);
			} finally {
				this.removing = false;
			}
		},
	},
});
