import { describe, expect, it } from 'vitest';
import { listingRange } from '../../app/utils/listing-range';

describe('listingRange', () => {
	it('returns the first page window', () => {
		expect(listingRange(1, 15, 124)).toEqual({ from: 1, to: 15 });
	});

	it('caps the last page at the total', () => {
		expect(listingRange(9, 15, 124)).toEqual({ from: 121, to: 124 });
	});

	it('returns an empty window when there are no rows', () => {
		expect(listingRange(1, 15, 0)).toEqual({ from: 0, to: 0 });
		expect(listingRange(1, 0, 10)).toEqual({ from: 0, to: 0 });
		expect(listingRange(4, 15, 30)).toEqual({ from: 0, to: 0 });
	});
});
