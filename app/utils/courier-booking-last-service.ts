export const COURIER_BOOKING_LAST_SERVICE_STORAGE_KEY = 'wemotoo-courier-booking-last-service-id';

export function pickCourierServiceId(
	quotes: Array<{ service_id: string }>,
	lastServiceId?: string | null,
): string | undefined {
	const remembered = lastServiceId?.trim();
	if (remembered && quotes.some((quote) => quote.service_id === remembered)) {
		return remembered;
	}

	return quotes[0]?.service_id;
}
