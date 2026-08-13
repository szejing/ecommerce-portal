import { toRaw } from 'vue';
import type { DocumentTemplateConfiguration, DocumentTemplateRevision } from '~/utils/types/document-template';

export type TemplateStudioErrorCode =
	| 'save_failed'
	| 'preview_failed'
	| 'test_send_failed'
	| 'publish_failed'
	| 'reset_failed'
	| 'save_before_publish'
	| 'schedule_invalid_date'
	| 'schedule_end_after_start'
	| 'schedule_end_future'
	| 'load_detail_failed';

export type TemplateStudioError = { code: TemplateStudioErrorCode; transportMessage?: string };

type UnknownRecord = Record<string, unknown>;
type TemplateBlock = NonNullable<DocumentTemplateConfiguration['blocks']>[number];

const nativeBlobSlice = typeof Blob !== 'undefined' ? Blob.prototype.slice : null;

export function clone<T>(value: T): T {
	const seen = new WeakMap<object, unknown>();
	const active = new WeakSet<object>();
	const copy = (input: unknown): unknown => {
		if (input === null || typeof input !== 'object') return input;
		const raw = toRaw(input);
		if (raw instanceof Date) return new Date(raw.getTime());
		if (active.has(raw)) throw new TypeError('Cyclic template configuration');
		if (seen.has(raw)) return seen.get(raw);
		active.add(raw);
		if (Array.isArray(raw)) {
			const result = new Array(raw.length);
			seen.set(raw, result);
			for (let index = 0; index < raw.length; index += 1) if (index in raw) result[index] = copy(raw[index]);
			active.delete(raw);
			return result;
		}
		const result: Record<string, unknown> = Object.create(null);
		seen.set(raw, result);
		for (const key of Object.keys(raw)) {
			if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw new TypeError('Unsafe template configuration key');
			result[key] = copy((raw as Record<string, unknown>)[key]);
		}
		active.delete(raw);
		return result;
	};
	return copy(value) as T;
}

export function deepFreeze<T>(value: T): T {
	if (value && typeof value === 'object' && !Object.isFrozen(value)) {
		Object.values(value as Record<string, unknown>).forEach(deepFreeze);
		Object.freeze(value);
	}
	return value;
}

export function stableSerialize(input: unknown, seen = new WeakSet<object>()): string {
	if (input === undefined) return 'Undefined';
	if (input === null) return 'Null';
	if (typeof input === 'string') return `String(${JSON.stringify(input)})`;
	if (typeof input === 'number') {
		if (Number.isNaN(input)) return 'Number(NaN)';
		if (Object.is(input, -0)) return 'Number(-0)';
		return `Number(${String(input)})`;
	}
	if (typeof input === 'boolean') return `Boolean(${input})`;
	if (typeof input === 'bigint') return `BigInt(${input.toString()})`;
	if (typeof input !== 'object') return `${typeof input}(${String(input)})`;

	const value = toRaw(input);
	if (value instanceof Date) {
		const time = value.getTime();
		return Number.isNaN(time) ? 'Date(Invalid)' : `Date(${value.toISOString()})`;
	}
	if (seen.has(value)) throw new TypeError('Cyclic template configuration');
	seen.add(value);
	if (Array.isArray(value)) {
		const entries = Array.from({ length: value.length }, (_, index) => index in value ? `Value(${stableSerialize(value[index], seen)})` : 'Hole');
		seen.delete(value);
		return `Array(${value.length})[${entries.join(',')}]`;
	}
	const serialized = Object.keys(value as UnknownRecord)
		.sort()
		.map(key => `${JSON.stringify(key)}:${stableSerialize((value as UnknownRecord)[key], seen)}`)
		.join(',');
	seen.delete(value);
	return `Object{${serialized}}`;
}

function isRecord(value: unknown): value is UnknownRecord {
	return value !== null && typeof value === 'object';
}

function getApiErrorRecords(error: unknown): UnknownRecord[] {
	if (!isRecord(error)) return [];
	const records: UnknownRecord[] = [];
	const pending: UnknownRecord[] = [error];
	const seen = new Set<object>();
	while (pending.length) {
		const current = pending.shift()!;
		if (seen.has(current)) continue;
		seen.add(current);
		records.push(current);
		for (const key of ['error', 'data', 'response', 'cause']) {
			if (isRecord(current[key])) pending.push(current[key]);
		}
	}
	return records;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	if (typeof error === 'string' && error.trim()) return error;
	for (const record of getApiErrorRecords(error)) {
		if (typeof record.message === 'string' && record.message.trim()) return record.message;
	}
	return fallback;
}

export function getApiErrorMetadataValue(error: unknown, key: string): unknown {
	for (const record of getApiErrorRecords(error)) {
		if (isRecord(record.metadata) && Object.prototype.hasOwnProperty.call(record.metadata, key)) return record.metadata[key];
	}
	return undefined;
}

export function getApiErrorStatus(error: unknown): number | null {
	for (const record of getApiErrorRecords(error)) {
		const status = record.statusCode ?? record.status;
		if (typeof status === 'number') return status;
	}
	return null;
}

export function isBlobResponse(value: unknown): value is Blob {
	if (!isRecord(value) || !nativeBlobSlice) return false;
	try {
		nativeBlobSlice.call(value, 0, 0);
		return true;
	} catch {
		return false;
	}
}

function isPlainRecord(value: unknown): value is UnknownRecord {
	if (!isRecord(value) || Array.isArray(value) || value instanceof Date) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || prototype === Object.prototype;
}

function mergeBlockEdits(serverBlocks: TemplateBlock[], submittedBlocks: TemplateBlock[], localBlocks: TemplateBlock[]): TemplateBlock[] {
	const submittedById = new Map(submittedBlocks.map(block => [block.id, block]));
	const localById = new Map(localBlocks.map(block => [block.id, block]));
	const merged = clone(serverBlocks).filter(block => !submittedById.has(block.id) || localById.has(block.id));
	for (const localBlock of localBlocks) {
		const submittedBlock = submittedById.get(localBlock.id);
		if (submittedBlock && stableSerialize(localBlock) === stableSerialize(submittedBlock)) continue;
		const index = merged.findIndex(block => block.id === localBlock.id);
		if (index === -1) merged.push(clone(localBlock));
		else merged[index] = clone(localBlock);
	}
	return merged;
}

export function mergePostDispatchEdits(
	server: DocumentTemplateConfiguration,
	submitted: DocumentTemplateConfiguration,
	local: DocumentTemplateConfiguration,
): DocumentTemplateConfiguration {
	const mergeRecords = (serverRecord: UnknownRecord, submittedRecord: UnknownRecord, localRecord: UnknownRecord, root: boolean): UnknownRecord => {
		const merged = clone(serverRecord);
		const keys = new Set([...Object.keys(submittedRecord), ...Object.keys(localRecord)]);
		for (const key of keys) {
			const submittedHasKey = Object.prototype.hasOwnProperty.call(submittedRecord, key);
			const localHasKey = Object.prototype.hasOwnProperty.call(localRecord, key);
			if (!localHasKey) {
				if (submittedHasKey) Reflect.deleteProperty(merged, key);
				continue;
			}
			const submittedValue = submittedRecord[key];
			const localValue = localRecord[key];
			if (submittedHasKey && stableSerialize(localValue) === stableSerialize(submittedValue)) continue;
			const serverValue = serverRecord[key];
			if (root && key === 'blocks' && Array.isArray(localValue)) {
				merged[key] = mergeBlockEdits(
					Array.isArray(serverValue) ? serverValue as TemplateBlock[] : [],
					Array.isArray(submittedValue) ? submittedValue as TemplateBlock[] : [],
					localValue as TemplateBlock[],
				);
			} else if (isPlainRecord(localValue)) {
				merged[key] = mergeRecords(isPlainRecord(serverValue) ? serverValue : {}, isPlainRecord(submittedValue) ? submittedValue : {}, localValue, false);
			} else {
				merged[key] = clone(localValue);
			}
		}
		return merged;
	};
	return mergeRecords(server as UnknownRecord, submitted as UnknownRecord, local as UnknownRecord, true) as DocumentTemplateConfiguration;
}

export function isSameSelection(
	current: { channel: string; templateCode: string } | null,
	expected: { channel: string; templateCode: string } | null,
): boolean {
	return current?.channel === expected?.channel && current?.templateCode === expected?.templateCode;
}

export function deduplicateRevisions(revisions: Array<DocumentTemplateRevision | null>): DocumentTemplateRevision[] {
	const ids = new Set<string>();
	const unique: DocumentTemplateRevision[] = [];
	for (const revision of revisions) {
		if (!revision || ids.has(revision.id)) continue;
		ids.add(revision.id);
		unique.push(clone(revision));
	}
	return unique;
}

export function isRevisionEligibleNow(revision: DocumentTemplateRevision, now = Date.now()): boolean {
	const start = revision.start_date ? new Date(revision.start_date).getTime() : null;
	const end = revision.end_date ? new Date(revision.end_date).getTime() : null;
	return (start === null || (!Number.isNaN(start) && start <= now))
		&& (end === null || (!Number.isNaN(end) && now < end));
}

export function pathParts(path: string): [keyof DocumentTemplateConfiguration, string] | null {
	const [section, key, ...rest] = path.split('.');
	if (rest.length || !section || !key || !['brand', 'merchantInfo', 'content'].includes(section)) return null;
	return [section as keyof DocumentTemplateConfiguration, key];
}

export function activationError(window: { startDate: Date | null; endDate: Date | null }, now = Date.now()): TemplateStudioErrorCode | undefined {
	if ((window.startDate && Number.isNaN(window.startDate.getTime())) || (window.endDate && Number.isNaN(window.endDate.getTime()))) {
		return 'schedule_invalid_date';
	}
	if (window.startDate && window.endDate && window.endDate.getTime() <= window.startDate.getTime()) {
		return 'schedule_end_after_start';
	}
	if (window.endDate && window.endDate.getTime() <= now) return 'schedule_end_future';
	return undefined;
}
