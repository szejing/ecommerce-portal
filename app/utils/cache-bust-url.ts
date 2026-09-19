/**
 * Append or refresh a `v` query param so browsers/CDNs refetch after an overwrite
 * at a stable object key (e.g. merchant thumbnail.webp).
 */
export function cacheBustUrl(url: string, version: number = Date.now()): string {
	const trimmed = url.trim();
	if (!trimmed) return trimmed;

	try {
		const parsed = new URL(trimmed);
		parsed.searchParams.set('v', String(version));
		return parsed.toString();
	} catch {
		const withoutV = trimmed.replace(/([?&])v=\d+(&|$)/, (_, sep, end) => (end === '&' ? sep : '')).replace(/[?&]$/, '');
		const join = withoutV.includes('?') ? '&' : '?';
		return `${withoutV}${join}v=${version}`;
	}
}
