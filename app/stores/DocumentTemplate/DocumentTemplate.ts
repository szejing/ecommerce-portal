import { defineStore } from 'pinia';
import { toRaw } from 'vue';
import { UserRoles } from 'yeppi-common';
import { useAuthStore } from '~/stores/Auth/Auth';
import { resolveFieldValue, toUtcIsoOrNull } from '~/utils/document-template';
import type {
	DocumentTemplateChannel,
	DocumentTemplateConfiguration,
	DocumentTemplateDetail,
	DocumentTemplateRevision,
	DocumentTemplateSummary,
} from '~/utils/types/document-template';
import type { DocumentTemplateMutationResp } from '~/repository/modules/document-template/models/response/mutation.resp';
import type { PreviewEmailDocumentTemplateResp } from '~/repository/modules/document-template/models/response/preview-email.resp';
import type { PublishDocumentTemplateResp } from '~/repository/modules/document-template/models/response/publish.resp';

export type EmailPreview = { channel: 'email'; html: string; subject: string; revisionId: string | null; revisionNo: number | null };
export type PdfPreview = { channel: 'pdf'; blob: Blob; objectUrl: string };
export type TemplateActivationWindow = { startDate: Date | null; endDate: Date | null };
export type TemplatePublishIntent = TemplateActivationWindow & {
	channel: DocumentTemplateChannel;
	templateCode: string;
	revisionId: string;
	revisionNo: number;
};
export type TemplatePublishPreparation =
	| { status: 'ready'; intent: TemplatePublishIntent; scheduled: boolean }
	| { status: 'rejected' };
export type TemplateMutationOutcome = 'completed' | 'stale' | 'failed';
export type TemplateResetIntent = {
	channel: DocumentTemplateChannel;
	templateCode: string;
	version: number;
	draftRevisionId: string | null;
};
type TemplateSelection = { channel: DocumentTemplateChannel; templateCode: string };
type TemplateSchedule = { startDate: Date | null; endDate: Date | null; timezone: string };
type UnknownRecord = Record<string, unknown>;
type TemplateBlock = NonNullable<DocumentTemplateConfiguration['blocks']>[number];
type PreviewSchedulingStore = {
	selected: TemplateSelection | null;
	detail: DocumentTemplateDetail | null;
	isDirty: boolean;
	markPreviewStale: () => void;
	previewDraft: (options?: { debounceMs?: number; force?: boolean }) => Promise<void>;
};

const emptyConfiguration = (): DocumentTemplateConfiguration => ({});
const nativeBlobSlice = typeof Blob !== 'undefined' ? Blob.prototype.slice : null;

function clone<T>(value: T): T {
	const seen = new WeakMap<object, unknown>();
	const copy = (input: unknown): unknown => {
		if (input === null || typeof input !== 'object') return input;
		const raw = toRaw(input);
		if (raw instanceof Date) return new Date(raw.getTime());
		if (seen.has(raw)) throw new TypeError('Cyclic template configuration');
		if (Array.isArray(raw)) {
			const result = new Array(raw.length);
			seen.set(raw, result);
			for (let index = 0; index < raw.length; index += 1) if (index in raw) result[index] = copy(raw[index]);
			return result;
		}
		const result: Record<string, unknown> = Object.create(null);
		seen.set(raw, result);
		for (const key of Object.keys(raw)) {
			if (key === '__proto__' || key === 'constructor' || key === 'prototype') throw new TypeError('Unsafe template configuration key');
			result[key] = copy((raw as Record<string, unknown>)[key]);
		}
		return result;
	};
	return copy(value) as T;
}

function deepFreeze<T>(value: T): T {
	if (value && typeof value === 'object' && !Object.isFrozen(value)) {
		Object.values(value as Record<string, unknown>).forEach(deepFreeze);
		Object.freeze(value);
	}
	return value;
}

function stableSerialize(input: unknown, seen = new WeakSet<object>()): string {
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

function getApiErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	if (typeof error === 'string' && error.trim()) return error;
	for (const record of getApiErrorRecords(error)) {
		if (typeof record.message === 'string' && record.message.trim()) return record.message;
	}
	return fallback;
}

function getApiErrorMetadataValue(error: unknown, key: string): unknown {
	for (const record of getApiErrorRecords(error)) {
		if (isRecord(record.metadata) && Object.prototype.hasOwnProperty.call(record.metadata, key)) return record.metadata[key];
	}
	return undefined;
}

function getApiErrorStatus(error: unknown): number | null {
	for (const record of getApiErrorRecords(error)) {
		const status = record.statusCode ?? record.status;
		if (typeof status === 'number') return status;
	}
	return null;
}

function isBlobResponse(value: unknown): value is Blob {
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

function mergeBlockEdits(
	serverBlocks: TemplateBlock[],
	submittedBlocks: TemplateBlock[],
	localBlocks: TemplateBlock[],
): TemplateBlock[] {
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

function mergePostDispatchEdits(
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
				if (submittedHasKey) delete merged[key];
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

/** Debounce for live email preview while typing. PDF previews stay refresh-only. */
export const EMAIL_PREVIEW_DEBOUNCE_MS = 800;

function isSameSelection(current: TemplateSelection | null, expected: TemplateSelection | null): boolean {
	return current?.channel === expected?.channel && current?.templateCode === expected?.templateCode;
}

function deduplicateRevisions(revisions: Array<DocumentTemplateRevision | null>): DocumentTemplateRevision[] {
	const ids = new Set<string>();
	const unique: DocumentTemplateRevision[] = [];
	for (const revision of revisions) {
		if (!revision || ids.has(revision.id)) continue;
		ids.add(revision.id);
		unique.push(clone(revision));
	}
	return unique;
}

function isRevisionEligibleNow(revision: DocumentTemplateRevision, now = Date.now()): boolean {
	const start = revision.start_date ? new Date(revision.start_date).getTime() : null;
	const end = revision.end_date ? new Date(revision.end_date).getTime() : null;
	return (start === null || (!Number.isNaN(start) && start <= now))
		&& (end === null || (!Number.isNaN(end) && now < end));
}

function activationError(window: TemplateActivationWindow, now = Date.now()): string | undefined {
	if ((window.startDate && Number.isNaN(window.startDate.getTime())) || (window.endDate && Number.isNaN(window.endDate.getTime()))) {
		return 'Schedule date is invalid';
	}
	if (window.startDate && window.endDate && window.endDate.getTime() <= window.startDate.getTime()) {
		return 'Schedule start must be before its end';
	}
	if (window.endDate && window.endDate.getTime() <= now) return 'Schedule end must be in the future';
	return undefined;
}

function pathParts(path: string): [keyof DocumentTemplateConfiguration, string] | null {
	const [section, key, ...rest] = path.split('.');
	if (rest.length || !section || !key || !['brand', 'merchantInfo', 'content'].includes(section)) return null;
	return [section as keyof DocumentTemplateConfiguration, key];
}

function schedulePreviewAfterEdit(store: PreviewSchedulingStore): void {
	if (!store.selected || !store.detail || !store.isDirty) return;
	if (store.selected.channel === 'pdf') {
		store.markPreviewStale();
		return;
	}
	void store.previewDraft({ debounceMs: EMAIL_PREVIEW_DEBOUNCE_MS });
}

export const useDocumentTemplateStore = defineStore('documentTemplateStore', {
	state: () => ({
		summaries: [] as DocumentTemplateSummary[],
		selected: null as TemplateSelection | null,
		detail: null as DocumentTemplateDetail | null,
		baseline: deepFreeze(emptyConfiguration()) as DocumentTemplateConfiguration,
		draft: emptyConfiguration() as DocumentTemplateConfiguration,
		preview: null as EmailPreview | PdfPreview | null,
		previewStale: false,
		previewedConfigurationKey: null as string | null,
		revisions: [] as DocumentTemplateRevision[],
		isDirty: false,
		loadingSummaries: false,
		loadingDetail: false,
		saving: false,
		previewing: false,
		publishing: false,
		testing: false,
		resetting: false,
		restoring: false,
		conflict: null as { currentVersion: number } | null,
		fieldErrors: {} as Record<string, string>,
		error: null as string | null,
		summaryError: null as string | null,
		detailError: null as string | null,
		schedule: {
			startDate: null,
			endDate: null,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		} as TemplateSchedule,
		generation: 0,
		selectionEpoch: 0,
		editGeneration: 0,
		mutationGeneration: 0,
		summariesGeneration: 0,
		saveGeneration: 0,
		previewGeneration: 0,
		publishGeneration: 0,
		revisionsGeneration: 0,
		testGeneration: 0,
	}),
	getters: {
		loading(): boolean {
			return this.loadingSummaries || this.loadingDetail;
		},
		canEdit(): boolean {
			const role = useAuthStore().user?.role;
			return role === UserRoles.MERCHANT_STAFF || role === UserRoles.MERCHANT_ADMIN || role === UserRoles.SUPER_STAFF || role === UserRoles.SUPER_ADMIN;
		},
		canPublish(): boolean {
			const role = useAuthStore().user?.role;
			return role === UserRoles.MERCHANT_ADMIN || role === UserRoles.SUPER_ADMIN;
		},
		canRestore(): boolean {
			return this.canPublish;
		},
		canReset(): boolean {
			return this.canPublish;
		},
		scheduleIsValid(): boolean {
			const { startDate, endDate } = this.schedule;
			if ((startDate && Number.isNaN(startDate.getTime())) || (endDate && Number.isNaN(endDate.getTime()))) return false;
			return !startDate || !endDate || startDate.getTime() < endDate.getTime();
		},
	},
	actions: {
		refreshDirty() {
			this.isDirty = stableSerialize(this.draft) !== stableSerialize(this.baseline);
		},

		setBaseline(configuration: DocumentTemplateConfiguration) {
			this.baseline = deepFreeze(clone(configuration));
			this.draft = clone(configuration);
			this.refreshDirty();
		},

		resetDetailSelection() {
			this.generation += 1;
			this.selectionEpoch += 1;
			this.saveGeneration += 1;
			this.previewGeneration += 1;
			this.publishGeneration += 1;
			this.mutationGeneration += 1;
			this.revisionsGeneration += 1;
			this.testGeneration += 1;
			this.loadingDetail = false;
			this.saving = false;
			this.previewing = false;
			this.publishing = false;
			this.testing = false;
			this.resetting = false;
			this.restoring = false;
			this.selected = null;
			this.detail = null;
			this.revisions = [];
			this.setBaseline(emptyConfiguration());
			this.conflict = null;
			this.fieldErrors = {};
			this.error = null;
			this.detailError = null;
			this.schedule = { startDate: null, endDate: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
			this.clearPreview();
		},

		resetSelection() {
			this.resetDetailSelection();
			this.summariesGeneration += 1;
			this.loadingSummaries = false;
			this.summaryError = null;
		},

		discardDraft() {
			this.draft = clone(this.baseline);
			this.conflict = null;
			this.fieldErrors = {};
			this.error = null;
			this.refreshDirty();
		},

		clearPreview() {
			const objectUrl = this.preview?.channel === 'pdf' ? this.preview.objectUrl : null;
			this.preview = null;
			this.previewStale = false;
			this.previewedConfigurationKey = null;
			if (objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
				try {
					URL.revokeObjectURL(objectUrl);
				} catch {
					// The preview is already cleared; URL cleanup is best-effort in non-browser runtimes.
				}
			}
		},

		markPreviewStale() {
			if (this.preview) this.previewStale = true;
		},

		previewConfigurationKey(channel: DocumentTemplateChannel, templateCode: string, configuration: DocumentTemplateConfiguration): string {
			return `${channel}:${templateCode}:${stableSerialize(configuration)}`;
		},

		replacePreview(next: EmailPreview | PdfPreview) {
			const previous = this.preview;
			this.preview = next;
			this.previewStale = false;
			if (previous?.channel === 'pdf' && (next.channel !== 'pdf' || previous.objectUrl !== next.objectUrl)) {
				if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
					try {
						URL.revokeObjectURL(previous.objectUrl);
					} catch {
						// Best-effort URL cleanup in non-browser runtimes.
					}
				}
			}
		},

		dispose() {
			this.resetSelection();
		},

		async loadSummaries() {
			const request = ++this.summariesGeneration;
			this.loadingSummaries = true;
			this.summaryError = null;
			try {
				const { $api } = useNuxtApp();
				const response = await $api.documentTemplate.list();
				if (request === this.summariesGeneration) this.summaries = clone(response.document_templates ?? []);
			} catch (error) {
				if (request === this.summariesGeneration) this.summaryError = getApiErrorMessage(error, 'Failed to load document templates');
				throw error;
			} finally {
				if (request === this.summariesGeneration) this.loadingSummaries = false;
			}
		},

		async loadDetail(channel: DocumentTemplateChannel, templateCode: string) {
			const selection = { channel, templateCode };
			this.resetDetailSelection();
			const request = ++this.generation;
			const epoch = this.selectionEpoch;
			this.selected = selection;
			this.loadingDetail = true;
			this.detailError = null;
			this.conflict = null;
			this.fieldErrors = {};
			this.clearPreview();

			try {
				const { $api } = useNuxtApp();
				const response = await $api.documentTemplate.get(channel, templateCode);
				if (request !== this.generation || epoch !== this.selectionEpoch || !isSameSelection(this.selected, selection)) return;
				this.detail = clone(response);
				this.revisions = deduplicateRevisions([response.draft_revision, response.latest_published_revision, response.active_revision]);
				this.setBaseline(response.draft_revision?.configuration ?? response.configuration);
				const active = response.active_revision;
				this.schedule = {
					startDate: active?.start_date ? new Date(active.start_date) : null,
					endDate: active?.end_date ? new Date(active.end_date) : null,
					timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				};
			} catch (error) {
				if (request === this.generation && epoch === this.selectionEpoch) this.detailError = getApiErrorMessage(error, 'Failed to load document template');
			} finally {
				if (request === this.generation && epoch === this.selectionEpoch) this.loadingDetail = false;
			}
		},

		async loadRevisions() {
			const selection = this.selected;
			if (!selection) return;
			const request = ++this.revisionsGeneration;
			const epoch = this.selectionEpoch;
			try {
				const { $api } = useNuxtApp();
				const response = await $api.documentTemplate.listRevisions(selection.channel, selection.templateCode);
				if (request === this.revisionsGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) this.revisions = clone(response.revisions);
			} catch (error) {
				if (request === this.revisionsGeneration && epoch === this.selectionEpoch) this.error = getApiErrorMessage(error, 'Failed to load document template revisions');
			}
		},

		setConfigurationPath(path: string, value: string | number) {
			const parts = pathParts(path);
			const field = this.detail?.fields.find(candidate => candidate.path === path);
			if (!parts || !field || (path === 'brand.logoAssetId' ? !(typeof value === 'number' && value > 0) : typeof value !== 'string')) return;
			if (typeof value === 'string' && value.length > field.max_length) {
				this.fieldErrors = { ...this.fieldErrors, [path]: `${field.label} is too long` };
				return;
			}

			const [section, key] = parts;
			const sectionValues = { ...(this.draft[section] as Record<string, string> | undefined), [key]: value };
			this.draft = { ...this.draft, [section]: sectionValues };
			// Keep draft in sync while editing so required fields can be cleared and retyped;
			// blank required values still surface a field error until filled again.
			if (typeof value === 'string' && !field.allow_blank && value === '') {
				this.fieldErrors = { ...this.fieldErrors, [path]: `${field.label} cannot be blank` };
			} else {
				const { [path]: _fieldError, ...fieldErrors } = this.fieldErrors;
				this.fieldErrors = fieldErrors;
			}
			this.editGeneration += 1;
			this.refreshDirty();
			schedulePreviewAfterEdit(this);
		},

		getFieldResolution(path: string, defaultValue = '') {
			const parts = pathParts(path);
			if (!parts) return resolveFieldValue(undefined, undefined, defaultValue);
			const [section, key] = parts;
			const draftValues = this.draft[section] as Record<string, string> | undefined;
			const inheritedValues = section === 'merchantInfo'
				? this.detail?.inherited_values.merchantInfo as Record<string, string> | undefined
				: undefined;
			const overrideValue = draftValues && Object.prototype.hasOwnProperty.call(draftValues, key) ? draftValues[key] : undefined;
			const storeProfileValue = inheritedValues && Object.prototype.hasOwnProperty.call(inheritedValues, key) ? inheritedValues[key] : undefined;
			return resolveFieldValue(overrideValue, storeProfileValue, defaultValue);
		},

		clearConfigurationOverride(path: string) {
			const parts = pathParts(path);
			if (!parts || !this.detail?.fields.some(field => field.path === path)) return;
			const [section, key] = parts;
			const sectionValues = { ...(this.draft[section] as Record<string, string> | undefined) };
			delete sectionValues[key];
			const nextDraft = { ...this.draft };
			if (Object.keys(sectionValues).length) nextDraft[section] = sectionValues as never;
			else delete nextDraft[section];
			this.draft = nextDraft;
			this.editGeneration += 1;
			this.refreshDirty();
			schedulePreviewAfterEdit(this);
		},

		setBlockEnabled(id: string, enabled: boolean) {
			const descriptor = this.detail?.blocks.find(block => block.id === id);
			if (!descriptor) return;
			const existing = new Map((this.draft.blocks ?? []).map(block => [block.id, block]));
			existing.set(id, { id, enabled: descriptor.required ? true : enabled, props: {} });
			this.draft = {
				...this.draft,
				blocks: this.detail!.blocks.map(block => ({
					id: block.id,
					enabled: block.required ? true : (existing.get(block.id)?.enabled ?? block.default_enabled),
					props: {},
				})),
			};
			this.editGeneration += 1;
			this.refreshDirty();
			schedulePreviewAfterEdit(this);
		},

		configurationForRequest(): DocumentTemplateConfiguration {
			const fields = new Set(this.detail?.fields.map(field => field.path) ?? []);
			const configuration: DocumentTemplateConfiguration = {};
			(['brand', 'merchantInfo', 'content'] as const).forEach(section => {
				const values = this.draft[section] as Record<string, unknown> | undefined;
				if (!values) return;
				const filtered = Object.fromEntries(Object.entries(values).filter(([key, value]) => (fields.has(`${section}.${key}`) || (section === 'brand' && key === 'logoAssetId')) && (typeof value === 'string' || (section === 'brand' && key === 'logoAssetId' && typeof value === 'number' && value > 0))));
				if (Object.keys(filtered).length) configuration[section] = filtered as never;
			});
			if (this.detail && this.draft.blocks !== undefined) {
				const blocks = new Map((this.draft.blocks ?? []).map(block => [block.id, block]));
				configuration.blocks = this.detail.blocks.map(block => ({
					id: block.id,
					enabled: block.required ? true : (blocks.get(block.id)?.enabled ?? block.default_enabled),
					props: {},
				}));
			}
			return configuration;
		},

		applyDraftRevision(revision: DocumentTemplateRevision) {
			const nextRevision = clone(revision);
			const retained: DocumentTemplateRevision[] = [];
			const ids = new Set([nextRevision.id]);
			for (const current of this.revisions) {
				if (ids.has(current.id) || current.status === 'draft') continue;
				ids.add(current.id);
				retained.push(clone(current));
			}
			this.revisions = [nextRevision, ...retained];
		},

		applyPublishedRevision(revision: DocumentTemplateRevision, consumedRevisionNo: number) {
			const published = clone(revision);
			const retained: DocumentTemplateRevision[] = [];
			const ids = new Set([published.id]);
			for (const current of this.revisions) {
				if (ids.has(current.id) || (current.status === 'draft' && current.revision_no === consumedRevisionNo)) continue;
				ids.add(current.id);
				retained.push(current.status === 'draft' ? { ...clone(current), status: 'archived' } : clone(current));
			}
			this.revisions = [published, ...retained];
		},

		applyMutation(
			response: DocumentTemplateMutationResp,
			submittedEditGeneration: number,
			submittedDraft?: DocumentTemplateConfiguration,
		) {
			if (!this.detail) return;
			this.detail = { ...this.detail, version: response.version, draft_revision: clone(response.draft_revision) };
			this.baseline = deepFreeze(clone(response.draft_revision.configuration));
			if (this.editGeneration === submittedEditGeneration) this.draft = clone(response.draft_revision.configuration);
			else if (submittedDraft) this.draft = mergePostDispatchEdits(response.draft_revision.configuration, submittedDraft, this.draft);
			this.refreshDirty();
			this.applyDraftRevision(response.draft_revision);
			this.conflict = null;
		},

		readFieldErrors(error: unknown) {
			const fieldErrors = getApiErrorMetadataValue(error, 'field_errors');
			this.fieldErrors = isRecord(fieldErrors)
				? Object.fromEntries(Object.entries(fieldErrors).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
				: {};
		},

		readConflict(error: unknown): boolean {
			const currentVersion = getApiErrorMetadataValue(error, 'current_version');
			if (getApiErrorStatus(error) !== 409 || typeof currentVersion !== 'number') return false;
			this.conflict = { currentVersion };
			return true;
		},

		async saveDraft() {
			const selection = this.selected;
			if (!selection || !this.detail || !this.canEdit || !this.isDirty) return;
			const request = ++this.saveGeneration;
			const mutation = ++this.mutationGeneration;
			this.revisionsGeneration += 1;
			this.publishing = false; this.resetting = false; this.restoring = false;
			const epoch = this.selectionEpoch;
			const editGeneration = this.editGeneration;
			const version = this.detail.version;
			const configuration = this.configurationForRequest();
			this.saving = true;
			this.error = null;
			this.fieldErrors = {};
			try {
				const { $api } = useNuxtApp();
				const response = await $api.documentTemplate.saveDraft(selection.channel, selection.templateCode, {
					version,
					configuration,
				});
				if (request === this.saveGeneration && mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					this.applyMutation(response, editGeneration);
					await this.loadRevisions();
				}
			} catch (error) {
				if (request === this.saveGeneration && mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					this.readFieldErrors(error);
					if (!this.readConflict(error)) this.error = getApiErrorMessage(error, 'Failed to save document template');
				}
			} finally {
				if (request === this.saveGeneration && epoch === this.selectionEpoch) this.saving = false;
			}
		},

		async reloadAfterConflict() {
			const selection = this.selected;
			if (!selection) return;
			await this.loadDetail(selection.channel, selection.templateCode);
		},

		async previewDraft(options: { debounceMs?: number; force?: boolean } = {}) {
			const selection = this.selected;
			if (!selection || !this.detail || !this.canEdit) return;
			const debounceMs = options.debounceMs ?? 0;
			const force = options.force ?? debounceMs === 0;
			const request = ++this.previewGeneration;
			this.previewing = true;
			this.error = null;
			if (debounceMs > 0) await new Promise(resolve => setTimeout(resolve, debounceMs));
			if (request !== this.previewGeneration || !isSameSelection(this.selected, selection)) {
				if (request === this.previewGeneration) this.previewing = false;
				return;
			}
			const configuration = this.configurationForRequest();
			const configurationKey = this.previewConfigurationKey(selection.channel, selection.templateCode, configuration);
			if (!force && this.preview && this.previewedConfigurationKey === configurationKey) {
				this.previewStale = false;
				if (request === this.previewGeneration) this.previewing = false;
				return;
			}
			try {
				const { $api } = useNuxtApp();
				const body = { configuration };
				if (selection.channel === 'email') {
					const response: PreviewEmailDocumentTemplateResp = await $api.documentTemplate.previewEmail(selection.channel, selection.templateCode, body);
					if (request === this.previewGeneration && isSameSelection(this.selected, selection)) {
						this.replacePreview({
							channel: 'email',
							html: response.html,
							subject: response.subject,
							revisionId: response.revision_id,
							revisionNo: response.revision_no,
						});
						this.previewedConfigurationKey = configurationKey;
					}
				} else {
					const blob = await $api.documentTemplate.previewPdf(selection.channel, selection.templateCode, body);
					if (request === this.previewGeneration && isSameSelection(this.selected, selection)) {
						if (!isBlobResponse(blob)) throw new TypeError('Invalid PDF preview response');
						if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function' || typeof URL.revokeObjectURL !== 'function') throw new TypeError('PDF previews are unavailable in this environment');
						const objectUrl = URL.createObjectURL(blob);
						this.replacePreview({ channel: 'pdf', blob, objectUrl });
						this.previewedConfigurationKey = configurationKey;
					}
				}
			} catch (error) {
				if (request === this.previewGeneration && isSameSelection(this.selected, selection)) {
					this.previewStale = Boolean(this.preview);
					this.error = getApiErrorMessage(error, 'Failed to preview document template');
				}
			} finally {
				if (request === this.previewGeneration) this.previewing = false;
			}
		},

		async refreshPreview() {
			await this.previewDraft({ force: true });
		},

		async testSend() {
			const selection = this.selected;
			if (!selection || !this.detail || selection.channel !== 'email' || !this.canEdit) return;
			const request = ++this.testGeneration;
			const epoch = this.selectionEpoch;
			this.testing = true;
			this.error = null;
			try {
				const { $api } = useNuxtApp();
				await $api.documentTemplate.testSend(selection.channel, selection.templateCode, { configuration: this.configurationForRequest() });
			} catch (error) {
				if (request === this.testGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) this.error = getApiErrorMessage(error, 'Failed to send test document template');
			} finally {
				if (request === this.testGeneration && epoch === this.selectionEpoch) this.testing = false;
			}
		},

		preparePublish(window: TemplateActivationWindow): TemplatePublishPreparation {
			const selection = this.selected;
			const draftRevision = this.detail?.draft_revision;
			if (!selection || !draftRevision || !this.canPublish) return { status: 'rejected' };
			if (this.isDirty) {
				this.error = 'Save draft before publishing';
				return { status: 'rejected' };
			}
			const activation = {
				startDate: window.startDate ? new Date(window.startDate) : null,
				endDate: window.endDate ? new Date(window.endDate) : null,
			};
			const validationError = activationError(activation);
			if (validationError) {
				this.error = validationError;
				return { status: 'rejected' };
			}
			return {
				status: 'ready',
				scheduled: activation.startDate !== null || activation.endDate !== null,
				intent: {
					...selection,
					revisionId: draftRevision.id,
					revisionNo: draftRevision.revision_no,
					...activation,
				},
			};
		},

		async confirmPublish(intent: TemplatePublishIntent): Promise<TemplateMutationOutcome> {
			const validationError = activationError(intent);
			if (validationError) {
				this.error = validationError;
				return 'failed';
			}
			const currentDraft = this.detail?.draft_revision;
			if (
				!isSameSelection(this.selected, intent)
				|| this.isDirty
				|| currentDraft?.id !== intent.revisionId
				|| currentDraft.revision_no !== intent.revisionNo
			) return 'stale';
			this.schedule = {
				...this.schedule,
				startDate: intent.startDate ? new Date(intent.startDate) : null,
				endDate: intent.endDate ? new Date(intent.endDate) : null,
			};
			return await this.publish(intent.revisionNo);
		},

		async publish(revisionNo?: number): Promise<TemplateMutationOutcome> {
			const selection = this.selected;
			if (!selection || !this.detail || !this.canPublish) return 'stale';
			if (this.isDirty) {
				this.error = 'Save draft before publishing';
				return 'failed';
			}
			const targetRevisionNo = revisionNo ?? this.detail.draft_revision?.revision_no;
			if (targetRevisionNo === undefined) return 'stale';
			if (!this.scheduleIsValid) {
				this.error = 'Schedule start must be before its end';
				return 'failed';
			}
			const request = ++this.publishGeneration;
			const mutation = ++this.mutationGeneration;
			this.revisionsGeneration += 1;
			this.saving = false; this.resetting = false; this.restoring = false;
			const epoch = this.selectionEpoch;
			const editGeneration = this.editGeneration;
			const submitted = clone(this.draft);
			const version = this.detail.version;
			this.publishing = true;
			this.error = null;
			try {
				const { $api } = useNuxtApp();
				const response: PublishDocumentTemplateResp = await $api.documentTemplate.publish(selection.channel, selection.templateCode, {
					version,
					revision_no: targetRevisionNo,
					start_date: toUtcIsoOrNull(this.schedule.startDate),
					end_date: toUtcIsoOrNull(this.schedule.endDate),
				});
				if (request === this.publishGeneration && mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					const publishedConfiguration = response.latest_published_revision.configuration ?? submitted;
					const publishedRevision = clone(response.latest_published_revision);
					this.detail = {
						...this.detail!,
						version: response.version,
						latest_published_revision: publishedRevision,
						active_revision: isRevisionEligibleNow(publishedRevision) ? clone(publishedRevision) : this.detail!.active_revision,
						draft_revision: null,
					};
					this.baseline = deepFreeze(clone(publishedConfiguration));
					if (this.editGeneration === editGeneration) this.draft = clone(publishedConfiguration);
					this.refreshDirty();
					this.applyPublishedRevision(response.latest_published_revision, targetRevisionNo);
					this.conflict = null;
					return 'completed';
				}
				return 'stale';
			} catch (error) {
				if (request === this.publishGeneration && mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					if (!this.readConflict(error)) this.error = getApiErrorMessage(error, 'Failed to publish document template');
					return 'failed';
				}
				return 'stale';
			} finally {
				if (request === this.publishGeneration && epoch === this.selectionEpoch) this.publishing = false;
			}
		},

		prepareReset(): TemplateResetIntent | null {
			if (!this.selected || !this.detail || !this.canReset) return null;
			return {
				...this.selected,
				version: this.detail.version,
				draftRevisionId: this.detail.draft_revision?.id ?? null,
			};
		},

		async confirmReset(intent: TemplateResetIntent): Promise<TemplateMutationOutcome> {
			if (
				!isSameSelection(this.selected, intent)
				|| this.detail?.version !== intent.version
				|| (this.detail.draft_revision?.id ?? null) !== intent.draftRevisionId
			) return 'stale';
			const outcome = await this.reset();
			if (outcome === 'completed' && isSameSelection(this.selected, intent)) await this.refreshPreview();
			return outcome;
		},

		async reset(): Promise<TemplateMutationOutcome> {
			const selection = this.selected;
			if (!selection || !this.detail || !this.canReset) return 'stale';
			const mutation = ++this.mutationGeneration;
			this.revisionsGeneration += 1;
			this.saving = false; this.publishing = false; this.restoring = false;
			const epoch = this.selectionEpoch;
			const editGeneration = this.editGeneration;
			const submittedDraft = clone(this.draft);
			this.resetting = true;
			this.error = null;
			try {
				const { $api } = useNuxtApp();
				const response = await $api.documentTemplate.reset(selection.channel, selection.templateCode, { version: this.detail.version });
				if (mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					this.applyMutation(response, editGeneration, submittedDraft);
					await this.loadRevisions();
					return 'completed';
				}
				return 'stale';
			} catch (error) {
				if (mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					if (!this.readConflict(error)) this.error = getApiErrorMessage(error, 'Failed to reset document template');
					return 'failed';
				}
				return 'stale';
			} finally {
				if (epoch === this.selectionEpoch && mutation === this.mutationGeneration) this.resetting = false;
			}
		},

		async resetTemplate(): Promise<TemplateMutationOutcome> {
			return await this.reset();
		},

		async restore(revisionNo: number) {
			const selection = this.selected;
			if (!selection || !this.detail || !this.canRestore) return;
			const mutation = ++this.mutationGeneration;
			this.revisionsGeneration += 1;
			this.saving = false; this.publishing = false; this.resetting = false;
			const epoch = this.selectionEpoch;
			const editGeneration = this.editGeneration;
			const submittedDraft = clone(this.draft);
			this.restoring = true;
			this.error = null;
			try {
				const { $api } = useNuxtApp();
				const response = await $api.documentTemplate.restore(selection.channel, selection.templateCode, revisionNo, { version: this.detail.version });
				if (mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					this.applyMutation(response, editGeneration, submittedDraft);
					await this.loadRevisions();
				}
			} catch (error) {
				if (mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					if (!this.readConflict(error)) this.error = getApiErrorMessage(error, 'Failed to restore document template revision');
				}
			} finally {
				if (epoch === this.selectionEpoch && mutation === this.mutationGeneration) this.restoring = false;
			}
		},

		async restoreRevision(revisionNo: number) {
			await this.restore(revisionNo);
		},
	},
});
