<template>
	<ZAnnouncementPreviewShell
		:title="t('platformAnnouncements.inApp.previewTitle')"
		:badge="t('platformAnnouncements.inApp.previewBadge')"
		:hint="t('platformAnnouncements.inApp.previewHint')"
	>
		<div class="space-y-4 p-6">
			<div class="space-y-1">
				<p class="text-xs font-medium uppercase tracking-wide text-muted">
					{{ t('platformAnnouncements.inApp.kicker') }}
				</p>
				<h2 class="text-lg font-semibold text-default">
					{{ title.trim() || t('platformAnnouncements.inApp.previewTitleFallback') }}
				</h2>
			</div>
			<img
				v-if="shownImage"
				:src="shownImage"
				alt=""
				class="max-h-48 w-full rounded-lg object-contain"
				@error="imageBroken = true"
			>
			<p v-else-if="imageUrl.trim() && imageBroken" class="text-xs text-muted">
				{{ t('platformAnnouncements.inApp.imageFailed') }}
			</p>
			<div
				v-if="bodyHtml.trim()"
				class="prose prose-sm dark:prose-invert max-w-none"
				v-html="bodyHtml"
			/>
			<p v-else class="text-sm text-muted">
				{{ t('platformAnnouncements.inApp.previewEmpty') }}
			</p>
			<div class="flex flex-wrap justify-end gap-2">
				<UButton color="neutral" variant="soft" disabled>
					{{ t('platformAnnouncements.inApp.gotIt') }}
				</UButton>
				<UButton v-if="ctaLabel.trim() && ctaUrl.trim()" color="primary" disabled>
					{{ ctaLabel.trim() }}
				</UButton>
			</div>
		</div>
	</ZAnnouncementPreviewShell>
</template>

<script setup lang="ts">
const props = defineProps<{
	title: string;
	bodyHtml: string;
	imageUrl: string;
	ctaLabel: string;
	ctaUrl: string;
}>();

const { t } = useI18n();
const imageBroken = ref(false);

const shownImage = computed(() => {
	if (imageBroken.value) return '';
	return props.imageUrl.trim();
});

watch(() => props.imageUrl, () => {
	imageBroken.value = false;
});
</script>
