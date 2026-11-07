import { format } from 'date-fns';
import { PlatformEmailBlastStatus, PlatformInAppAnnouncementStatus } from 'yeppi-common';

export type PlatformAnnouncementRow = {
	id: string;
	title?: string;
	subject?: string;
	status?: string;
	created_at?: string;
	scheduled_at?: string | null;
	sent_at?: string | null;
	published_at?: string | null;
	merchant_ids?: string[] | null;
};

export function announcementStatusColor(status: string | undefined) {
	switch (status) {
		case PlatformEmailBlastStatus.SENT:
		case PlatformInAppAnnouncementStatus.PUBLISHED:
			return 'success' as const;
		case PlatformEmailBlastStatus.SCHEDULED:
		case PlatformEmailBlastStatus.SENDING:
			return 'warning' as const;
		case PlatformEmailBlastStatus.CANCELLED:
			return 'error' as const;
		default:
			return 'neutral' as const;
	}
}

export function formatAnnouncementWhen(value: unknown) {
	if (!value) return '';
	const date = new Date(String(value));
	if (Number.isNaN(date.getTime())) return '';
	return format(date, 'yyyy-MM-dd HH:mm');
}

export function emailSampleHtml(parts: {
	hello: string;
	before: string;
	when: string;
	after: string;
	safe: string;
}) {
	return `<p>${escapePreviewHtml(parts.hello)}</p>\n<p>${escapePreviewHtml(parts.before)}<strong>${escapePreviewHtml(parts.when)}</strong>${escapePreviewHtml(parts.after)}</p>\n<p>${escapePreviewHtml(parts.safe)}</p>`;
}

export function inAppSampleHtml(parts: {
	before: string;
	emphasis: string;
	after: string;
	follow: string;
}) {
	return `<p>${escapePreviewHtml(parts.before)}<strong>${escapePreviewHtml(parts.emphasis)}</strong>${escapePreviewHtml(parts.after)}</p>\n<p>${escapePreviewHtml(parts.follow)}</p>`;
}

export function announcementHtmlHasText(html: string) {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim().length > 0;
}

export function escapePreviewHtml(value: string) {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}
