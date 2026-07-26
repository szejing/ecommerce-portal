<template>
	<UModal v-model:open="open" :title="item?.title ?? t('notifications.detailTitle')" :ui="{ content: 'w-full sm:max-w-2xl' }">
		<template #body>
			<div v-if="item" class="notification-detail">
				<div class="detail-hero">
					<div>
						<p class="detail-kicker">{{ item.notification_title ?? t('notifications.title') }}</p>
						<h3>{{ item.title }}</h3>
						<p v-if="item.notification_description" class="detail-description">
							{{ item.notification_description }}
						</p>
					</div>
					<UBadge :color="severityColor" variant="subtle">
						{{ item.notification_severity ?? 'info' }}
					</UBadge>
				</div>

				<div class="detail-grid">
					<div class="detail-field">
						<span>{{ t('common.status') }}</span>
						<UBadge v-if="item.status" :color="statusColor" variant="subtle" size="sm" class="capitalize w-fit">
							{{ item.status }}
						</UBadge>
						<UBadge v-else color="neutral" variant="subtle" size="sm">
							{{ t('common.notSet') }}
						</UBadge>
					</div>
					<div class="detail-field">
						<span>{{ t('notifications.reference') }}</span>
						<UBadge v-if="item.ref_no" color="neutral" variant="subtle" size="sm" class="font-mono w-fit max-w-full truncate">
							{{ item.ref_no }}
						</UBadge>
						<UBadge v-else color="neutral" variant="subtle" size="sm">
							{{ t('common.notSet') }}
						</UBadge>
					</div>
					<div class="detail-dates">
						<span>{{ t('notifications.timestamps') }}</span>
						<div class="detail-dates-grid">
							<div v-for="field in dateFields" :key="field.key" class="detail-date-item">
								<span>{{ t(field.labelKey) }}</span>
								<strong>{{ formatDate(field.value) }}</strong>
							</div>
						</div>
					</div>
				</div>

				<div v-if="item.subtitle" class="detail-note">
					<span>{{ t('common.description') }}</span>
					<p>{{ item.subtitle }}</p>
				</div>
			</div>
		</template>

		<template #footer>
			<div class="detail-footer">
				<UButton color="neutral" variant="ghost" @click="open = false">
					{{ t('common.cancel') }}
				</UButton>
				<UButton v-if="item?.action.url" color="primary" :trailing-icon="ICONS.ARROW_RIGHT" @click="goToAction">
					{{ item.action.label }}
				</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import { format } from 'date-fns';
import type { AppointmentStatus } from 'yeppi-common';
import type { NotificationItem } from '~/utils/types/notification';
import { getAppointmentStatusColor, getOrderStatusColor, getPaymentStatusColor } from '~/utils/options';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const open = defineModel<boolean>('open', { default: false });

const props = defineProps<{
	item?: NotificationItem | null;
}>();

const severityColor = computed(() => {
	switch (props.item?.notification_severity) {
		case 'critical':
			return 'error';
		case 'warning':
			return 'warning';
		default:
			return 'info';
	}
});

const statusColor = computed(() => {
	const status = props.item?.status;
	if (!status) {
		return 'neutral';
	}

	return getOrderStatusColor(status) ?? getPaymentStatusColor(status) ?? getAppointmentStatusColor(status as AppointmentStatus) ?? 'neutral';
});

const dateFields = computed(() => {
	const item = props.item;
	if (!item) {
		return [];
	}

	return [
		{ key: 'scheduled_at', labelKey: 'notifications.scheduledAt', value: item.scheduled_at },
		{ key: 'created_at', labelKey: 'notifications.createdAt', value: item.created_at },
		{ key: 'read_at', labelKey: 'notifications.readAt', value: item.read_at },
		{ key: 'opened_at', labelKey: 'notifications.openedAt', value: item.opened_at },
	] as const;
});

const formatDate = (date?: string | Date) => {
	if (!date) {
		return '-';
	}

	return format(new Date(date), 'dd MMM yyyy, h:mm a');
};

const goToAction = async () => {
	if (!props.item?.action.url) {
		return;
	}

	open.value = false;
	await navigateTo(props.item.action.url);
};
</script>

<style scoped>
.notification-detail {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.detail-hero {
	display: flex;
	justify-content: space-between;
	gap: 1rem;
	padding: 1rem;
	border-radius: 1rem;
	background: linear-gradient(135deg, #f8fafc, #ffffff);
	border: 1px solid var(--color-neutral-200);
}

.detail-kicker {
	font-size: 0.72rem;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--color-neutral-500);
}

.detail-hero h3 {
	font-size: 1.15rem;
	font-weight: 800;
	color: var(--color-neutral-950);
}

.detail-description {
	margin-top: 0.35rem;
	font-size: 0.88rem;
	color: var(--color-neutral-600);
}

.detail-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.75rem;
}

.detail-field,
.detail-note {
	border: 1px solid var(--color-neutral-200);
	border-radius: 0.875rem;
	padding: 0.75rem;
	background: white;
}

.detail-field span,
.detail-note span {
	display: block;
	font-size: 0.72rem;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--color-neutral-500);
}

.detail-field > :not(span) {
	margin-top: 0.35rem;
}

.detail-dates {
	grid-column: 1 / -1;
	border: 1px solid var(--color-neutral-200);
	border-radius: 0.875rem;
	padding: 0.75rem;
	background: white;
}

.detail-dates > span {
	display: block;
	font-size: 0.72rem;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--color-neutral-500);
}

.detail-dates-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.75rem 1rem;
	margin-top: 0.5rem;
}

.detail-date-item span {
	display: block;
	font-size: 0.72rem;
	color: var(--color-neutral-500);
}

.detail-date-item strong {
	display: block;
	margin-top: 0.15rem;
	font-size: 0.88rem;
	font-weight: 600;
	color: var(--color-neutral-950);
}

.detail-note p {
	margin-top: 0.25rem;
	color: var(--color-neutral-800);
}

.detail-footer {
	width: 100%;
	display: flex;
	justify-content: flex-end;
	gap: 0.5rem;
}

@media (max-width: 640px) {
	.detail-hero,
	.detail-footer {
		flex-direction: column;
	}

	.detail-grid,
	.detail-dates-grid {
		grid-template-columns: 1fr;
	}
}
</style>
