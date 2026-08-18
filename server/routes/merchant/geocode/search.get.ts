/**
 * Proxies forward geocoding to OpenStreetMap Nominatim (no API key).
 * See https://operations.osmfoundation.org/policies/nominatim/ — server-side only, identifiable User-Agent, light use.
 */
import { KEY } from 'yeppi-common';

import { parseNominatimSearchFirstHit } from '#root/app/utils/address-geocode';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
/** Policy: identify the application; update contact if you publish a public URL. */
const NOMINATIM_USER_AGENT = 'Ecommerce-Portal/1.0';

export default defineEventHandler(async (event) => {
	const token = getCookie(event, KEY.ACCESS_TOKEN);
	if (!token) {
		throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
	}

	const q = getQuery(event).q;
	const query = typeof q === 'string' ? q.trim() : '';
	if (query.length < 5) {
		throw createError({
			statusCode: 400,
			statusMessage: 'Query too short',
		});
	}

	try {
		const data = await $fetch<unknown>(NOMINATIM_BASE, {
			query: {
				q: query,
				format: 'json',
				limit: 1,
				addressdetails: 0,
			},
			headers: {
				'User-Agent': NOMINATIM_USER_AGENT,
				Accept: 'application/json',
			},
			timeout: 15_000,
		});

		const coords = parseNominatimSearchFirstHit(data);
		if (!coords) {
			throw createError({ statusCode: 404, statusMessage: 'No results' });
		}

		return coords;
	} catch (err: unknown) {
		const code =
			err && typeof err === 'object' && 'statusCode' in err && typeof (err as { statusCode: unknown }).statusCode === 'number'
				? (err as { statusCode: number }).statusCode
				: undefined;
		if (code != null && code < 500) {
			throw err;
		}
		throw createError({
			statusCode: 502,
			statusMessage: 'Geocoding service unavailable',
		});
	}
});
