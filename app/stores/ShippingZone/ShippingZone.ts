import { defineStore } from 'pinia';
import { defaultShippingZoneRelations, KEY, removeDuplicateExpands, type ErrorResponse } from 'yeppi-common';
import { options_page_size } from '../../utils/options';
import { successNotification, failedNotification } from '../AppUi/AppUi';
import type { BaseODataReq } from '~/repository/base/base.req';
import type { ShippingZone } from '~/utils/types/shipping-zone';
import type { ShippingZoneCreateStorePayload } from '~/repository/modules/shipping-zone/models/request/create-shipping-zone.req';
import type { UpdateShippingZoneReq, ShippingZoneUpdateStorePayload } from '~/repository/modules/shipping-zone/models/request/update-shipping-zone.req';
import type { ShippingZoneFormFields } from '~/utils/types/form/shipping-zone-form';

type ShippingZoneFilter = {
	query: string;
	status: 'active' | 'inactive' | undefined;
	current_page: number;
	page_size: number;
};

const initialEmptyFilter: ShippingZoneFilter = {
	query: '',
	status: undefined,
	current_page: 1,
	page_size: options_page_size[0] as number,
};

const initialEmptyNewShippingZone: ShippingZoneFormFields = {
	code: '',
	description: '',
	rule: 0,
	is_active: true,
	country_code: 'MY',
	state: [],
	postcodes_text: '',
	shipping_method_ids: [],
	method_pricing: {},
};

export const useShippingZoneStore = defineStore('shippingZoneStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		removing: false as boolean,
		exporting: false as boolean,
		zones: [] as ShippingZone[],
		total_shipping_zones: 0 as number,
		current_shipping_zone: undefined as ShippingZone | undefined,
		new_shipping_zone: structuredClone(initialEmptyNewShippingZone),
		filter: initialEmptyFilter,
		errors: [] as string[],
	}),
	getters: {
		getDisplayZones: (state) => state.zones,
		allZones: (state) => state.zones,
	},
	actions: {
		resetNewShippingZone() {
			this.new_shipping_zone = structuredClone(initialEmptyNewShippingZone);
		},

		async updatePageSize(size: number) {
			this.filter.page_size = size;
			this.filter.current_page = 1;
			await this.getShippingZones();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;
			if (this.filter.current_page < 1) {
				return;
			}
			await this.getShippingZones();
		},

		async getShippingZones(append = false) {
			this.loading = true;
			try {
				const { $api } = useNuxtApp();
				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$expand: removeDuplicateExpands(defaultShippingZoneRelations).join(','),
					$orderby: 'updated_at desc',
				};

				const q = this.filter.query.trim();
				if (q) {
					queryParams.$search = q;
				}

				if (this.filter.status === 'active') {
					queryParams.$filter = 'is_active eq true';
				} else if (this.filter.status === 'inactive') {
					queryParams.$filter = 'is_active eq false';
				}

				const response = await $api.shippingZone.getMany(queryParams);
				const data = response.data ?? response.value ?? [];
				const total = response['@odata.count'] ?? response.count ?? 0;

				if (data) {
					this.zones = append ? [...this.zones, ...data] : data;
					this.total_shipping_zones = total ?? 0;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? (err instanceof Error ? err.message : 'Failed to load shipping zones');
				failedNotification(message);
				throw err;
			} finally {
				this.loading = false;
			}
		},

		async getShippingZone(code: string): Promise<ShippingZone | undefined> {
			const { $api } = useNuxtApp();
			this.loading = true;

			try {
				const response = await $api.shippingZone.getSingle(code);

				this.current_shipping_zone = response.shipping_zone;
				return response.shipping_zone;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load shipping method';
				failedNotification(message);
				throw err;
			} finally {
				this.loading = false;
			}
		},

		async createShippingZone(payload: ShippingZoneCreateStorePayload): Promise<ShippingZone | undefined> {
			const { $api } = useNuxtApp();
			const merchant_id = String(useCookie(KEY.X_MERCHANT_ID).value ?? '');
			this.adding = true;
			try {
				const { shipping_method_ids: _ids, ...body } = payload;
				const resp = await $api.shippingZone.create({
					merchant_id,
					...body,
				});
				// const row = enrichShippingZone(resp.shipping_zone);
				// this.zones = [row, ...this.zones.filter((z) => z.id !== row.id)];
				successNotification('Shipping zone created');
				await this.getShippingZones();
				this.resetNewShippingZone();
				return resp.shipping_zone;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to create shipping zone';
				failedNotification(message);
				throw err;
			} finally {
				this.adding = false;
			}
		},

		async updateShippingZone(zoneCode: string, payload: ShippingZoneUpdateStorePayload): Promise<ShippingZone | undefined> {
			const { $api } = useNuxtApp();
			const merchant_id = String(useCookie(KEY.X_MERCHANT_ID).value ?? '');
			this.updating = true;
			try {
				const body = { ...payload } as Record<string, unknown>;
				delete body.pricing_summary;
				delete body.shipping_method_ids;
				const req = { merchant_id, ...body } as UpdateShippingZoneReq;

				const resp = await $api.shippingZone.update(zoneCode, req);
				// const row = enrichShippingZone(resp.shipping_zone);
				// const idx = this.zones.findIndex((z) => z.id === id);
				// if (idx === -1) {
				// 	this.zones = [row, ...this.zones];
				// } else {
				// 	this.zones = [...this.zones.slice(0, idx), row, ...this.zones.slice(idx + 1)];
				// }
				successNotification('Shipping zone updated');
				await this.getShippingZones();
				return resp.shipping_zone;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to update shipping zone';
				failedNotification(message);
				throw err;
			} finally {
				this.updating = false;
			}
		},

		async updateZoneStatus(zone: ShippingZone, is_active: boolean) {
			await this.updateShippingZone(zone.code, { is_active });
		},

		async deleteShippingZone(zoneCode: string): Promise<void> {
			const { $api } = useNuxtApp();
			this.removing = true;
			try {
				await $api.shippingZone.remove(zoneCode);
				this.zones = this.zones.filter((z) => z.code !== zoneCode);
				successNotification('Shipping zone deleted');
				await this.getShippingZones();
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to delete shipping zone';
				failedNotification(message);
				throw err;
			} finally {
				this.removing = false;
			}
		},

		async exportShippingZones() {
			this.exporting = true;
			try {
				// Export not wired for shipping zones yet
			} finally {
				this.exporting = false;
			}
		},
	},
});
