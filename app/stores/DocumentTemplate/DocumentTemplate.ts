import { defineStore } from 'pinia';
import { UserRoles } from 'yeppi-common';
import { useAuthStore } from '~/stores/Auth/Auth';
import { resolveFieldValue, toUtcIsoOrNull } from '~/utils/document-template';
import type {
	DocumentTemplateChannel,
	DocumentTemplateConfiguration,
	DocumentTemplateDetail,
	DocumentTemplateMutationResponse,
	DocumentTemplateRevision,
	DocumentTemplateSummary,
	PreviewEmailDocumentTemplateResponse,
	PublishDocumentTemplateResponse,
} from '~/utils/types/document-template';

export type EmailPreview = { channel: 'email'; html: string; subject: string; revisionId: string | null; revisionNo: number | null };
export type PdfPreview = { channel: 'pdf'; blob: Blob; objectUrl: string };
type TemplateSelection = { channel: DocumentTemplateChannel; templateCode: string };
type TemplateSchedule = { startDate: Date | null; endDate: Date | null; timezone: string };
type ApiError = { statusCode?: number; status?: number; metadata?: { current_version?: number; field_errors?: Record<string, string> } };

const emptyConfiguration = (): DocumentTemplateConfiguration => ({});

function clone<T>(value: T): T {
	return structuredClone(value);
}

function deepFreeze<T>(value: T): T {
	if (value && typeof value === 'object' && !Object.isFrozen(value)) {
		Object.values(value as Record<string, unknown>).forEach(deepFreeze);
		Object.freeze(value);
	}
	return value;
}

function stableSerialize(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
	return `{${Object.keys(value as Record<string, unknown>).sort().map(key => `${JSON.stringify(key)}:${stableSerialize((value as Record<string, unknown>)[key])}`).join(',')}}`;
}

function isSameSelection(current: TemplateSelection | null, expected: TemplateSelection | null): boolean {
	return current?.channel === expected?.channel && current?.templateCode === expected?.templateCode;
}

function pathParts(path: string): [keyof DocumentTemplateConfiguration, string] | null {
	const [section, key, ...rest] = path.split('.');
	if (rest.length || !section || !key || !['brand', 'merchantInfo', 'content'].includes(section)) return null;
	return [section as keyof DocumentTemplateConfiguration, key];
}

export const useDocumentTemplateStore = defineStore('documentTemplateStore', {
	state: () => ({
		summaries: [] as DocumentTemplateSummary[],
		selected: null as TemplateSelection | null,
		detail: null as DocumentTemplateDetail | null,
		baseline: deepFreeze(emptyConfiguration()) as DocumentTemplateConfiguration,
		draft: emptyConfiguration() as DocumentTemplateConfiguration,
		preview: null as EmailPreview | PdfPreview | null,
		revisions: [] as DocumentTemplateRevision[],
		isDirty: false,
		loading: false,
		saving: false,
		previewing: false,
		publishing: false,
		testing: false,
		resetting: false,
		restoring: false,
		conflict: null as { currentVersion: number } | null,
		fieldErrors: {} as Record<string, string>,
		error: null as string | null,
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
	}),
	getters: {
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

	resetSelection() {
			this.generation += 1;
			this.selectionEpoch += 1;
			this.saveGeneration += 1;
			this.previewGeneration += 1;
			this.publishGeneration += 1;
			this.mutationGeneration += 1;
			this.selected = null;
			this.detail = null;
			this.revisions = [];
			this.setBaseline(emptyConfiguration());
			this.conflict = null;
			this.fieldErrors = {};
			this.error = null;
			this.schedule = { startDate: null, endDate: null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
			this.clearPreview();
		},

		discardDraft() {
			this.draft = clone(this.baseline);
			this.conflict = null;
			this.fieldErrors = {};
			this.error = null;
			this.refreshDirty();
		},

		clearPreview() {
			if (this.preview?.channel === 'pdf') URL.revokeObjectURL(this.preview.objectUrl);
			this.preview = null;
		},

		dispose() {
			this.resetSelection();
		},

		async loadSummaries() {
			const request = ++this.summariesGeneration;
			this.loading = true;
			this.error = null;
			try {
				const { $api } = useNuxtApp();
				const response = await $api.documentTemplate.list();
				if (request === this.summariesGeneration) this.summaries = clone(response.document_templates ?? []);
			} catch (error) {
				if (request === this.summariesGeneration) this.error = error instanceof Error ? error.message : 'Failed to load document templates';
				throw error;
			} finally {
				if (request === this.summariesGeneration) this.loading = false;
			}
		},

		async loadDetail(channel: DocumentTemplateChannel, templateCode: string) {
			const selection = { channel, templateCode };
			this.resetSelection();
			const request = ++this.generation;
			const epoch = this.selectionEpoch;
			this.selected = selection;
			this.loading = true;
			this.error = null;
			this.conflict = null;
			this.fieldErrors = {};
			this.clearPreview();

			try {
				const { $api } = useNuxtApp();
				const response = await $api.documentTemplate.get(channel, templateCode);
				if (request !== this.generation || epoch !== this.selectionEpoch || !isSameSelection(this.selected, selection)) return;
				this.detail = clone(response);
				this.revisions = [response.draft_revision, response.latest_published_revision, response.active_revision]
					.filter((revision): revision is DocumentTemplateRevision => Boolean(revision))
					.map(clone);
				this.setBaseline(response.draft_revision?.configuration ?? response.configuration);
				const active = response.active_revision;
				this.schedule = {
					startDate: active?.start_date ? new Date(active.start_date) : null,
					endDate: active?.end_date ? new Date(active.end_date) : null,
					timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				};
			} catch (error) {
				if (request === this.generation && epoch === this.selectionEpoch) this.error = error instanceof Error ? error.message : String(error);
			} finally {
				if (request === this.generation && epoch === this.selectionEpoch) this.loading = false;
			}
		},

		async loadRevisions() {
			const selection = this.selected;
			if (!selection) return;
			const request = this.generation;
			try {
				const { $api } = useNuxtApp();
				const response = await $api.documentTemplate.listRevisions(selection.channel, selection.templateCode);
				if (request === this.generation && isSameSelection(this.selected, selection)) this.revisions = clone(response.revisions);
			} catch (error) {
				if (request === this.generation) this.error = error instanceof Error ? error.message : 'Failed to load revisions';
				throw error;
			}
		},

		setConfigurationPath(path: string, value: string | number) {
			const parts = pathParts(path);
			const field = this.detail?.fields.find(candidate => candidate.path === path);
			if (!parts || !field || (path === 'brand.logoAssetId' ? !(typeof value === 'number' && value > 0) : typeof value !== 'string')) return;
			if (typeof value === 'string' && !field.allow_blank && value === '') {
				this.fieldErrors = { ...this.fieldErrors, [path]: `${field.label} cannot be blank` };
				return;
			}
			if (typeof value === 'string' && value.length > field.max_length) {
				this.fieldErrors = { ...this.fieldErrors, [path]: `${field.label} is too long` };
				return;
			}

			const [section, key] = parts;
			const sectionValues = { ...(this.draft[section] as Record<string, string> | undefined), [key]: value };
			this.draft = { ...this.draft, [section]: sectionValues };
			const { [path]: _fieldError, ...fieldErrors } = this.fieldErrors;
			this.fieldErrors = fieldErrors;
			this.editGeneration += 1;
			this.refreshDirty();
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

		applyMutation(response: DocumentTemplateMutationResponse) {
			if (!this.detail) return;
			this.detail = { ...this.detail, version: response.version, draft_revision: clone(response.draft_revision) };
			this.setBaseline(response.draft_revision.configuration);
			this.revisions = [clone(response.draft_revision), ...this.revisions.filter(revision => revision.id !== response.draft_revision.id)];
			this.conflict = null;
		},

		readFieldErrors(error: ApiError) {
			this.fieldErrors = error.metadata?.field_errors ? { ...error.metadata.field_errors } : {};
		},

		async saveDraft() {
			const selection = this.selected;
			if (!selection || !this.detail || !this.canEdit || !this.isDirty) return;
			const request = ++this.saveGeneration;
			const mutation = ++this.mutationGeneration;
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
					this.detail = { ...this.detail!, version: response.version, draft_revision: clone(response.draft_revision) };
					this.baseline = deepFreeze(clone(response.draft_revision.configuration));
					if (this.editGeneration === editGeneration) this.draft = clone(response.draft_revision.configuration);
					this.refreshDirty();
					this.conflict = null;
				}
			} catch (error) {
				if (request === this.saveGeneration && mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					const apiError = error as ApiError;
					this.readFieldErrors(apiError);
					if ((apiError.statusCode ?? apiError.status) === 409 && typeof apiError.metadata?.current_version === 'number') {
						this.conflict = { currentVersion: apiError.metadata.current_version };
					} else {
						this.error = error instanceof Error ? error.message : 'Failed to save document template';
					}
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

		async previewDraft() {
			const selection = this.selected;
			if (!selection || !this.detail || !this.canEdit) return;
			const request = ++this.previewGeneration;
			this.previewing = true;
			await new Promise(resolve => setTimeout(resolve, 400));
			if (request !== this.previewGeneration || !isSameSelection(this.selected, selection)) {
				if (request === this.previewGeneration) this.previewing = false;
				return;
			}
			try {
				const { $api } = useNuxtApp();
				const body = { configuration: this.configurationForRequest() };
				if (selection.channel === 'email') {
					const response: PreviewEmailDocumentTemplateResponse = await $api.documentTemplate.previewEmail(selection.channel, selection.templateCode, body);
					if (request === this.previewGeneration && isSameSelection(this.selected, selection)) {
						this.clearPreview();
						this.preview = { channel: 'email', html: response.html, subject: response.subject, revisionId: response.revision_id, revisionNo: response.revision_no };
					}
				} else {
					const blob = await $api.documentTemplate.previewPdf(selection.channel, selection.templateCode, body);
					if (request === this.previewGeneration && isSameSelection(this.selected, selection)) {
						const objectUrl = URL.createObjectURL(blob);
						this.clearPreview();
						this.preview = { channel: 'pdf', blob, objectUrl };
					}
				}
			} catch (error) {
				if (request === this.previewGeneration && isSameSelection(this.selected, selection)) this.error = error instanceof Error ? error.message : 'Failed to preview document template';
			} finally {
				if (request === this.previewGeneration) this.previewing = false;
			}
		},

		async testSend() {
			const selection = this.selected;
			if (!selection || selection.channel !== 'email' || !this.canEdit) return;
			this.testing = true;
			try {
				const { $api } = useNuxtApp();
				await $api.documentTemplate.testSend(selection.channel, selection.templateCode, { configuration: this.configurationForRequest() });
			} catch (error) {
				if (isSameSelection(this.selected, selection)) this.error = error instanceof Error ? error.message : 'Failed to send test email';
			} finally {
				this.testing = false;
			}
		},

		async publish(revisionNo?: number) {
			const selection = this.selected;
			if (!selection || !this.detail || !this.canPublish) return;
			const targetRevisionNo = revisionNo ?? this.detail.draft_revision?.revision_no;
			if (targetRevisionNo === undefined) return;
			if (!this.scheduleIsValid) {
				this.error = 'Schedule start must be before its end';
				return;
			}
			const request = ++this.publishGeneration;
			const mutation = ++this.mutationGeneration;
			const epoch = this.selectionEpoch;
			const version = this.detail.version;
			this.publishing = true;
			try {
				const { $api } = useNuxtApp();
				const response: PublishDocumentTemplateResponse = await $api.documentTemplate.publish(selection.channel, selection.templateCode, {
					version,
					revision_no: targetRevisionNo,
					start_date: toUtcIsoOrNull(this.schedule.startDate),
					end_date: toUtcIsoOrNull(this.schedule.endDate),
				});
				if (request === this.publishGeneration && mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					this.detail = { ...this.detail!, version: response.version, latest_published_revision: clone(response.latest_published_revision), draft_revision: null };
					this.setBaseline(emptyConfiguration());
					this.revisions = [clone(response.latest_published_revision), ...this.revisions.filter(revision => revision.id !== response.latest_published_revision.id)];
				}
			} catch (error) {
				if (request === this.publishGeneration && mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					const apiError = error as ApiError;
					if ((apiError.statusCode ?? apiError.status) === 409 && typeof apiError.metadata?.current_version === 'number') this.conflict = { currentVersion: apiError.metadata.current_version };
					else this.error = error instanceof Error ? error.message : String(error);
				}
			} finally {
				if (request === this.publishGeneration && epoch === this.selectionEpoch) this.publishing = false;
			}
		},

		async reset() {
			const selection = this.selected;
			if (!selection || !this.detail || !this.canReset) return;
			const mutation = ++this.mutationGeneration;
			const epoch = this.selectionEpoch;
			this.resetting = true;
			try {
				const { $api } = useNuxtApp();
				const response = await $api.documentTemplate.reset(selection.channel, selection.templateCode, { version: this.detail.version });
				if (mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) this.applyMutation(response);
			} catch (error) {
				if (mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					const apiError = error as ApiError;
					if ((apiError.statusCode ?? apiError.status) === 409 && typeof apiError.metadata?.current_version === 'number') this.conflict = { currentVersion: apiError.metadata.current_version };
					else this.error = error instanceof Error ? error.message : String(error);
				}
			} finally {
				if (epoch === this.selectionEpoch && mutation === this.mutationGeneration) this.resetting = false;
			}
		},

		async resetTemplate() {
			await this.reset();
		},

		async restore(revisionNo: number) {
			const selection = this.selected;
			if (!selection || !this.detail || !this.canRestore) return;
			const mutation = ++this.mutationGeneration;
			const epoch = this.selectionEpoch;
			this.restoring = true;
			try {
				const { $api } = useNuxtApp();
				const response = await $api.documentTemplate.restore(selection.channel, selection.templateCode, revisionNo, { version: this.detail.version });
				if (mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) this.applyMutation(response);
			} catch (error) {
				if (mutation === this.mutationGeneration && epoch === this.selectionEpoch && isSameSelection(this.selected, selection)) {
					const apiError = error as ApiError;
					if ((apiError.statusCode ?? apiError.status) === 409 && typeof apiError.metadata?.current_version === 'number') this.conflict = { currentVersion: apiError.metadata.current_version };
					else this.error = error instanceof Error ? error.message : String(error);
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
