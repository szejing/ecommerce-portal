<template>
	<UModal
		v-model:open="open"
		data-testid="import-preview-modal"
		:data-open="String(open)"
		:title="t('shipmentArrangement.preview.title')"
		:ui="{ content: 'w-[calc(100vw-1.5rem)] max-w-6xl sm:w-full', body: 'max-lg:p-3', footer: 'max-lg:p-3' }"
	>
		<template #body>
			<div class="space-y-4">
				<div v-if="props.preview" class="grid grid-cols-3 gap-2 lg:gap-3">
					<div v-for="stat in summary" :key="stat.label" class="min-w-0 rounded-md border border-default bg-elevated/40 p-2 wrap-anywhere lg:p-3">
						<p class="text-xs font-medium text-muted">{{ stat.label }}</p>
						<p class="mt-1 text-lg font-semibold tabular-nums text-default lg:text-xl">{{ stat.value }}</p>
					</div>
				</div>

				<UAlert
					v-if="props.error"
					color="error"
					variant="soft"
					icon="i-lucide-circle-alert"
					:title="t('shipmentArrangement.preview.failedTitle')"
					:description="props.error"
				/>

				<UAlert
					v-if="props.applyResult"
					:color="props.applyResult.failed > 0 ? 'warning' : 'success'"
					variant="soft"
					:icon="props.applyResult.failed > 0 ? 'i-lucide-triangle-alert' : 'i-lucide-circle-check'"
					:title="t('shipmentArrangement.preview.applyResultTitle')"
					:description="t('shipmentArrangement.preview.applyResult', { updated: props.applyResult.updated, failed: props.applyResult.failed })"
				/>

				<ul v-if="props.applyResult?.errors.length" class="space-y-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm">
					<li v-for="item in props.applyResult.errors" :key="item.fulfillment_id" class="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-2">
						<span class="font-semibold text-default">{{ item.order_no }} · #{{ item.batch_no }}</span>
						<span class="text-muted">{{ item.message }}</span>
					</li>
				</ul>

				<UAlert
					v-if="props.preview && !props.applyResult"
					color="warning"
					variant="soft"
					icon="i-lucide-triangle-alert"
					:description="t('shipmentArrangement.preview.applyWarning')"
				/>

				<div v-if="props.preview" class="hidden max-w-full overflow-x-auto rounded-md border border-default lg:block">
					<UTable :data="props.preview.rows" :columns="previewColumns" class="min-w-[52rem]" />
				</div>

				<ul v-if="props.preview" class="divide-y divide-default rounded-md border border-default lg:hidden">
					<li v-for="row in props.preview.rows" :key="row.row_number" class="space-y-2 p-3 wrap-anywhere">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<p class="text-sm font-semibold text-highlighted">{{ row.order_no }} · #{{ row.batch_no }}</p>
							<UBadge
								variant="soft"
								:color="row.status === 'error' ? 'error' : row.status === 'warning' ? 'warning' : 'success'"
								:label="t(`shipmentArrangement.preview.rowStatus.${row.status}`)"
							/>
						</div>
						<dl class="grid grid-cols-2 gap-2 text-sm">
							<div class="min-w-0">
								<dt class="text-xs text-muted">{{ t('shipmentArrangement.table.courier') }}</dt>
								<dd>{{ row.courier || '—' }}</dd>
							</div>
							<div class="min-w-0">
								<dt class="text-xs text-muted">{{ t('shipmentArrangement.table.tracking') }}</dt>
								<dd>{{ row.tracking_no || '—' }}</dd>
							</div>
						</dl>
						<p class="text-xs text-muted">{{ t('shipmentArrangement.table.row') }} {{ row.row_number }}</p>
						<ul v-if="row.messages.length" class="list-disc space-y-0.5 ps-4 text-xs text-muted">
							<li v-for="(message, index) in row.messages" :key="index">{{ message }}</li>
						</ul>
					</li>
				</ul>
			</div>
		</template>

		<template #footer>
			<div class="flex w-full flex-wrap justify-end gap-2">
				<UButton
					class="min-h-11 justify-center"
					color="neutral"
					variant="ghost"
					:label="props.applyResult ? t('common.close') : t('common.cancel')"
					@click="
						() => {
							open = false;
						}
					"
				/>
				<UButton
					v-if="!props.applyResult"
					data-testid="apply-shipments"
					class="min-h-11 flex-1 justify-center sm:flex-none"
					:disabled="props.eligibleCount === 0"
					:loading="props.applying"
					:label="t('shipmentArrangement.preview.applyCount', { count: props.eligibleCount })"
					@click="emit('apply')"
				/>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import { getShipmentArrangementPreviewColumns } from '~/utils/table-columns';
import type { ShipmentArrangementApplyResponse, ShipmentArrangementPreviewResponse } from '~/utils/types/shipment-arrangement';

const open = defineModel<boolean>({ required: true });

const props = withDefaults(
	defineProps<{
		preview?: ShipmentArrangementPreviewResponse;
		eligibleCount: number;
		applyResult?: ShipmentArrangementApplyResponse;
		applying?: boolean;
		error?: string;
	}>(),
	{
		preview: undefined,
		applyResult: undefined,
		applying: false,
		error: undefined,
	},
);

const emit = defineEmits<{
	apply: [];
	dismiss: [];
}>();

const { t } = useI18n();
const summary = computed(() => [
	{ label: t('shipmentArrangement.preview.ready'), value: props.eligibleCount },
	{ label: t('shipmentArrangement.preview.warnings'), value: props.preview?.warnings ?? 0 },
	{ label: t('shipmentArrangement.preview.errors'), value: props.preview?.errors ?? 0 },
]);
const previewColumns = computed(() => getShipmentArrangementPreviewColumns(t));

watch(open, (value) => {
	if (!value) emit('dismiss');
});
</script>
