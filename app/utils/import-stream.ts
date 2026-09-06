export type ImportProgress = {
	processed: number;
	total: number | null;
};

export type ImportStreamEvent<TResult = unknown> =
	| ({ type: 'progress' } & ImportProgress)
	| { type: 'result'; result: TResult }
	| ({ type: 'stopped'; result?: TResult } & ImportProgress)
	| { type: 'error'; message: string };

const DEFAULT_IMPORT_ERROR_MESSAGE = 'Import failed';

function toProcessed(value: unknown): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function toTotal(value: unknown): number | null {
	if (value === null || value === undefined) return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? Math.trunc(parsed) : null;
}

/**
 * NDJSON arrives in arbitrary chunk boundaries, so the caller keeps `rest`
 * as the head of the next chunk instead of parsing a half-written line.
 */
export function splitNdjsonLines(buffer: string): { lines: string[]; rest: string } {
	const segments = buffer.split('\n');
	const rest = segments.pop() ?? '';
	const lines = segments.map((segment) => segment.trim()).filter((segment) => segment.length > 0);
	return { lines, rest };
}

export function parseImportStreamEvent<TResult = unknown>(line: string): ImportStreamEvent<TResult> | undefined {
	const trimmed = line.trim();
	if (!trimmed) return undefined;

	let payload: Record<string, unknown>;
	try {
		payload = JSON.parse(trimmed) as Record<string, unknown>;
	} catch {
		return undefined;
	}

	if (!payload || typeof payload !== 'object') return undefined;

	switch (payload.type) {
		case 'progress':
			return { type: 'progress', processed: toProcessed(payload.processed), total: toTotal(payload.total) };
		case 'result':
			return { type: 'result', result: (payload.result ?? payload) as TResult };
		case 'stopped':
			return {
				type: 'stopped',
				processed: toProcessed(payload.processed),
				total: toTotal(payload.total),
				result: payload.result as TResult | undefined,
			};
		case 'error': {
			const message = typeof payload.message === 'string' && payload.message.trim() ? payload.message : DEFAULT_IMPORT_ERROR_MESSAGE;
			return { type: 'error', message };
		}
		default:
			return undefined;
	}
}

export function formatElapsedTime(seconds: number): string {
	const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
	if (safeSeconds < 60) return `${safeSeconds}s`;

	const minutes = Math.floor(safeSeconds / 60);
	const remainder = safeSeconds % 60;
	return `${minutes}:${String(remainder).padStart(2, '0')}`;
}
