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

const TOKEN_RE = /\{\{([^{}]+)\}\}/g;

export function normalizeTemplateToken(token: string): string {
	const match = /^\{\{([^{}]+)\}\}$/.exec(token);
	return `{{${match?.[1] ?? token}}}`;
}

export type TemplateTokenSegment =
	| { type: 'text'; value: string }
	| { type: 'token'; value: string; start: number; end: number };

export function splitTemplateTokenSegments(
	value: string,
	allowedTokens: readonly string[],
): TemplateTokenSegment[] {
	const allowed = new Set(allowedTokens.map(normalizeTemplateToken));
	const segments: TemplateTokenSegment[] = [];
	let lastIndex = 0;
	TOKEN_RE.lastIndex = 0;
	let match: RegExpExecArray | null;

	const pushText = (text: string) => {
		if (!text) return;
		const last = segments.at(-1);
		if (last?.type === 'text') {
			last.value += text;
		} else {
			segments.push({ type: 'text', value: text });
		}
	};

	while ((match = TOKEN_RE.exec(value)) !== null) {
		const token = match[0];
		const start = match.index;
		const end = start + token.length;
		if (start > lastIndex) {
			pushText(value.slice(lastIndex, start));
		}
		if (allowed.has(token)) {
			segments.push({ type: 'token', value: token, start, end });
		} else {
			pushText(token);
		}
		lastIndex = end;
	}
	if (lastIndex < value.length) {
		pushText(value.slice(lastIndex));
	}
	if (!segments.length) segments.push({ type: 'text', value: '' });
	return segments;
}

export function removeTemplateTokenAt(
	value: string,
	start: number,
	end: number,
): { value: string; cursor: number } {
	const from = Math.max(0, Math.min(start, value.length));
	const to = Math.max(from, Math.min(end, value.length));
	return {
		value: `${value.slice(0, from)}${value.slice(to)}`,
		cursor: from,
	};
}

export function templateTokenBoundsForDelete(
	value: string,
	cursor: number,
	key: 'Backspace' | 'Delete',
	allowedTokens: readonly string[],
): { start: number; end: number } | null {
	const segments = splitTemplateTokenSegments(value, allowedTokens);
	for (const segment of segments) {
		if (segment.type !== 'token') continue;
		if (key === 'Backspace' && cursor === segment.end) return { start: segment.start, end: segment.end };
		if (key === 'Delete' && cursor === segment.start) return { start: segment.start, end: segment.end };
	}
	return null;
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
