export function listingRange(page: number, pageSize: number, total: number): { from: number; to: number } {
	if (total <= 0 || pageSize <= 0) return { from: 0, to: 0 };

	const safePage = page > 0 ? page : 1;
	const from = (safePage - 1) * pageSize + 1;
	if (from > total) return { from: 0, to: 0 };

	return { from, to: Math.min(safePage * pageSize, total) };
}
