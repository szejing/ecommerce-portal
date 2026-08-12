<template>
	<UModal
		v-model:open="open"
		data-testid="import-preview-modal"
		:data-open="String(open)"
		:title="t('shipmentArrangement.preview.title')"
		:ui="{ content: 'w-[calc(100vw-1.5rem)] max-w-6xl sm:w-full' }"
	>
		<template #body>
			<div class="space-y-4">
				<div v-if="props.preview" class="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<div v-for="stat in summary" :key="stat.label" class="rounded-md border border-default bg-elevated/40 p-3">
						<p class="text-xs font-medium text-muted">{{ stat.label }}</p>
						<p class="mt-1 text-xl font-semibold text-default">{{ stat.value }}</p>
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

				<div v-if="props.preview" class="max-w-full overflow-x-auto rounded-md border border-default">
					<UTable :data="props.preview.rows" :columns="previewColumns" class="min-w-[52rem]" />
				</div>

				<UAlert
					v-if="props.preview && !props.applyResult"
					color="warning"
					variant="soft"
					icon="i-lucide-triangle-alert"
					:description="t('shipmentArrangement.preview.applyWarning')"
				/>
			</div>
		</template>

		<template #footer>
			<div class="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
					class="min-h-11 justify-center"
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
