export type DocumentTemplateFieldSource = 'override' | 'store-profile' | 'default';
export type DocumentTemplateRevisionActivationStatus = 'active' | 'scheduled' | 'expired' | 'published-fallback';

export function resolveFieldValue(
	overrideValue: string | undefined,
	storeProfileValue: string | undefined,
	defaultValue: string,
): { value: string; source: DocumentTemplateFieldSource } {
	if (overrideValue !== undefined) return { value: overrideValue, source: 'override' };
	if (storeProfileValue !== undefined) return { value: storeProfileValue, source: 'store-profile' };
	return { value: defaultValue, source: 'default' };
}

export function getRevisionActivationStatus(
	start: string | null,
	end: string | null,
	now: Date,
	isSelectedActive: boolean,
): DocumentTemplateRevisionActivationStatus {
	const currentTime = now.getTime();
	const startTime = start ? new Date(start).getTime() : undefined;
	const endTime = end ? new Date(end).getTime() : undefined;

	if (endTime !== undefined && !Number.isNaN(endTime) && currentTime >= endTime) return 'expired';
	if (startTime !== undefined && !Number.isNaN(startTime) && currentTime < startTime) return 'scheduled';
	return isSelectedActive ? 'active' : 'published-fallback';
}

export function toUtcIsoOrNull(date: Date | null): string | null {
	if (!date || Number.isNaN(date.getTime())) return null;
	return date.toISOString();
}

export function insertTemplateToken(
	value: string,
	selectionStart: number,
	selectionEnd: number,
	token: string,
	allowedTokens: readonly string[],
): { value: string; cursor: number } {
	const start = Math.max(0, Math.min(selectionStart, value.length));
	const end = Math.max(start, Math.min(selectionEnd, value.length));
	if (!allowedTokens.includes(token)) return { value, cursor: start };

	return {
		value: `${value.slice(0, start)}${token}${value.slice(end)}`,
		cursor: start + token.length,
	};
}
