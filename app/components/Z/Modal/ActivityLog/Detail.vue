<template>
	<UModal
		:title="t('components.zModal.activityLogDetail.title')"
		:close="{ onClick: () => emit('close') }"
		scrollable
		:ui="{ content: 'w-full sm:max-w-3xl', body: 'space-y-6' }"
	>
		<template #body>
			<div class="space-y-2">
				<p class="text-sm font-medium text-highlighted">{{ t('components.zModal.activityLogDetail.description') }}</p>
				<div
					class="flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1 whitespace-normal wrap-break-word text-sm text-default"
					data-testid="activity-log-detail-description"
				>
					<template v-for="(segment, index) in descriptionSegments" :key="`${segment.type}-${index}`">
						<span v-if="segment.type === 'text'">{{ segment.text }}</span>
						<span
							v-else-if="segment.type === 'identifier'"
							class="italic underline decoration-dotted underline-offset-4 text-highlighted"
						>
							{{ segment.text }}
						</span>
						<span v-else-if="segment.type === 'bold'" class="font-bold text-highlighted">{{ segment.text }}</span>
						<UBadge v-else :color="segment.color" variant="subtle" size="md" class="capitalize">
							{{ segment.text }}
						</UBadge>
					</template>
				</div>
			</div>

			<dl class="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="activity-log-detail-meta">
				<div>
					<dt class="text-xs text-muted">{{ t('table.action') }}</dt>
					<dd class="mt-1">
						<UBadge variant="subtle" color="neutral" size="sm">{{ actionLabel }}</UBadge>
					</dd>
				</div>
				<div>
					<dt class="text-xs text-muted">{{ t('table.source') }}</dt>
					<dd class="mt-1">
						<UBadge variant="subtle" color="neutral" size="sm">{{ sourceLabel }}</UBadge>
					</dd>
				</div>
				<div>
					<dt class="text-xs text-muted">{{ t('table.actor') }}</dt>
					<dd class="mt-1 text-sm text-highlighted">
						{{ actorTypeLabel }}
						<span v-if="activityLog.actor_id" class="mt-0.5 block truncate font-mono text-xs text-muted">{{ activityLog.actor_id }}</span>
					</dd>
				</div>
				<div>
					<dt class="text-xs text-muted">{{ t('table.createdAt') }}</dt>
					<dd class="mt-1 text-sm text-highlighted">{{ createdAtLabel }}</dd>
				</div>
				<div v-if="activityLog.ref_no">
					<dt class="text-xs text-muted">{{ t('components.zModal.activityLogDetail.refNo') }}</dt>
					<dd class="mt-1 truncate font-mono text-xs text-muted">{{ activityLog.ref_no }}</dd>
				</div>
				<div v-if="activityLog.ref_no2">
					<dt class="text-xs text-muted">{{ t('components.zModal.activityLogDetail.refNo2') }}</dt>
					<dd class="mt-1 truncate font-mono text-xs text-muted">{{ activityLog.ref_no2 }}</dd>
				</div>
			</dl>

			<section v-if="importReport" class="space-y-4" data-testid="activity-log-import-report">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h3 class="text-sm font-medium text-highlighted">{{ t('components.zModal.activityLogDetail.importReport') }}</h3>
						<p v-if="importReport.file_name" class="text-xs text-muted">{{ importReport.file_name }}</p>
					</div>
					<UButton
						v-if="importReport.errors.length"
						color="neutral"
						variant="soft"
						size="sm"
						:icon="ICONS.CLIPBOARD"
						:label="t('components.zModal.activityLogDetail.copyFailedUnits')"
						data-testid="activity-log-copy-failed-units"
						@click="copyFailedUnits"
					/>
				</div>

				<div class="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="activity-log-import-counts">
					<div class="rounded-md bg-elevated px-3 py-2">
						<p class="text-xs text-muted">{{ t('components.zModal.activityLogDetail.total') }}</p>
						<p class="text-sm font-semibold text-highlighted">{{ importReport.total }}</p>
					</div>
					<div class="rounded-md bg-elevated px-3 py-2">
						<p class="text-xs text-muted">{{ t('components.zModal.activityLogDetail.created') }}</p>
						<p class="text-sm font-semibold text-highlighted">{{ importReport.created }}</p>
					</div>
					<div class="rounded-md bg-elevated px-3 py-2">
						<p class="text-xs text-muted">{{ t('components.zModal.activityLogDetail.updated') }}</p>
						<p class="text-sm font-semibold text-highlighted">{{ importReport.updated }}</p>
					</div>
					<div class="rounded-md bg-elevated px-3 py-2">
						<p class="text-xs text-muted">{{ t('components.zModal.activityLogDetail.failed') }}</p>
						<p class="text-sm font-semibold text-highlighted">{{ importReport.failed }}</p>
					</div>
				</div>

				<div v-if="importReport.errors.length" class="space-y-2">
					<p class="text-xs text-muted">
						{{ t('components.zModal.activityLogDetail.failedUnits', { count: importReport.errors.length }) }}
					</p>
					<div class="overflow-hidden rounded-md border border-default">
						<UTable
							:data="importReport.errors"
							:columns="failedUnitColumns"
							:virtualize="importReport.errors.length > 100"
							:ui="{
								base: 'table-fixed',
								tbody: importReport.errors.length > 100 ? 'max-h-80' : undefined,
							}"
						/>
					</div>
				</div>
				<p v-else class="text-sm text-muted">{{ t('components.zModal.activityLogDetail.noFailedUnits') }}</p>
			</section>
		</template>

		<template #footer>
			<div class="flex w-full justify-end">
				<UButton color="neutral" variant="soft" :label="t('common.close')" @click="emit('close')" />
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui';
import { format } from 'date-fns';
import {
	formatImportReportFailedUnitsForClipboard,
	parseImportReport,
	type ImportReportFailedUnit,
} from '~/utils/activity-log-import-report';
import { parseActivityLogRichText } from '~/utils/activity-log-rich-text';
import { ICONS } from '~/utils/icons';
import {
	getActivityLogActionLabel,
	getActivityLogActorTypeLabel,
	getActivityLogSourceLabel,
} from '~/utils/options';
import type { ActivityLog } from '~/utils/types/activity-log';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';

const props = defineProps({
	activityLog: {
		type: Object as PropType<ActivityLog>,
		required: true,
	},
});

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();

const descriptionText = computed(() => props.activityLog.internal_desc ?? props.activityLog.desc ?? '-');
const descriptionSegments = computed(() => parseActivityLogRichText(descriptionText.value));
const actionLabel = computed(() => getActivityLogActionLabel(t, props.activityLog.action));
const sourceLabel = computed(() => getActivityLogSourceLabel(t, props.activityLog.source));
const actorTypeLabel = computed(() => getActivityLogActorTypeLabel(t, props.activityLog.actor_type));
const createdAtLabel = computed(() => {
	if (!props.activityLog.created_at) {
		return '-';
	}
	return format(new Date(props.activityLog.created_at), 'dd/MM/yyyy HH:mm:ss');
});
const importReport = computed(() => parseImportReport(props.activityLog.metadata));

const failedUnitColumns = computed<TableColumn<ImportReportFailedUnit>[]>(() => [
	{
		accessorKey: 'row',
		header: t('components.zModal.activityLogDetail.unitRow'),
		meta: { class: { th: 'w-20', td: 'w-20 font-mono text-xs' } },
	},
	{
		accessorKey: 'code',
		header: t('components.zModal.activityLogDetail.unitCode'),
		cell: ({ row }) => row.original.code || '-',
		meta: { class: { th: 'w-40', td: 'w-40 font-mono text-xs truncate' } },
	},
	{
		accessorKey: 'message',
		header: t('components.zModal.activityLogDetail.unitMessage'),
		meta: { class: { td: 'text-xs whitespace-normal wrap-break-word' } },
	},
]);

const copyFailedUnits = async () => {
	const errors = importReport.value?.errors ?? [];
	if (!errors.length) {
		return;
	}

	const text = formatImportReportFailedUnitsForClipboard(errors);

	try {
		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
		} else if (typeof document !== 'undefined') {
			const textarea = document.createElement('textarea');
			textarea.value = text;
			textarea.setAttribute('readonly', '');
			textarea.style.position = 'absolute';
			textarea.style.left = '-9999px';
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
		} else {
			throw new Error('Clipboard unavailable');
		}
		successNotification(t('components.zModal.activityLogDetail.copyFailedUnitsSuccess'));
	} catch {
		failedNotification(t('components.zModal.activityLogDetail.copyFailedUnitsFailed'));
	}
};
</script>
