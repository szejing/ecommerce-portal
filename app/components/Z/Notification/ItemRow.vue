<template>
	<UButton
		:class="['z-notification-item-row', `z-notification-item-row--${layout}`, { 'z-notification-item-row--read': isRead }]"
		color="neutral"
		variant="ghost"
		block
		:aria-label="item.title"
		@click="emit('select')"
	>
		<span :class="['z-notification-item-row__dot', { 'z-notification-item-row__dot--read': isRead }, `z-notification-item-row__dot--${severity}`]" />
		<span class="z-notification-item-row__body">
			<span class="z-notification-item-row__title">{{ item.title }}</span>
			<span v-for="line in summaryLines" :key="line" class="z-notification-item-row__line">{{ line }}</span>
			<span class="z-notification-item-row__meta">{{ itemMeta }}</span>
		</span>
		<span class="z-notification-item-row__trailing">
			<UIcon :name="ICONS.CHEVRON_RIGHT" class="size-4 shrink-0" />
		</span>
	</UButton>
</template>

<script setup lang="ts">
import type { NotificationSeverity } from 'yeppi-common';
import { ICONS } from '~/utils/icons';
import type { NotificationItem } from '~/utils/types/notification';

const props = withDefaults(
	defineProps<{
		item: NotificationItem;
		severity: NotificationSeverity;
		layout?: 'popover' | 'inbox';
	}>(),
	{
		layout: 'popover',
	},
);

const emit = defineEmits<{
	select: [];
}>();

const { formatItemMeta, getSummaryLines } = useNotificationItemDisplay();

const isRead = computed(() => !!props.item.read_at);
const summaryLines = computed(() => getSummaryLines(props.item));
const itemMeta = computed(() => formatItemMeta(props.item));
</script>

<style scoped>
.z-notification-item-row {
	display: grid !important;
	grid-template-columns: auto minmax(0, 1fr) auto;
	align-items: flex-start;
	justify-items: stretch;
	gap: 0.75rem;
	height: auto;
	min-height: 0;
	padding: 0.65rem;
	text-align: left;
	white-space: normal;
	cursor: pointer !important;
}

.z-notification-item-row--inbox {
	gap: 0.85rem;
	padding: 0.85rem;
	border: 1px solid var(--color-neutral-200);
	border-radius: 0.5rem;
	background: white;
	transition:
		border-color 0.2s,
		background 0.2s;
}

.z-notification-item-row--inbox:not(.z-notification-item-row--read) {
	border-color: var(--color-main-200);
	background: var(--color-main-50);
}

.z-notification-item-row--inbox:not(.z-notification-item-row--read):hover {
	border-color: var(--color-main-300);
	background: var(--color-main-100);
}

.z-notification-item-row--inbox.z-notification-item-row--read {
	border-color: var(--color-neutral-200);
	background: var(--color-neutral-50);
}

.z-notification-item-row--inbox.z-notification-item-row--read:hover {
	border-color: var(--color-neutral-300);
	background: var(--color-neutral-100);
}

.z-notification-item-row--popover:not(.z-notification-item-row--read) {
	background: var(--color-main-50);
}

.z-notification-item-row--popover:not(.z-notification-item-row--read):hover {
	background: var(--color-main-100);
}

.z-notification-item-row--popover.z-notification-item-row--read:hover {
	background: var(--color-neutral-100);
}

.z-notification-item-row--read {
	opacity: 0.55;
}

.z-notification-item-row--read .z-notification-item-row__title,
.z-notification-item-row--read .z-notification-item-row__line,
.z-notification-item-row--read .z-notification-item-row__meta,
.z-notification-item-row--read .z-notification-item-row__trailing {
	color: var(--color-neutral-400);
}

.z-notification-item-row:not(.z-notification-item-row--read) .z-notification-item-row__title {
	color: var(--color-main-700);
}

.z-notification-item-row:not(.z-notification-item-row--read) .z-notification-item-row__trailing {
	color: var(--color-main-500);
}

.z-notification-item-row__dot {
	width: 0.625rem;
	height: 0.625rem;
	flex: 0 0 0.625rem;
	border-radius: 9999px;
	margin-top: 0.3rem;
}

.z-notification-item-row--inbox .z-notification-item-row__dot {
	width: 0.65rem;
	height: 0.65rem;
	flex-basis: 0.65rem;
}

.z-notification-item-row__dot--read {
	background: var(--color-neutral-300);
}

.z-notification-item-row__dot--info {
	background: var(--color-info-500, #0ea5e9);
}

.z-notification-item-row__dot--warning {
	background: var(--color-warning-500, #f59e0b);
}

.z-notification-item-row__dot--critical {
	background: var(--color-error-500, #ef4444);
}

.z-notification-item-row__body {
	display: flex;
	min-width: 0;
	flex-direction: column;
	gap: 0.15rem;
}

.z-notification-item-row__title {
	font-size: 0.85rem;
	font-weight: 700;
}

.z-notification-item-row--inbox .z-notification-item-row__title {
	font-size: 0.92rem;
}

.z-notification-item-row__line,
.z-notification-item-row__meta {
	display: block;
	font-size: 0.72rem;
	line-height: 1.35;
	color: var(--color-neutral-500);
}

.z-notification-item-row__line {
	display: -webkit-box;
	overflow: hidden;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
}

.z-notification-item-row--inbox .z-notification-item-row__line,
.z-notification-item-row--inbox .z-notification-item-row__meta {
	font-size: 0.78rem;
}

.z-notification-item-row__trailing {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: var(--color-neutral-400);
}

@media (max-width: 640px) {
	.z-notification-item-row--inbox {
		grid-template-columns: auto minmax(0, 1fr);
	}

	.z-notification-item-row--inbox .z-notification-item-row__trailing {
		grid-column: 2;
		flex-direction: row;
		justify-content: space-between;
	}
}
</style>
