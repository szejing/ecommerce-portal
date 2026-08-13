import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { UserRoles } from 'yeppi-common';
import { useAuthStore } from '~/stores/Auth/Auth';
import { toUtcIsoOrNull } from '~/utils/document-template';
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
import {
	activationError,
	clone,
	deduplicateRevisions,
	deepFreeze,
	getApiErrorMessage,
	getApiErrorMetadataValue,
	getApiErrorStatus,
	isBlobResponse,
	isRevisionEligibleNow,
	isSameSelection,
	mergePostDispatchEdits,
	pathParts,
	stableSerialize,
	type TemplateStudioError,
	type TemplateStudioErrorCode,
} from './document-template-internals';

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

const emptyConfiguration = (): DocumentTemplateConfiguration => ({});
const currentTimezone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Debounce for live email preview while typing. PDF previews stay refresh-only. */
export type { TemplateStudioError, TemplateStudioErrorCode } from './document-template-internals';

/** Debounce for live email preview while typing. PDF previews stay refresh-only. */
export const EMAIL_PREVIEW_DEBOUNCE_MS = 800;

export const useDocumentTemplateStore = defineStore('documentTemplateStore', () => {
	const summaries = ref<DocumentTemplateSummary[]>([]);
	const selected = ref<TemplateSelection | null>(null);
	const detail = ref<DocumentTemplateDetail | null>(null);
	const baseline = ref<DocumentTemplateConfiguration>(deepFreeze(emptyConfiguration()));
	const draft = ref<DocumentTemplateConfiguration>(emptyConfiguration());
	const preview = ref<EmailPreview | PdfPreview | null>(null);
	const previewStale = ref(false);
	const revisions = ref<DocumentTemplateRevision[]>([]);
	const isDirty = ref(false);
	const loadingSummaries = ref(false);
	const loadingDetail = ref(false);
	const saving = ref(false);
	const previewing = ref(false);
	const publishing = ref(false);
	const testing = ref(false);
	const resetting = ref(false);
	const restoring = ref(false);
	const conflict = ref<{ currentVersion: number } | null>(null);
	const fieldErrors = ref<Record<string, string>>({});
	const error = ref<TemplateStudioError | null>(null);
	const summaryError = ref<TemplateStudioError | null>(null);
	const detailError = ref<TemplateStudioError | null>(null);
	const schedule = ref<TemplateSchedule>({ startDate: null, endDate: null, timezone: currentTimezone() });

	let generation = 0;
	let selectionEpoch = 0;
	let editGeneration = 0;
	let mutationGeneration = 0;
	let summariesGeneration = 0;
	let saveGeneration = 0;
	let previewGeneration = 0;
	let publishGeneration = 0;
	let revisionsGeneration = 0;
	let testGeneration = 0;
	let previewedConfigurationKey: string | null = null;
	let previewTimer: ReturnType<typeof setTimeout> | null = null;
	const publishIntentSnapshots = new WeakMap<TemplatePublishIntent, TemplatePublishIntent>();

	const loading = computed(() => loadingSummaries.value || loadingDetail.value);
	const canEdit = computed(() => {
		const role = useAuthStore().user?.role;
		return role === UserRoles.MERCHANT_STAFF || role === UserRoles.MERCHANT_ADMIN || role === UserRoles.SUPER_STAFF || role === UserRoles.SUPER_ADMIN;
	});
	const canPublish = computed(() => {
		const role = useAuthStore().user?.role;
		return role === UserRoles.MERCHANT_ADMIN || role === UserRoles.SUPER_ADMIN;
	});
	const canRestore = computed(() => canPublish.value);
	const canReset = computed(() => canPublish.value);

	function cancelPreviewTimer(): void {
		if (previewTimer === null) return;
		clearTimeout(previewTimer);
		previewTimer = null;
	}

	function refreshDirty(): void {
		isDirty.value = stableSerialize(draft.value) !== stableSerialize(baseline.value);
	}

	function setBaseline(configuration: DocumentTemplateConfiguration): void {
		baseline.value = deepFreeze(clone(configuration));
		draft.value = clone(configuration);
		refreshDirty();
	}

	function clearPreview(): void {
		const objectUrl = preview.value?.channel === 'pdf' ? preview.value.objectUrl : null;
		preview.value = null;
		previewStale.value = false;
		previewedConfigurationKey = null;
		if (objectUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
			try {
				URL.revokeObjectURL(objectUrl);
			} catch {
				// The preview is already cleared; URL cleanup is best-effort in non-browser runtimes.
			}
		}
	}

	function resetDetailSelection(): void {
		generation += 1;
		selectionEpoch += 1;
		saveGeneration += 1;
		previewGeneration += 1;
		publishGeneration += 1;
		mutationGeneration += 1;
		revisionsGeneration += 1;
		testGeneration += 1;
		cancelPreviewTimer();
		loadingDetail.value = false;
		saving.value = false;
		previewing.value = false;
		publishing.value = false;
		testing.value = false;
		resetting.value = false;
		restoring.value = false;
		selected.value = null;
		detail.value = null;
		revisions.value = [];
		setBaseline(emptyConfiguration());
		conflict.value = null;
		fieldErrors.value = {};
		error.value = null;
		detailError.value = null;
		schedule.value = { startDate: null, endDate: null, timezone: currentTimezone() };
		clearPreview();
	}

	function resetSelection(): void {
		resetDetailSelection();
		summariesGeneration += 1;
		loadingSummaries.value = false;
		summaryError.value = null;
	}

	function replacePreview(next: EmailPreview | PdfPreview): void {
		const previous = preview.value;
		preview.value = next;
		previewStale.value = false;
		if (previous?.channel === 'pdf' && (next.channel !== 'pdf' || previous.objectUrl !== next.objectUrl)) {
			if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
				try {
					URL.revokeObjectURL(previous.objectUrl);
				} catch {
					// Best-effort URL cleanup in non-browser runtimes.
				}
			}
		}
	}

	function dispose(): void {
		resetSelection();
	}

	function $reset(): void {
		dispose();
		summaries.value = [];
	}

	async function loadCatalog(): Promise<void> {
		const request = ++summariesGeneration;
		loadingSummaries.value = true;
		summaryError.value = null;
		try {
			const { $api } = useNuxtApp();
			const response = await $api.documentTemplate.list();
			if (request === summariesGeneration) summaries.value = clone(response.document_templates ?? []);
		} catch (caught) {
			if (request === summariesGeneration) summaryError.value = fail('load_detail_failed', caught, 'Failed to load document templates');
			throw caught;
		} finally {
			if (request === summariesGeneration) loadingSummaries.value = false;
		}
	}

	async function loadDetail(channel: DocumentTemplateChannel, templateCode: string): Promise<boolean> {
		const selection = { channel, templateCode };
		resetDetailSelection();
		const request = ++generation;
		const epoch = selectionEpoch;
		selected.value = selection;
		loadingDetail.value = true;
		detailError.value = null;
		conflict.value = null;
		fieldErrors.value = {};
		clearPreview();
		try {
			const { $api } = useNuxtApp();
			const response = await $api.documentTemplate.get(channel, templateCode);
			if (request !== generation || epoch !== selectionEpoch || !isSameSelection(selected.value, selection)) return false;
			detail.value = clone(response);
			revisions.value = deduplicateRevisions([response.draft_revision, response.latest_published_revision, response.active_revision]);
			setBaseline(response.draft_revision?.configuration ?? response.configuration);
			const active = response.active_revision;
			schedule.value = {
				startDate: active?.start_date ? new Date(active.start_date) : null,
				endDate: active?.end_date ? new Date(active.end_date) : null,
				timezone: currentTimezone(),
			};
			return true;
		} catch (caught) {
			if (request === generation && epoch === selectionEpoch) detailError.value = fail('load_detail_failed', caught, 'Failed to load document template');
			return false;
		} finally {
			if (request === generation && epoch === selectionEpoch) loadingDetail.value = false;
		}
	}

	async function openTemplate(channel: DocumentTemplateChannel, templateCode: string): Promise<void> {
		const selection = { channel, templateCode };
		if (!await loadDetail(channel, templateCode)) return;
		if (!detail.value || !isSameSelection(selected.value, selection)) return;
		await requestPreview({ force: true });
	}

	async function loadRevisions(): Promise<void> {
		const selection = selected.value;
		if (!selection) return;
		const request = ++revisionsGeneration;
		const epoch = selectionEpoch;
		try {
			const { $api } = useNuxtApp();
			const response = await $api.documentTemplate.listRevisions(selection.channel, selection.templateCode);
			if (request === revisionsGeneration && epoch === selectionEpoch && isSameSelection(selected.value, selection)) revisions.value = clone(response.revisions);
		} catch (caught) {
			if (request === revisionsGeneration && epoch === selectionEpoch) error.value = fail('load_detail_failed', caught, 'Failed to load document template revisions');
		}
	}

	function schedulePreviewAfterEdit(): void {
		if (!selected.value || !detail.value) return;
		previewGeneration += 1;
		cancelPreviewTimer();
		const configurationKey = `${selected.value.channel}:${selected.value.templateCode}:${stableSerialize(configurationForRequest())}`;
		if (selected.value.channel === 'pdf') {
			previewStale.value = Boolean(preview.value) && previewedConfigurationKey !== configurationKey;
			previewing.value = false;
			return;
		}
		if (preview.value && previewedConfigurationKey === configurationKey) {
			previewStale.value = false;
			previewing.value = false;
			return;
		}
		previewing.value = true;
		previewTimer = setTimeout(() => {
			previewTimer = null;
			void requestPreview({ force: false });
		}, EMAIL_PREVIEW_DEBOUNCE_MS);
	}

	function setConfigurationPath(path: string, value: string | number): void {
		const parts = pathParts(path);
		const field = detail.value?.fields.find(candidate => candidate.path === path);
		if (!parts || !field || (path === 'brand.logoAssetId' ? !(typeof value === 'number' && value > 0) : typeof value !== 'string')) return;
		if (typeof value === 'string' && value.length > field.max_length) {
			fieldErrors.value = { ...fieldErrors.value, [path]: `${field.label} is too long` };
			return;
		}
		const [section, key] = parts;
		const sectionValues = { ...(draft.value[section] as Record<string, string> | undefined), [key]: value };
		draft.value = { ...draft.value, [section]: sectionValues };
		if (typeof value === 'string' && !field.allow_blank && value === '') {
			fieldErrors.value = { ...fieldErrors.value, [path]: `${field.label} cannot be blank` };
		} else {
			const { [path]: _fieldError, ...nextFieldErrors } = fieldErrors.value;
			fieldErrors.value = nextFieldErrors;
		}
		editGeneration += 1;
		refreshDirty();
		schedulePreviewAfterEdit();
	}

	function clearConfigurationOverride(path: string): void {
		const parts = pathParts(path);
		if (!parts || !detail.value?.fields.some(field => field.path === path)) return;
		const [section, key] = parts;
		const sectionValues = { ...(draft.value[section] as Record<string, string> | undefined) };
		Reflect.deleteProperty(sectionValues, key);
		const nextDraft = { ...draft.value };
		if (Object.keys(sectionValues).length) nextDraft[section] = sectionValues as never;
		else Reflect.deleteProperty(nextDraft, section);
		draft.value = nextDraft;
		editGeneration += 1;
		refreshDirty();
		schedulePreviewAfterEdit();
	}

	function setBlockEnabled(id: string, enabled: boolean): void {
		const descriptor = detail.value?.blocks.find(block => block.id === id);
		if (!descriptor) return;
		const existing = new Map((draft.value.blocks ?? []).map(block => [block.id, block]));
		existing.set(id, { id, enabled: descriptor.required ? true : enabled, props: {} });
		draft.value = {
			...draft.value,
			blocks: detail.value!.blocks.map(block => ({
				id: block.id,
				enabled: block.required ? true : (existing.get(block.id)?.enabled ?? block.default_enabled),
				props: {},
			})),
		};
		editGeneration += 1;
		refreshDirty();
		schedulePreviewAfterEdit();
	}

	function configurationForRequest(): DocumentTemplateConfiguration {
		const fields = new Set(detail.value?.fields.map(field => field.path) ?? []);
		const configuration: DocumentTemplateConfiguration = {};
		(['brand', 'merchantInfo', 'content'] as const).forEach(section => {
			const values = draft.value[section] as Record<string, unknown> | undefined;
			if (!values) return;
			const filtered = Object.fromEntries(Object.entries(values).filter(([key, value]) => (
				fields.has(`${section}.${key}`)
				|| (section === 'brand' && key === 'logoAssetId')
			) && (typeof value === 'string' || (section === 'brand' && key === 'logoAssetId' && typeof value === 'number' && value > 0))));
			if (Object.keys(filtered).length) configuration[section] = filtered as never;
		});
		if (detail.value && draft.value.blocks !== undefined) {
			const blocks = new Map((draft.value.blocks ?? []).map(block => [block.id, block]));
			configuration.blocks = detail.value.blocks.map(block => ({
				id: block.id,
				enabled: block.required ? true : (blocks.get(block.id)?.enabled ?? block.default_enabled),
				props: {},
			}));
		}
		return configuration;
	}

	function applyDraftRevision(revision: DocumentTemplateRevision): void {
		const nextRevision = clone(revision);
		const retained: DocumentTemplateRevision[] = [];
		const ids = new Set([nextRevision.id]);
		for (const current of revisions.value) {
			if (ids.has(current.id) || current.status === 'draft') continue;
			ids.add(current.id);
			retained.push(clone(current));
		}
		revisions.value = [nextRevision, ...retained];
	}

	function applyPublishedRevision(revision: DocumentTemplateRevision, consumedRevisionNo: number): void {
		const published = clone(revision);
		const retained: DocumentTemplateRevision[] = [];
		const ids = new Set([published.id]);
		for (const current of revisions.value) {
			if (ids.has(current.id) || (current.status === 'draft' && current.revision_no === consumedRevisionNo)) continue;
			ids.add(current.id);
			retained.push(current.status === 'draft' ? { ...clone(current), status: 'archived' } : clone(current));
		}
		revisions.value = [published, ...retained];
	}

	function applyMutation(
		response: DocumentTemplateMutationResp,
		submittedEditGeneration: number,
		submittedDraft?: DocumentTemplateConfiguration,
	): void {
		if (!detail.value) return;
		detail.value = { ...detail.value, version: response.version, draft_revision: clone(response.draft_revision) };
		baseline.value = deepFreeze(clone(response.draft_revision.configuration));
		if (editGeneration === submittedEditGeneration) draft.value = clone(response.draft_revision.configuration);
		else if (submittedDraft) draft.value = mergePostDispatchEdits(response.draft_revision.configuration, submittedDraft, draft.value);
		refreshDirty();
		applyDraftRevision(response.draft_revision);
		conflict.value = null;
	}

	function readFieldErrors(caught: unknown): void {
		const nextFieldErrors = getApiErrorMetadataValue(caught, 'field_errors');
		fieldErrors.value = nextFieldErrors && typeof nextFieldErrors === 'object'
			? Object.fromEntries(Object.entries(nextFieldErrors).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
			: {};
	}

	function fail(code: TemplateStudioErrorCode, caught?: unknown, fallback?: string): TemplateStudioError {
		if (caught === undefined) return { code };
		const transportMessage = getApiErrorMessage(caught, fallback ?? code);
		return transportMessage && transportMessage !== fallback && transportMessage !== code ? { code, transportMessage } : { code };
	}

	function readConflict(caught: unknown): boolean {
		const currentVersion = getApiErrorMetadataValue(caught, 'current_version');
		if (getApiErrorStatus(caught) !== 409 || typeof currentVersion !== 'number') return false;
		conflict.value = { currentVersion };
		return true;
	}

	async function saveDraft(): Promise<void> {
		const selection = selected.value;
		if (!selection || !detail.value || !canEdit.value || !isDirty.value) return;
		const request = ++saveGeneration;
		const mutation = ++mutationGeneration;
		revisionsGeneration += 1;
		publishing.value = false;
		resetting.value = false;
		restoring.value = false;
		const epoch = selectionEpoch;
		const submittedEditGeneration = editGeneration;
		const version = detail.value.version;
		const configuration = configurationForRequest();
		saving.value = true;
		error.value = null;
		fieldErrors.value = {};
		try {
			const { $api } = useNuxtApp();
			const response = await $api.documentTemplate.saveDraft(selection.channel, selection.templateCode, { version, configuration });
			if (request === saveGeneration && mutation === mutationGeneration && epoch === selectionEpoch && isSameSelection(selected.value, selection)) {
				applyMutation(response, submittedEditGeneration);
				await loadRevisions();
			}
		} catch (caught) {
			if (request === saveGeneration && mutation === mutationGeneration && epoch === selectionEpoch && isSameSelection(selected.value, selection)) {
				readFieldErrors(caught);
				if (!readConflict(caught)) error.value = fail('save_failed', caught, 'Failed to save document template');
			}
		} finally {
			if (request === saveGeneration && epoch === selectionEpoch) saving.value = false;
		}
	}

	async function reloadServerVersion(): Promise<void> {
		const selection = selected.value;
		if (!selection) return;
		await openTemplate(selection.channel, selection.templateCode);
	}

	async function requestPreview(options: { force?: boolean } = {}): Promise<void> {
		const selection = selected.value;
		if (!selection || !detail.value || !canEdit.value) return;
		cancelPreviewTimer();
		const request = ++previewGeneration;
		const force = options.force ?? true;
		previewing.value = true;
		error.value = null;
		const configuration = configurationForRequest();
		const configurationKey = `${selection.channel}:${selection.templateCode}:${stableSerialize(configuration)}`;
		if (!force && preview.value && previewedConfigurationKey === configurationKey) {
			previewStale.value = false;
			previewing.value = false;
			return;
		}
		try {
			const { $api } = useNuxtApp();
			const body = { configuration };
			if (selection.channel === 'email') {
				const response: PreviewEmailDocumentTemplateResp = await $api.documentTemplate.previewEmail(selection.channel, selection.templateCode, body);
				if (request === previewGeneration && isSameSelection(selected.value, selection)) {
					replacePreview({
						channel: 'email',
						html: response.html,
						subject: response.subject,
						revisionId: response.revision_id,
						revisionNo: response.revision_no,
					});
					previewedConfigurationKey = configurationKey;
				}
			} else {
				const blob = await $api.documentTemplate.previewPdf(selection.channel, selection.templateCode, body);
				if (request === previewGeneration && isSameSelection(selected.value, selection)) {
					if (!isBlobResponse(blob)) throw new TypeError('Invalid PDF preview response');
					if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function' || typeof URL.revokeObjectURL !== 'function') {
						throw new TypeError('PDF previews are unavailable in this environment');
					}
					const objectUrl = URL.createObjectURL(blob);
					replacePreview({ channel: 'pdf', blob, objectUrl });
					previewedConfigurationKey = configurationKey;
				}
			}
		} catch (caught) {
			if (request === previewGeneration && isSameSelection(selected.value, selection)) {
				previewStale.value = Boolean(preview.value);
				error.value = fail('preview_failed', caught, 'Failed to preview document template');
			}
		} finally {
			if (request === previewGeneration) previewing.value = false;
		}
	}

	async function refreshPreview(): Promise<void> {
		await requestPreview({ force: true });
	}

	async function sendTest(): Promise<void> {
		const selection = selected.value;
		if (!selection || !detail.value || selection.channel !== 'email' || !canEdit.value) return;
		const request = ++testGeneration;
		const epoch = selectionEpoch;
		testing.value = true;
		error.value = null;
		try {
			const { $api } = useNuxtApp();
			await $api.documentTemplate.testSend(selection.channel, selection.templateCode, { configuration: configurationForRequest() });
		} catch (caught) {
			if (request === testGeneration && epoch === selectionEpoch && isSameSelection(selected.value, selection)) {
				error.value = fail('test_send_failed', caught, 'Failed to send test document template');
			}
		} finally {
			if (request === testGeneration && epoch === selectionEpoch) testing.value = false;
		}
	}

	function preparePublish(window: TemplateActivationWindow): TemplatePublishPreparation {
		const selection = selected.value;
		const draftRevision = detail.value?.draft_revision;
		if (!selection || !draftRevision || !canPublish.value) return { status: 'rejected' };
		if (isDirty.value) {
			error.value = fail('save_before_publish');
			return { status: 'rejected' };
		}
		const activation = {
			startDate: window.startDate ? new Date(window.startDate) : null,
			endDate: window.endDate ? new Date(window.endDate) : null,
		};
		const validationError = activationError(activation);
		if (validationError) {
			error.value = fail(validationError);
			return { status: 'rejected' };
		}
		const intent: TemplatePublishIntent = {
			...selection,
			revisionId: draftRevision.id,
			revisionNo: draftRevision.revision_no,
			...activation,
		};
		publishIntentSnapshots.set(intent, {
			...intent,
			startDate: intent.startDate ? new Date(intent.startDate) : null,
			endDate: intent.endDate ? new Date(intent.endDate) : null,
		});
		return {
			status: 'ready',
			scheduled: activation.startDate !== null || activation.endDate !== null,
			intent,
		};
	}

	async function publish(revisionNo: number): Promise<TemplateMutationOutcome> {
		const selection = selected.value;
		if (!selection || !detail.value || !canPublish.value) return 'stale';
		const request = ++publishGeneration;
		const mutation = ++mutationGeneration;
		revisionsGeneration += 1;
		saving.value = false;
		resetting.value = false;
		restoring.value = false;
		const epoch = selectionEpoch;
		const submittedEditGeneration = editGeneration;
		const submitted = clone(draft.value);
		const version = detail.value.version;
		publishing.value = true;
		error.value = null;
		try {
			const { $api } = useNuxtApp();
			const response: PublishDocumentTemplateResp = await $api.documentTemplate.publish(selection.channel, selection.templateCode, {
				version,
				revision_no: revisionNo,
				start_date: toUtcIsoOrNull(schedule.value.startDate),
				end_date: toUtcIsoOrNull(schedule.value.endDate),
			});
			if (request !== publishGeneration || mutation !== mutationGeneration || epoch !== selectionEpoch || !isSameSelection(selected.value, selection)) return 'stale';
			const publishedConfiguration = response.latest_published_revision.configuration ?? submitted;
			const publishedRevision = clone(response.latest_published_revision);
			detail.value = {
				...detail.value!,
				version: response.version,
				latest_published_revision: publishedRevision,
				active_revision: isRevisionEligibleNow(publishedRevision) ? clone(publishedRevision) : detail.value!.active_revision,
				draft_revision: null,
			};
			baseline.value = deepFreeze(clone(publishedConfiguration));
			if (editGeneration === submittedEditGeneration) draft.value = clone(publishedConfiguration);
			refreshDirty();
			applyPublishedRevision(response.latest_published_revision, revisionNo);
			conflict.value = null;
			return 'completed';
		} catch (caught) {
			if (request === publishGeneration && mutation === mutationGeneration && epoch === selectionEpoch && isSameSelection(selected.value, selection)) {
				if (!readConflict(caught)) error.value = fail('publish_failed', caught, 'Failed to publish document template');
				return 'failed';
			}
			return 'stale';
		} finally {
			if (request === publishGeneration && epoch === selectionEpoch) publishing.value = false;
		}
	}

	async function confirmPublish(intent: TemplatePublishIntent): Promise<TemplateMutationOutcome> {
		const preparedIntent = publishIntentSnapshots.get(intent);
		if (!preparedIntent) return 'stale';
		publishIntentSnapshots.delete(intent);
		const validationError = activationError(preparedIntent);
		if (validationError) {
			error.value = fail(validationError);
			return 'failed';
		}
		const currentDraft = detail.value?.draft_revision;
		if (
			!isSameSelection(selected.value, preparedIntent)
			|| isDirty.value
			|| currentDraft?.id !== preparedIntent.revisionId
			|| currentDraft.revision_no !== preparedIntent.revisionNo
		) return 'stale';
		schedule.value = {
			...schedule.value,
			startDate: preparedIntent.startDate ? new Date(preparedIntent.startDate) : null,
			endDate: preparedIntent.endDate ? new Date(preparedIntent.endDate) : null,
		};
		return await publish(preparedIntent.revisionNo);
	}

	function prepareReset(): TemplateResetIntent | null {
		if (!selected.value || !detail.value || !canReset.value) return null;
		return {
			...selected.value,
			version: detail.value.version,
			draftRevisionId: detail.value.draft_revision?.id ?? null,
		};
	}

	async function resetTemplate(): Promise<TemplateMutationOutcome> {
		const selection = selected.value;
		if (!selection || !detail.value || !canReset.value) return 'stale';
		const mutation = ++mutationGeneration;
		revisionsGeneration += 1;
		saving.value = false;
		publishing.value = false;
		restoring.value = false;
		const epoch = selectionEpoch;
		const submittedEditGeneration = editGeneration;
		const submittedDraft = clone(draft.value);
		resetting.value = true;
		error.value = null;
		try {
			const { $api } = useNuxtApp();
			const response = await $api.documentTemplate.reset(selection.channel, selection.templateCode, { version: detail.value.version });
			if (mutation !== mutationGeneration || epoch !== selectionEpoch || !isSameSelection(selected.value, selection)) return 'stale';
			applyMutation(response, submittedEditGeneration, submittedDraft);
			await loadRevisions();
			return 'completed';
		} catch (caught) {
			if (mutation === mutationGeneration && epoch === selectionEpoch && isSameSelection(selected.value, selection)) {
				if (!readConflict(caught)) error.value = fail('reset_failed', caught, 'Failed to reset document template');
				return 'failed';
			}
			return 'stale';
		} finally {
			if (epoch === selectionEpoch && mutation === mutationGeneration) resetting.value = false;
		}
	}

	async function confirmReset(intent: TemplateResetIntent): Promise<TemplateMutationOutcome> {
		if (
			!isSameSelection(selected.value, intent)
			|| detail.value?.version !== intent.version
			|| (detail.value.draft_revision?.id ?? null) !== intent.draftRevisionId
		) return 'stale';
		const outcome = await resetTemplate();
		if (outcome === 'completed' && isSameSelection(selected.value, intent)) await refreshPreview();
		return outcome;
	}

	async function restoreRevision(revisionNo: number): Promise<void> {
		const selection = selected.value;
		if (!selection || !detail.value || !canRestore.value) return;
		const mutation = ++mutationGeneration;
		revisionsGeneration += 1;
		saving.value = false;
		publishing.value = false;
		resetting.value = false;
		const epoch = selectionEpoch;
		const submittedEditGeneration = editGeneration;
		const submittedDraft = clone(draft.value);
		restoring.value = true;
		error.value = null;
		try {
			const { $api } = useNuxtApp();
			const response = await $api.documentTemplate.restore(selection.channel, selection.templateCode, revisionNo, { version: detail.value.version });
			if (mutation === mutationGeneration && epoch === selectionEpoch && isSameSelection(selected.value, selection)) {
				applyMutation(response, submittedEditGeneration, submittedDraft);
				await loadRevisions();
			}
		} catch (caught) {
			if (mutation === mutationGeneration && epoch === selectionEpoch && isSameSelection(selected.value, selection)) {
				if (!readConflict(caught)) error.value = fail('reset_failed', caught, 'Failed to restore document template revision');
			}
		} finally {
			if (epoch === selectionEpoch && mutation === mutationGeneration) restoring.value = false;
		}
	}

	return {
		summaries,
		selected,
		detail,
		draft,
		preview,
		previewStale,
		revisions,
		isDirty,
		loadingSummaries,
		loadingDetail,
		saving,
		previewing,
		publishing,
		testing,
		resetting,
		restoring,
		conflict,
		fieldErrors,
		error,
		summaryError,
		detailError,
		schedule,
		loading,
		canEdit,
		canPublish,
		canRestore,
		canReset,
		$reset,
		loadCatalog,
		openTemplate,
		setConfigurationPath,
		clearConfigurationOverride,
		setBlockEnabled,
		saveDraft,
		refreshPreview,
		sendTest,
		preparePublish,
		confirmPublish,
		prepareReset,
		confirmReset,
		reloadServerVersion,
		restoreRevision,
		dispose,
	};
});
