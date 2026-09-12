import type { FulfillmentActionReq } from './fulfillment-action.req';

export type UpdateFulfillmentStatusReq = FulfillmentActionReq & {
	status: 'processing' | 'packed' | 'fulfilled' | 'shipped' | 'in_transit' | 'delivered';
};
