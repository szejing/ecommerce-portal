import { getShipmentStatusColor as getCommonShipmentStatusColor, ShipmentStatus, type BadgeColor } from 'yeppi-common';
import type { ShipmentStatusValue } from '~/utils/types/order-fulfillment-shipping';

type TranslateFn = (key: string) => string;

export const options_shipment_status: ShipmentStatusValue[] = [
	ShipmentStatus.PENDING,
	ShipmentStatus.SHIPPED,
	ShipmentStatus.IN_TRANSIT,
	ShipmentStatus.DELIVERED,
	ShipmentStatus.FAILED,
];

const SHIPMENT_STATUS_PROGRESS: ShipmentStatusValue[] = [ShipmentStatus.PENDING, ShipmentStatus.SHIPPED, ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED];

export function getShipmentStatusOptions(t: TranslateFn) {
	return [
		{ value: ShipmentStatus.PENDING, label: t('options.pending') },
		{ value: ShipmentStatus.SHIPPED, label: t('options.shipped') },
		{ value: ShipmentStatus.IN_TRANSIT, label: t('options.inTransit') },
		{ value: ShipmentStatus.DELIVERED, label: t('options.delivered') },
		{ value: ShipmentStatus.FAILED, label: t('options.failed') },
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
	return current === ShipmentStatus.SHIPPED || current === ShipmentStatus.IN_TRANSIT;
}

export const getShipmentStatusColor = (status: string): BadgeColor | undefined => {
	return getCommonShipmentStatusColor(status);
};
