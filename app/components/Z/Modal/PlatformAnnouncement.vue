<template>
	<UModal
		v-model:open="open"
		:dismissible="false"
		:ui="{ content: 'max-w-lg' }"
	>
		<template #content>
			<div class="space-y-4 p-6">
				<div class="space-y-1">
					<p class="text-xs font-medium uppercase tracking-wide text-muted">
						Platform announcement
					</p>
					<h2 class="text-lg font-semibold">
						{{ item?.notification_title || item?.title }}
					</h2>
				</div>
				<img
					v-if="imageUrl"
					:src="imageUrl"
					alt=""
					class="max-h-48 w-full rounded-lg object-contain"
					@error="onImageError"
				>
				<div
					class="prose prose-sm dark:prose-invert max-w-none"
					v-html="messageHtml"
				/>
				<div class="flex flex-wrap justify-end gap-2">
					<UButton color="neutral" variant="soft" :loading="saving" @click="dismiss">
						Got it
					</UButton>
					<UButton
						v-if="ctaUrl"
						color="primary"
						:loading="saving"
						:to="ctaUrl"
						@click="dismiss"
					>
						{{ ctaLabel }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import { NotificationType } from 'yeppi-common';
import { isHttpsCoverImageUrl, reduceAnnouncementMessage } from '~/utils/announcement-message';
import { announcementHtmlHasText } from '~/utils/platform-announcement';
import type { NotificationItem } from '~/utils/types/notification';

const notificationStore = useNotificationStore();
const open = ref(false);
const item = ref<NotificationItem | null>(null);
const saving = ref(false);
const imageBroken = ref(false);

const imageUrl = computed(() => {
	if (imageBroken.value) return '';
	const image = item.value?.image_url?.trim() || '';
	return isHttpsCoverImageUrl(image) ? image : '';
});

const messageHtml = computed(() => {
	const reduced = reduceAnnouncementMessage(item.value?.notification_description || '');
	return announcementHtmlHasText(reduced) ? reduced : '';
});

const ctaLabel = computed(() => item.value?.action?.label || 'Open');
const ctaUrl = computed(() => {
	const url = item.value?.action?.url?.trim();
	if (!url || url === '/notifications') return '';
	return url;
});

function onImageError() {
	imageBroken.value = true;
}

async function dismiss() {
	if (!item.value) {
		open.value = false;
		return;
	}
	saving.value = true;
	try {
		await notificationStore.openNotificationItem(
			NotificationType.PLATFORM_ANNOUNCEMENT,
			item.value,
		);
	} finally {
		saving.value = false;
		open.value = false;
		item.value = null;
		maybeShowNext();
	}
}

function maybeShowNext() {
	const group = notificationStore.activeNotifications.find(
		(entry) => entry.type === NotificationType.PLATFORM_ANNOUNCEMENT,
	);
	const unread = group?.items.find((entry) => !entry.read_at);

	if (!unread) {
		return;
	}

	imageBroken.value = false;
	item.value = unread;
	open.value = true;
}

watch(
	() => notificationStore.notifications,
	() => {
		if (!open.value) {
			maybeShowNext();
		}
	},
	{ deep: true },
);

onMounted(() => {
	maybeShowNext();
});
</script>
