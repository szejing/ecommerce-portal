<template>
	<div class="space-y-3">
		<div v-if="!revisions.length" class="rounded-xl border border-dashed border-default p-8 text-center text-sm text-muted">
			{{ t('components.templateStudio.noRevisions') }}
		</div>
		<article
			v-for="revision in revisions"
			:key="revision.id"
			:data-revision="revision.revision_no"
			class="space-y-4 rounded-xl border border-default p-4"
		>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div class="space-y-2">
					<div class="flex flex-wrap items-center gap-2">
						<h3 class="font-semibold text-default">
							{{ t('components.templateStudio.revisionNumber', { number: revision.revision_no }) }}
						</h3>
						<UBadge color="neutral" variant="soft">{{ revisionStatusLabel(revision) }}</UBadge>
						<UBadge :color="isCompatible(revision) ? 'success' : 'error'" variant="soft">
							{{ t(isCompatible(revision) ? 'components.templateStudio.compatible' : 'components.templateStudio.incompatible') }}
						</UBadge>
					</div>
					<p class="text-sm text-muted">
						{{ t('components.templateStudio.createdBy', { creator: revisionCreator(revision) }) }}
					</p>
				</div>
				<UButton
					v-if="canRestore && revision.status !== 'draft'"
					data-action="restore"
					type="button"
					color="neutral"
					variant="outline"
					icon="i-lucide-history"
					:disabled="!isCompatible(revision)"
					:loading="restoringRevisionNo === revision.revision_no"
					class="min-h-11 shrink-0"
					@click="emit('restore', revision.revision_no)"
				>
					{{ t('components.templateStudio.restore') }}
				</UButton>
			</div>

			<dl class="grid gap-3 text-sm sm:grid-cols-2">
				<div class="rounded-lg bg-elevated p-3">
					<dt class="text-xs text-muted">{{ t('components.templateStudio.published') }}</dt>
					<dd class="font-medium text-default">{{ dateLabel(revision.published_at, 'components.templateStudio.notPublished') }}</dd>
				</div>
				<div class="rounded-lg bg-elevated p-3">
					<dt class="text-xs text-muted">{{ t('components.templateStudio.created') }}</dt>
					<dd class="font-medium text-default">{{ dateLabel(revision.created_at) }}</dd>
				</div>
				<div class="rounded-lg bg-elevated p-3">
					<dt class="text-xs text-muted">{{ t('components.templateStudio.starts') }}</dt>
					<dd class="font-medium text-default">{{ dateLabel(revision.start_date, 'components.templateStudio.immediate') }}</dd>
				</div>
				<div class="rounded-lg bg-elevated p-3">
					<dt class="text-xs text-muted">{{ t('components.templateStudio.ends') }}</dt>
					<dd class="font-medium text-default">{{ dateLabel(revision.end_date, 'components.templateStudio.indefinite') }}</dd>
				</div>
			</dl>

			<p v-if="!isCompatible(revision)" class="text-sm text-error">
				{{ t('components.templateStudio.incompatibleDescription') }}
			</p>
		</article>
	</div>
</template>

<script setup lang="ts">
import { getRevisionActivationStatus } from '~/utils/document-template';
import type { DocumentTemplateRevision } from '~/utils/types/document-template';

const props = withDefaults(defineProps<{
	revisions: DocumentTemplateRevision[];
	activeRevisionId?: string | null;
	schemaVersion?: number;
	systemTemplateVersion?: number;
	now?: Date;
	timezone?: string;
	canRestore?: boolean;
	restoringRevisionNo?: number;
}>(), {
	activeRevisionId: null,
	schemaVersion: undefined,
	systemTemplateVersion: undefined,
	now: () => new Date(),
	timezone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
	canRestore: false,
	restoringRevisionNo: undefined,
});

const emit = defineEmits<{
	restore: [revisionNo: number];
}>();

const { t, locale } = useI18n();

function isCompatible(revision: DocumentTemplateRevision): boolean {
	return props.schemaVersion !== undefined
		&& props.systemTemplateVersion !== undefined
		&& revision.schema_version === props.schemaVersion
		&& revision.system_template_version === props.systemTemplateVersion;
}

function revisionStatusLabel(revision: DocumentTemplateRevision): string {
	if (revision.status === 'draft') return t('components.templateStudio.draft');
	if (revision.status === 'archived') return t('components.templateStudio.archived');
	const status = getRevisionActivationStatus(
		revision.start_date,
		revision.end_date,
		props.now,
		revision.id === props.activeRevisionId,
	);
	return t(`components.templateStudio.revisionStates.${status}`);
}

function revisionCreator(revision: DocumentTemplateRevision): string {
	if (revision.created_by?.trim()) return revision.created_by;
	return t('components.templateStudio.unknownCreator');
}

function dateLabel(value: string | null, fallbackKey?: string): string {
	if (!value) return fallbackKey ? t(fallbackKey) : t('components.templateStudio.notAvailable');
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return t('components.templateStudio.notAvailable');
	return new Intl.DateTimeFormat(locale.value, {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: props.timezone,
	}).format(date);
}
</script>
