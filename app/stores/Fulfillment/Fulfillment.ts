import { defineStore } from 'pinia';
import { KEY, type ErrorResponse } from 'yeppi-common';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import type { UpdateFulfillmentReq } from '~/repository/modules/fulfillment/models/request/update-fulfillment.req';
import type { FulfillmentBatch } from '~/utils/types/order-fulfillment-shipping';

export type FulfillmentAction = 'processing' | 'packed' | 'fulfilled' | 'shipped' | 'in_transit' | 'delivered';

const FULFILLMENT_STATUS_I18N: Record<FulfillmentAction, string> = {
	processing: 'options.processing',
	packed: 'options.packed',
	fulfilled: 'options.fulfilled',
	shipped: 'options.shipped',
	in_transit: 'options.inTransit',
	delivered: 'options.delivered',
};

export const useFulfillmentStore = defineStore('fulfillmentStore', {
	state: () => ({
		loading: false as boolean,
		creating: false as boolean,
		updating: false as boolean,
		lastFulfillment: undefined as FulfillmentBatch | undefined,
	}),
	actions: {
		async createFulfillment(order_no: string): Promise<FulfillmentBatch | undefined> {
			const { $api } = useNuxtApp();
			const merchant_id = useCookie(KEY.X_MERCHANT_ID).value;
			this.creating = true;

			try {
				const response = await $api.fulfillment.create(order_no, {
					merchant_id: String(merchant_id ?? ''),
				});
				this.lastFulfillment = response.fulfillment;
				successNotification('components.fulfillment.notifications.created');
				return response.fulfillment;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'components.fulfillment.notifications.createFailed';
				failedNotification(message);
				throw err;
			} finally {
				this.creating = false;
			}
		},

		async updateArrangement(id: string, payload: Omit<UpdateFulfillmentReq, 'merchant_id'>): Promise<FulfillmentBatch | undefined> {
			const { $api } = useNuxtApp();
			const merchant_id = useCookie(KEY.X_MERCHANT_ID).value;
			this.updating = true;

			try {
				const response = await $api.fulfillment.update(id, {
					merchant_id: String(merchant_id ?? ''),
					...payload,
				});
				this.lastFulfillment = response.fulfillment;
				successNotification('components.fulfillment.notifications.arrangementUpdated');
				return response.fulfillment;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'components.fulfillment.notifications.arrangementUpdateFailed';
				failedNotification(message);
				throw err;
			} finally {
				this.updating = false;
			}
		},

		async markProcessing(id: string): Promise<FulfillmentBatch | undefined> {
			return this.runAction(id, 'processing');
		},

		async markPacked(id: string): Promise<FulfillmentBatch | undefined> {
			return this.runAction(id, 'packed');
		},

		async markFulfilled(id: string): Promise<FulfillmentBatch | undefined> {
			return this.runAction(id, 'fulfilled');
		},

		async markShipped(id: string): Promise<FulfillmentBatch | undefined> {
			return this.runAction(id, 'shipped');
		},

		async markInTransit(id: string): Promise<FulfillmentBatch | undefined> {
			return this.runAction(id, 'in_transit');
		},

		async markDelivered(id: string): Promise<FulfillmentBatch | undefined> {
			return this.runAction(id, 'delivered');
		},

		async runAction(id: string, next: FulfillmentAction): Promise<FulfillmentBatch | undefined> {
			const { $api } = useNuxtApp();
			const merchant_id = useCookie(KEY.X_MERCHANT_ID).value;
			this.updating = true;

			try {
				const response = await $api.fulfillment.updateStatus(id, {
					merchant_id: String(merchant_id ?? ''),
					status: next,
				});

				this.lastFulfillment = response.fulfillment;
				successNotification('components.fulfillment.notifications.markedAs', {
					status: FULFILLMENT_STATUS_I18N[next],
				});
				return response.fulfillment;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'components.fulfillment.notifications.updateFailed';
				failedNotification(message);
				throw err;
			} finally {
				this.updating = false;
			}
		},
	},
});
