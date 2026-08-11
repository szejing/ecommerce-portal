<template>
	<ZPagePanel id="settings-templates" :title="t('nav.templateStudio')" back-to="/settings" grow>
		<div class="space-y-6 p-4 sm:p-6">
			<div class="space-y-2">
				<h1 class="text-2xl font-bold text-default sm:text-3xl">{{ t('nav.templateStudio') }}</h1>
				<p class="max-w-3xl text-sm text-muted sm:text-base">{{ t('pages.templateStudioDesc') }}</p>
			</div>

			<UAlert
				v-if="summaryError"
				color="error"
				variant="soft"
				icon="i-lucide-circle-alert"
				:title="t('components.templateStudio.loadError')"
				:description="summaryErrorDescription"
			/>

			<section v-if="summaries.length" data-testid="template-studio-shell" class="space-y-4">
				<div data-testid="template-navigation-region" class="min-w-0">
					<ZTemplateStudioTemplateNavigation :templates="summaries" :selected="selected" :template-label="templateLabel" @select="selectTemplate" />
				</div>

				<div class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)] xl:gap-6">
					<main data-testid="template-editor-region" class="min-w-0">
						<div
							v-if="conflict"
							data-testid="template-conflict"
							class="mb-4 flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="min-w-0">
								<p class="font-semibold text-default">{{ t('components.templateStudio.conflictTitle') }}</p>
								<p class="text-sm text-muted">{{ t('components.templateStudio.conflictDescription', { version: conflict.currentVersion }) }}</p>
							</div>
							<UButton
								data-action="reload-server-version"
								type="button"
								color="warning"
								variant="outline"
								icon="i-lucide-refresh-cw"
								@click="reloadServerVersion"
							>
								{{ t('components.templateStudio.reloadServerVersion') }}
							</UButton>
						</div>
						<UAlert
							v-else-if="actionErrorDescription"
							class="mb-4"
							color="error"
							variant="soft"
							icon="i-lucide-circle-alert"
							:title="t('components.templateStudio.actionErrorTitle')"
							:description="actionErrorDescription"
						/>
						<UAlert
							v-if="detailError"
							class="mb-4"
							color="error"
							variant="soft"
							icon="i-lucide-circle-alert"
							:title="t('components.templateStudio.loadDetailError')"
							:description="detailErrorDescription"
						/>
						<USkeleton v-if="loadingDetail" class="h-80 w-full rounded-xl" />
						<ZTemplateStudioTemplateEditor v-else v-model:active-tab="activeTab" :template-name="selectedSummary ? templateLabel(selectedSummary) : undefined">
							<template #actions>
								<UButton v-if="canEdit" data-action="save-draft" type="button" icon="i-lucide-save" :disabled="!isDirty" :loading="saving" @click="saveDraft">
									{{ t('components.templateStudio.saveDraft') }}
								</UButton>
								<UButton
									v-if="canEdit && selected?.channel === 'email'"
									data-action="test-send"
									type="button"
									color="neutral"
									variant="outline"
									icon="i-lucide-mail-check"
									:loading="testing"
									@click="testSend"
								>
									{{ t('components.templateStudio.sendTest') }}
								</UButton>
								<UButton
									v-if="canReset"
									data-action="reset"
									type="button"
									color="error"
									variant="outline"
									icon="i-lucide-rotate-ccw"
									:loading="resetting"
									@click="requestReset"
								>
									{{ t('components.templateStudio.resetToDefault') }}
								</UButton>
							</template>

							<template #content>
								<ZTemplateStudioContentEditor
									v-if="detail"
									:entry="detail"
									:model-value="draft"
									:field-errors="fieldErrors"
									@update:path="templateStore.setConfigurationPath"
								/>
							</template>
							<template #brand>
								<ZTemplateStudioBrandEditor
									v-if="detail"
									:fields="detail.fields"
									:model-value="draft"
									:inherited="detail.inherited_values"
									:system-defaults="detail.catalog_default_values"
									:logo-url="storeThumbnailUrl"
									:field-errors="fieldErrors"
									@update:path="templateStore.setConfigurationPath"
									@clear:path="templateStore.clearConfigurationOverride"
								/>
							</template>
							<template v-if="canPublish" #administration>
								<ZTemplateStudioActivationWindow
									:start-date="schedule.startDate"
									:end-date="schedule.endDate"
									:timezone="schedule.timezone"
									:disabled="publishDisabled"
									:disabled-reason="publishDisabledReason"
									:loading="publishing"
									@confirm="requestPublish"
								/>
							</template>
						</ZTemplateStudioTemplateEditor>
					</main>

					<aside data-testid="template-preview-region" class="min-w-0 self-start xl:sticky xl:top-4">
						<ZTemplateStudioTemplatePreview
							:channel="selected?.channel ?? 'email'"
							:preview="preview"
							:loading="previewing"
							:stale="previewStale"
							@refresh="refreshPreview"
						/>
					</aside>
				</div>
			</section>

			<UCard v-else-if="!summaryError">
				<div class="flex min-h-52 flex-col items-center justify-center gap-3 py-8 text-center">
					<UIcon name="i-lucide-files" class="size-10 text-muted" />
					<p class="text-sm text-muted">{{ t('components.templateStudio.noTemplates') }}</p>
				</div>
			</UCard>
		</div>
	</ZPagePanel>
</template>

<script setup lang="ts">
import { ZModalConfirmation, ZModalLeavePageConfirmation } from '#components';
import { GROUP_CODE, MERCHANT } from 'yeppi-common';
import { useDocumentTemplateStore } from '~/stores/DocumentTemplate/DocumentTemplate';
import { useMerchantInfoStore } from '~/stores/MerchantInfo/MerchantInfo';
import type { DocumentTemplateSummary } from '~/utils/types/document-template';

const { t, te } = useI18n();
const route = useRoute();
const router = useRouter();
const overlay = useOverlay();
const templateStore = useDocumentTemplateStore();
const merchantInfoStore = useMerchantInfoStore();
const {
	summaries,
	selected,
	detail,
	draft,
	preview,
	previewStale,
	isDirty,
	loadingDetail,
	summaryError,
	detailError,
	error,
	conflict,
	fieldErrors,
	schedule,
	saving,
	previewing,
	publishing,
	testing,
	resetting,
	canEdit,
	canPublish,
	canReset,
} = storeToRefs(templateStore);
const activeTab = ref('content');
const templateUpdateConfirmed = ref(false);
let isActive = true;
let storeDisposed = false;
let initialLoadSettled = false;
let initialRouteSyncPending = false;
let selectionOperation = 0;

useHead({ title: () => t('pages.templateStudioTitle') });

const storeThumbnailUrl = computed(() => {
	if (typeof draft.value?.brand?.logoAssetId === 'number') return undefined;
	const url = merchantInfoStore.getMerchantInfo(GROUP_CODE.INFO, MERCHANT.THUMBNAIL)?.getString()?.trim();
	return url || undefined;
});

const selectedSummary = computed(() =>
	summaries.value.find((template) => template.channel === selected.value?.channel && template.template_code === selected.value?.templateCode),
);
const summaryErrorDescription = computed(() =>
	summaryError.value === 'Failed to load document templates' ? t('components.templateStudio.loadErrorDescription') : (summaryError.value ?? undefined),
);
const detailErrorDescription = computed(() =>
	detailError.value === 'Failed to load document template' ? t('components.templateStudio.loadDetailErrorDescription') : (detailError.value ?? undefined),
);
const actionErrorKeys: Record<string, string> = {
	'Failed to save document template': 'components.templateStudio.saveError',
	'Failed to preview document template': 'components.templateStudio.previewError',
	'Failed to send test document template': 'components.templateStudio.testSendError',
	'Failed to publish document template': 'components.templateStudio.publishError',
	'Failed to reset document template': 'components.templateStudio.resetError',
	'Save draft before publishing': 'components.templateStudio.saveBeforePublishing',
	'Schedule date is invalid': 'components.templateStudio.scheduleInvalidDate',
	'Schedule start must be before its end': 'components.templateStudio.scheduleEndAfterStart',
	'Schedule end must be in the future': 'components.templateStudio.scheduleEndFuture',
};
const actionErrorDescription = computed(() => {
	if (!error.value || conflict.value) return undefined;
	return t(actionErrorKeys[error.value] ?? 'components.templateStudio.actionErrorDescription');
});
const publishDisabled = computed(() => isDirty.value || !detail.value?.draft_revision);
const publishDisabledReason = computed(() => {
	if (isDirty.value) return t('components.templateStudio.saveBeforePublishing');
	if (!detail.value?.draft_revision) return t('components.templateStudio.saveDraftBeforePublishing');
	return undefined;
});

function queryString(value: unknown): string | undefined {
	const candidate = Array.isArray(value) ? value[0] : value;
	return typeof candidate === 'string' && candidate.length ? candidate : undefined;
}

function templateLabel(template: DocumentTemplateSummary): string {
	const templateCode = template.template_code.replaceAll('-', '_');
	const key = `components.templateStudio.templateNames.${template.channel}_${templateCode}`;
	return te(key) ? t(key) : template.display_name;
}

function requestedTemplate(query = route.query): DocumentTemplateSummary | undefined {
	const channel = queryString(query.channel);
	const templateCode = queryString(query.template);
	return (
		summaries.value.find((template) => template.editable && template.channel === channel && template.template_code === templateCode) ??
		summaries.value.find((template) => template.editable)
	);
}

async function selectTemplate(template: DocumentTemplateSummary): Promise<void> {
	const operation = ++selectionOperation;
	if (!isActive || !template.editable) return;
	const channel = template.channel;
	const queryMatches = queryString(route.query.channel) === channel && queryString(route.query.template) === template.template_code;
	if (!queryMatches) {
		await router.replace({
			query: { ...route.query, channel, template: template.template_code },
		});
		if (
			!isActive ||
			operation !== selectionOperation ||
			queryString(route.query.channel) !== channel ||
			queryString(route.query.template) !== template.template_code
		)
			return;
	}
	if (!isActive || operation !== selectionOperation) return;
	if (selected.value?.channel === channel && selected.value.templateCode === template.template_code) return;
	activeTab.value = 'content';
	await templateStore.loadDetail(channel, template.template_code);
	if (!selectionMatches(channel, template.template_code)) return;
	void templateStore.previewDraft();
}

async function syncSelectionFromRoute(): Promise<void> {
	if (!isActive) return;
	const template = requestedTemplate();
	if (template) await selectTemplate(template);
}

function disposeTemplateStore(): void {
	if (storeDisposed) return;
	storeDisposed = true;
	templateStore.dispose();
}

onScopeDispose(() => {
	isActive = false;
	selectionOperation += 1;
	disposeTemplateStore();
});

useLeavePageGuard(isDirty, {
	onLeave: () => {
		selectionOperation += 1;
		disposeTemplateStore();
	},
});

function openConfirmation(title: string, message: string, action: () => Promise<void>): void {
	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			title,
			message,
			onConfirm: async () => {
				try {
					await action();
				} finally {
					confirmModal.close();
				}
			},
			onCancel: () => confirmModal.close(),
		},
	});
	confirmModal.open();
}

function selectionMatches(channel: string, templateCode: string): boolean {
	return isActive && selected.value?.channel === channel && selected.value.templateCode === templateCode;
}

function requestPublish(window: { startDate: Date | null; endDate: Date | null }): void {
	const preparation = templateStore.preparePublish(window);
	if (preparation.status === 'rejected') return;
	openConfirmation(
		t(preparation.scheduled ? 'components.templateStudio.scheduleConfirmTitle' : 'components.templateStudio.publishConfirmTitle'),
		t(preparation.scheduled ? 'components.templateStudio.scheduleConfirmMessage' : 'components.templateStudio.publishConfirmMessage', {
			number: preparation.intent.revisionNo,
		}),
		async () => { await templateStore.confirmPublish(preparation.intent); },
	);
}

function requestReset(): void {
	const selection = selected.value;
	const version = detail.value?.version;
	const previousDraftId = detail.value?.draft_revision?.id;
	if (!selection || version === undefined) return;
	openConfirmation(t('components.templateStudio.resetConfirmTitle'), t('components.templateStudio.resetConfirmMessage'), async () => {
		if (!selectionMatches(selection.channel, selection.templateCode) || detail.value?.version !== version) return;
		await templateStore.resetTemplate();
		if (!conflict.value && detail.value?.draft_revision?.id !== previousDraftId && !isDirty.value) activeTab.value = 'content';
		if (selectionMatches(selection.channel, selection.templateCode)) void templateStore.previewDraft();
	});
}

async function saveDraft(): Promise<void> {
	await templateStore.saveDraft();
}

async function testSend(): Promise<void> {
	await templateStore.testSend();
}

async function refreshPreview(): Promise<void> {
	if (isActive) await templateStore.refreshPreview();
}

async function reloadServerVersion(): Promise<void> {
	await templateStore.reloadAfterConflict();
	if (!conflict.value) activeTab.value = 'content';
}

onBeforeRouteUpdate((to, from, next) => {
	const templateChanged =
		queryString(to.query.channel) !== queryString(from.query.channel) || queryString(to.query.template) !== queryString(from.query.template);
	if (templateUpdateConfirmed.value || !templateChanged || !isDirty.value) {
		templateUpdateConfirmed.value = false;
		next();
		return;
	}

	next(false);
	const targetTemplate = requestedTemplate(to.query);
	const target = targetTemplate
		? {
				path: to.path,
				query: { ...to.query, channel: targetTemplate.channel, template: targetTemplate.template_code },
				hash: to.hash,
			}
		: to.fullPath;
	const leaveModal = overlay.create(ZModalLeavePageConfirmation, {
		props: {
			title: t('components.templateStudio.changeTemplateTitle'),
			message: t('components.templateStudio.changeTemplateMessage'),
			onStay: () => leaveModal.close(),
			onLeave: () => {
				if (!isActive) return;
				templateUpdateConfirmed.value = true;
				leaveModal.close();
				void router.replace(target).finally(() => {
					templateUpdateConfirmed.value = false;
				});
			},
		},
	});
	leaveModal.open();
});

watch(
	() => [route.query.channel, route.query.template, summaries.value],
	(next, previous) => {
		if (!initialLoadSettled) {
			const queryChanged = queryString(next[0]) !== queryString(previous[0]) || queryString(next[1]) !== queryString(previous[1]);
			if (queryChanged) initialRouteSyncPending = true;
			return;
		}
		void syncSelectionFromRoute();
	},
);

const initialSelectionOperation = selectionOperation;
try {
	await templateStore.loadSummaries();
	if (isActive && initialSelectionOperation === selectionOperation) await syncSelectionFromRoute();
} catch {
	// The store exposes a translated shell-safe error region while preserving retry state for later tasks.
} finally {
	initialLoadSettled = true;
	if (isActive && initialRouteSyncPending) {
		initialRouteSyncPending = false;
		void syncSelectionFromRoute();
	}
}
</script>
