<template>
	<ZAnnouncementPreviewShell
		:title="t('platformAnnouncements.email.previewTitle')"
		:badge="t('platformAnnouncements.email.previewBadge')"
		:hint="t('platformAnnouncements.email.previewHint')"
	>
		<template #header>
			<div class="border-b border-default bg-default px-4 py-3">
				<p class="text-xs text-muted">{{ t('platformAnnouncements.email.subject') }}</p>
				<p class="truncate text-sm font-medium text-default">
					{{ subject.trim() || t('platformAnnouncements.email.previewEmptySubject') }}
				</p>
			</div>
		</template>
		<iframe
			class="h-[28rem] w-full border-0 bg-white"
			sandbox=""
			:title="t('platformAnnouncements.email.previewTitle')"
			:srcdoc="srcdoc"
		/>
	</ZAnnouncementPreviewShell>
</template>

<script setup lang="ts">
import { escapePreviewHtml } from '~/utils/platform-announcement';

const props = defineProps<{
	subject: string;
	bodyHtml: string;
	ctaLabel: string;
	ctaUrl: string;
	platformName: string;
}>();

const { t } = useI18n();

const srcdoc = computed(() => {
	const platformName = escapePreviewHtml(props.platformName || 'Wemotoo');
	const merchantName = escapePreviewHtml(t('platformAnnouncements.email.previewMerchant'));
	const body = props.bodyHtml.trim()
		? props.bodyHtml
		: `<p style="color:#9ca3af;">${escapePreviewHtml(t('platformAnnouncements.email.previewEmpty'))}</p>`;
	const label = props.ctaLabel.trim();
	const url = props.ctaUrl.trim();
	const cta = label && url
		? `<p style="margin:24px 0;"><a href="${escapePreviewHtml(url)}" style="background:#EE7F01;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:600;display:inline-block;">${escapePreviewHtml(label)}</a></p>`
		: '';

	return `<!DOCTYPE html><html><body style="margin:0;font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.6;background:#ffffff;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
<p style="color:#6b7280;font-size:13px;margin:0 0 16px 0;">${platformName} · ${merchantName}</p>
${body}
${cta}
</div></body></html>`;
});
</script>
