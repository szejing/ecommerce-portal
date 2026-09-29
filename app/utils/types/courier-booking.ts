import type { CourierHandover } from 'yeppi-common';
import type { FulfillmentBatch } from '~/utils/types/order-fulfillment-shipping';

export type CourierBookingTarget = {
	fulfillmentId: string;
	orderNo: string;
	batchNo: number;
};

export type CourierBookingParcel = {
	weight_kg: number;
	width_cm: number;
	height_cm: number;
	length_cm: number;
};

export type CourierBookingSender = {
	name: string;
	phone: string;
	address1: string;
	postcode: string;
	city: string;
	state: string;
	country: string;
};

export type CourierBookingContext = {
	connected: boolean;
	handover: CourierHandover;
	dropoff_point_id: string | null;
	collection_date: string;
	sender: CourierBookingSender;
};

export type CourierBookingQuote = {
	service_id: string;
	service_name?: string;
	courier_id?: string;
	is_pickup?: boolean;
	is_dropoff?: boolean;
	price?: number;
};

export type CourierBookingDropoffPoint = {
	point_id: string;
	name: string;
	address_1?: string;
	address_2?: string;
	address_3?: string;
	address_4?: string;
	postcode?: string;
	city?: string;
	state?: string;
	phone_number?: string;
	start_time?: string;
	end_time?: string;
};

export type CourierBookingQuoteResponse = {
	quotes: CourierBookingQuote[];
	wallet: { balance: number; currency: string };
};

export type CourierBookingDropoffPointsResponse = {
	points: CourierBookingDropoffPoint[];
};

export type CourierBookingSubmitResponse = {
	fulfillment: FulfillmentBatch;
};

export function formatCourierDropoffPointLabel(point: CourierBookingDropoffPoint): string {
	const address = [point.address_1, point.address_2, point.postcode, point.city]
		.map((part) => (part ?? '').trim())
		.filter(Boolean)
		.join(', ');
	const hours =
		point.start_time && point.end_time
			? `${point.start_time.slice(0, 5)}–${point.end_time.slice(0, 5)}`
			: '';
	return [point.name, address, hours].filter(Boolean).join(' · ');
}

export function hasCompleteCourierBookingSenderAddress(
	sender?: Pick<CourierBookingSender, 'postcode' | 'city' | 'state' | 'country'> | null,
): boolean {
	if (!sender) return false;
	return [sender.postcode, sender.city, sender.state, sender.country].every((value) => Boolean((value ?? '').trim()));
}
