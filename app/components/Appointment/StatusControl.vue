<template>
	<dl class="state-summary" :aria-label="t('components.zModal.changeAppointmentStatus')">
		<div data-testid="appointment-status" class="state-summary-item">
			<dt class="state-summary-label">{{ t('table.status') }}</dt>
			<dd class="state-summary-value">
				<div class="status-control">
					<div class="status-split text-inverted" :class="statusPillClass" :title="statusLabel">
						<ZSelectMenuAppointmentStatus
							appearance="pill"
							include-no-show
							:status="status"
							:disabled="updating"
							@update:status="onStatusSelected"
						/>
						<button
							v-if="nextStatus"
							type="button"
							data-testid="appointment-status-next"
							class="status-split-next"
							:disabled="updating"
							:aria-label="t('components.zModal.nextAppointmentStatus', { status: nextStatusLabel })"
							:title="t('components.zModal.nextAppointmentStatus', { status: nextStatusLabel })"
							@click="onStatusSelected(nextStatus)"
						>
							<UIcon :name="ICONS.CHEVRON_RIGHT" class="size-4" aria-hidden="true" />
						</button>
					</div>
					<UButton
						v-if="showComplete"
						data-testid="appointment-status-complete"
						color="neutral"
						variant="subtle"
						size="sm"
						square
						:icon="ICONS.CHECK_ROUNDED"
						:disabled="updating"
						:aria-label="t('components.zModal.completeAppointmentStatus')"
						:title="t('components.zModal.completeAppointmentStatus')"
						@click="onStatusSelected(AppointmentStatus.COMPLETED)"
					/>
				</div>
			</dd>
		</div>
	</dl>
	<p class="sr-only" role="status">{{ liveStatus }}</p>
</template>

<script lang="ts" setup>
import { AppointmentStatus } from 'yeppi-common';
import {
	canCompleteAppointmentStatus,
	getAppointmentStatusColor,
	getAppointmentStatusLabel,
	getNextAppointmentStatus,
} from '~/utils/options';
import { ICONS } from '~/utils/icons';

const props = withDefaults(
	defineProps<{
		status: AppointmentStatus | undefined;
		updating?: boolean;
	}>(),
	{
		updating: false,
	},
);

const emit = defineEmits<{
	'update:status': [status: AppointmentStatus];
}>();

const { t } = useI18n();

function pillClassForColor(color: string | undefined) {
	switch (color) {
		case 'primary':
			return 'bg-primary';
		case 'success':
			return 'bg-success';
		case 'warning':
			return 'bg-warning';
		case 'error':
			return 'bg-error';
		case 'secondary':
			return 'bg-secondary';
		case 'neutral':
			return 'bg-inverted';
		default:
			return 'bg-info';
	}
}

const statusLabel = computed(() => getAppointmentStatusLabel(t, props.status));
const nextStatus = computed(() => getNextAppointmentStatus(props.status));
const nextStatusLabel = computed(() => getAppointmentStatusLabel(t, nextStatus.value));
const showComplete = computed(() => canCompleteAppointmentStatus(props.status));
const statusPillClass = computed(() => pillClassForColor(props.status ? getAppointmentStatusColor(props.status) : 'neutral'));
const liveStatus = computed(() => (props.status ? t('components.zModal.appointmentStatusUpdated', { status: statusLabel.value }) : ''));

function onStatusSelected(status: AppointmentStatus | undefined) {
	if (!status || status === props.status || props.updating) {
		return;
	}
	emit('update:status', status);
}
</script>

<style scoped>
.state-summary {
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	gap: 0.375rem;
	min-width: 0;
	margin: 0;
	border: 1px solid var(--ui-border);
	border-radius: 0.75rem;
	background: color-mix(in srgb, var(--ui-bg-elevated) 55%, transparent);
	padding: 0.5rem 0.75rem;
}

.state-summary-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	min-width: 0;
}

.state-summary-label {
	margin: 0;
	flex-shrink: 0;
	font-size: 0.6875rem;
	font-weight: 600;
	line-height: 1rem;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--ui-text-muted);
}

.state-summary-value {
	display: flex;
	min-width: 0;
	margin: 0;
	justify-content: flex-end;
}

.status-control {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	min-width: 0;
}

.status-split {
	display: inline-flex;
	align-items: stretch;
	min-width: 0;
	max-width: 100%;
	overflow: hidden;
	border-radius: 0.5rem;
}

.status-split-next {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	min-width: 2rem;
	padding-inline: 0.25rem;
	border: 0;
	border-left: 1px solid color-mix(in srgb, white 30%, transparent);
	background: transparent;
	color: inherit;
	cursor: pointer;
	touch-action: manipulation;
}

.status-split-next:hover:not(:disabled) {
	background: color-mix(in srgb, white 12%, transparent);
}

.status-split-next:focus-visible {
	outline: 2px solid color-mix(in srgb, white 80%, transparent);
	outline-offset: -2px;
}

.status-split-next:disabled {
	cursor: not-allowed;
	opacity: 0.5;
}
</style>
