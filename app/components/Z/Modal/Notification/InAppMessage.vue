<template>
	<UModal
		v-model:open="open"
		:title="title"
		:close="{ onClick: () => close() }"
		scrollable
		:ui="{ content: 'w-full sm:max-w-lg', body: 'space-y-4' }"
	>
		<template #body>
			<p class="text-xs font-medium uppercase tracking-wide text-muted">
				{{ t('platformAnnouncements.inApp.kicker') }}
			</p>
			<img
				v-if="imageUrl"
				:src="imageUrl"
				alt=""
				class="max-h-48 w-full rounded-lg object-contain"
				@error="imageBroken = true"
			>
			<div
				v-if="bodyHtml"
				class="prose prose-sm dark:prose-invert max-w-none text-default"
				v-html="bodyHtml"
			/>
			<p v-else class="text-sm text-muted">
				{{ t('platformAnnouncements.inApp.previewEmpty') }}
			</p>
		</template>

		<template #footer>
			<div class="flex w-full flex-wrap justify-end gap-2">
				<UButton color="neutral" variant="soft" @click="close()">
					{{ t('common.close') }}
				</UButton>
				<UButton v-if="ctaUrl" color="primary" :to="ctaUrl" @click="close()">
					{{ ctaLabel }}
				</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import { isHttpsCoverImageUrl, reduceAnnouncementMessage } from '~/utils/announcement-message';
import { announcementHtmlHasText } from '~/utils/platform-announcement';
import type { NotificationItem } from '~/utils/types/notification';

const props = defineProps<{
	item: NotificationItem;
}>();

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const open = ref(true);
const imageBroken = ref(false);

const close = () => {
	open.value = false;
};

watch(open, (value) => {
	if (!value) {
		emit('close');
	}
});

const title = computed(() => props.item.title?.trim() || props.item.notification_title?.trim() || t('notifications.detailTitle'));

const bodyHtml = computed(() => {
	const reduced = reduceAnnouncementMessage(props.item.notification_description?.trim() || props.item.subtitle?.trim() || '');
	return announcementHtmlHasText(reduced) ? reduced : '';
});

const imageUrl = computed(() => {
	if (imageBroken.value) {
		return '';
	}

	const image = props.item.image_url?.trim() || '';
	return isHttpsCoverImageUrl(image) ? image : '';
});

const ctaUrl = computed(() => {
	const url = props.item.action?.url?.trim() ?? '';

	if (!url || url === '/notifications') {
		return '';
	}

	return url;
});

const ctaLabel = computed(() => props.item.action?.label?.trim() || t('common.view'));

watch(() => props.item.image_url, () => {
	imageBroken.value = false;
});
</script>
