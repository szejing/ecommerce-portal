import {
	FulfillmentLifecycleStatus,
	getFulfillmentLifecycleStatusColor,
	type UiBadgeColor,
} from 'yeppi-common';
import type { FulfillmentLifecycleStatusValue } from '~/utils/types/order-fulfillment-shipping';

type TranslateFn = (key: string) => string;

export const options_fulfillment_status: FulfillmentLifecycleStatusValue[] = [
	FulfillmentLifecycleStatus.PENDING,
	FulfillmentLifecycleStatus.PROCESSING,
	FulfillmentLifecycleStatus.PACKED,
	FulfillmentLifecycleStatus.FULFILLED,
];

export function getFulfillmentStatusOptions(t: TranslateFn) {
	return [
		{ value: FulfillmentLifecycleStatus.PENDING, label: t('options.pending') },
		{ value: FulfillmentLifecycleStatus.PROCESSING, label: t('options.processing') },
		{ value: FulfillmentLifecycleStatus.PACKED, label: t('options.packed') },
		{ value: FulfillmentLifecycleStatus.FULFILLED, label: t('options.fulfilled') },
	];
}

/** Lifecycle packing status colors (portal uses lifecycle values under this name). */
export const getFulfillmentStatusColor = (status: string): UiBadgeColor | undefined => {
	return getFulfillmentLifecycleStatusColor(status);
};
