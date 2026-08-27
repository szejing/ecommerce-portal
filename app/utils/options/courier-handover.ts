import { CourierHandover } from 'yeppi-common';

export const courierHandoverItems = [
	{ value: CourierHandover.PICKUP, label: 'Pickup' },
	{ value: CourierHandover.DROP_OFF, label: 'Drop-off' },
] as const;

export const courierHandoverDataSource = 'CourierHandover';

export const getCourierHandoverItems = (dataSource: string) => {
	if (dataSource === courierHandoverDataSource) {
		return courierHandoverItems;
	}

	return [];
};
