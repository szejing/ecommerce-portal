import type { ShipmentStatusValue } from '~/utils/types/order-fulfillment-shipping';

type TranslateFn = (key: string) => string;

export const options_shipment_status: ShipmentStatusValue[] = [
	'pending',
	'shipped',
	'in_transit',
	'delivered',
	'failed',
];

const SHIPMENT_STATUS_PROGRESS: ShipmentStatusValue[] = [
	'pending',
	'shipped',
	'in_transit',
	'delivered',
];

export function getShipmentStatusOptions(t: TranslateFn) {
	return [
		{ value: 'pending', label: t('options.pending') },
		{ value: 'shipped', label: t('options.shipped') },
		{ value: 'in_transit', label: t('options.inTransit') },
		{ value: 'delivered', label: t('options.delivered') },
		{ value: 'failed', label: t('options.failed') },
	];
}

export function getNextShipmentStatus(current: ShipmentStatusValue | string | undefined): ShipmentStatusValue | undefined {
	const index = SHIPMENT_STATUS_PROGRESS.indexOf(current as ShipmentStatusValue);
	if (index < 0 || index >= SHIPMENT_STATUS_PROGRESS.length - 1) {
		return undefined;
	}
	return SHIPMENT_STATUS_PROGRESS[index + 1];
}

export function canCompleteShipmentStatus(current: ShipmentStatusValue | string | undefined): boolean {
	if (!current) {
		return false;
	}
	return current !== 'delivered' && current !== 'failed';
}

export const getShipmentStatusColor = (
	status: string,
): 'primary' | 'error' | 'success' | 'warning' | 'secondary' | 'info' | 'neutral' | undefined => {
	const color: Record<string, 'primary' | 'error' | 'success' | 'warning' | 'secondary' | 'info' | 'neutral' | undefined> = {
		pending: 'warning',
		shipped: 'primary',
		in_transit: 'info',
		delivered: 'success',
		failed: 'error',
	};

	return color[status];
};
