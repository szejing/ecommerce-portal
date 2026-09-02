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
	is_pickup?: boolean;
	is_dropoff?: boolean;
	price?: number;
};

export type CourierBookingQuoteResponse = {
	quotes: CourierBookingQuote[];
	wallet: { balance: number; currency: string };
};

export type CourierBookingSubmitResponse = {
	fulfillment: FulfillmentBatch;
};
