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

			<div
				v-if="summaries.length"
				data-testid="template-studio-shell"
				class="grid min-w-0 gap-4 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(19rem,24rem)] xl:gap-6"
			>
				<aside data-testid="template-navigation-region" class="min-w-0 xl:self-start">
					<UCard :ui="{ body: 'p-3 sm:p-3' }">
						<ZTemplateStudioTemplateNavigation
							:templates="summaries"
							:selected="selected"
							:template-label="templateLabel"
							@select="selectTemplate"
						/>
					</UCard>
				</aside>

				<main data-testid="template-editor-region" class="min-w-0">
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
					<ZTemplateStudioTemplateEditor
						v-else
						:template-name="selectedSummary ? templateLabel(selectedSummary) : undefined"
					/>
				</main>

				<aside data-testid="template-preview-region" class="min-w-0 self-start xl:sticky xl:top-4">
					<UCard>
						<div class="flex min-h-64 flex-col items-center justify-center gap-3 py-8 text-center">
							<div class="flex size-12 items-center justify-center rounded-full bg-elevated">
								<UIcon name="i-lucide-panel-right" class="size-6 text-muted" />
							</div>
							<div class="space-y-1">
								<h2 class="font-semibold text-default">{{ t('components.templateStudio.preview') }}</h2>
								<p class="text-sm text-muted">{{ t('components.templateStudio.previewComingSoon') }}</p>
							</div>
						</div>
					</UCard>
				</aside>
			</div>

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
import { ZModalLeavePageConfirmation } from '#components';
import { useDocumentTemplateStore } from '~/stores/DocumentTemplate/DocumentTemplate';
import type { DocumentTemplateSummary } from '~/utils/types/document-template';

const { t, te } = useI18n();
const route = useRoute();
const router = useRouter();
const overlay = useOverlay();
const templateStore = useDocumentTemplateStore();
const { summaries, selected, isDirty, loadingDetail, summaryError, detailError } = storeToRefs(templateStore);
const templateUpdateConfirmed = ref(false);
let isActive = true;
let initialLoadSettled = false;
let selectionOperation = 0;

useHead({ title: () => t('pages.templateStudioTitle') });

const selectedSummary = computed(() => summaries.value.find(template =>
	template.channel === selected.value?.channel && template.template_code === selected.value?.templateCode,
));
const summaryErrorDescription = computed(() => summaryError.value === 'Failed to load document templates'
	? t('components.templateStudio.loadErrorDescription')
	: summaryError.value ?? undefined,
);
const detailErrorDescription = computed(() => detailError.value === 'Failed to load document template'
	? t('components.templateStudio.loadDetailErrorDescription')
	: detailError.value ?? undefined,
);

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
	return summaries.value.find(template =>
		template.editable && template.channel === channel && template.template_code === templateCode,
	) ?? summaries.value.find(template => template.editable);
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
		if (!isActive || operation !== selectionOperation
			|| queryString(route.query.channel) !== channel || queryString(route.query.template) !== template.template_code) return;
	}
	if (!isActive || operation !== selectionOperation) return;
	if (selected.value?.channel === channel && selected.value.templateCode === template.template_code) return;
	await templateStore.loadDetail(channel, template.template_code);
}

async function syncSelectionFromRoute(): Promise<void> {
	if (!isActive) return;
	const template = requestedTemplate();
	if (template) await selectTemplate(template);
}

onScopeDispose(() => {
	isActive = false;
	selectionOperation += 1;
});

useLeavePageGuard(isDirty, {
	onLeave: () => {
		selectionOperation += 1;
		templateStore.dispose();
	},
});

onBeforeRouteUpdate((to, from, next) => {
	const templateChanged = queryString(to.query.channel) !== queryString(from.query.channel)
		|| queryString(to.query.template) !== queryString(from.query.template);
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
	() => {
		if (initialLoadSettled) void syncSelectionFromRoute();
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
}
</script>
