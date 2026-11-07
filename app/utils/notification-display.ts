import type { NotificationItem } from '~/utils/types/notification';

type NotificationDescriptionItem = Pick<NotificationItem, 'summary_lines' | 'subtitle' | 'notification_description' | 'title'>;
type NotificationReferenceItem = Pick<NotificationItem, 'order_no' | 'ref_no' | 'title'>;

const NAMED_HTML_ENTITIES: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' ',
};

export const toNotificationPlainText = (value: string): string => {
	const withoutTags = value
		.replace(/<br\s*\/?>/gi, ' ')
		.replace(/<\/(p|div|li|h[1-6]|tr)>/gi, ' ')
		.replace(/<[^>]*>/g, '');

	const decoded = withoutTags.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
		const token = entity.toLowerCase();

		if (token.startsWith('#x')) {
			const code = Number.parseInt(token.slice(2), 16);
			return Number.isFinite(code) ? String.fromCodePoint(code) : match;
		}

		if (token.startsWith('#')) {
			const code = Number.parseInt(token.slice(1), 10);
			return Number.isFinite(code) ? String.fromCodePoint(code) : match;
		}

		return NAMED_HTML_ENTITIES[token] ?? match;
	});

	return decoded.replace(/\s+/g, ' ').trim();
};

export const getNotificationDisplayDescription = (item: NotificationDescriptionItem): string => {
	if (item.notification_description) {
		return item.notification_description;
	}

	const summary = item.summary_lines?.filter((line) => !/^(Status|Payment):/i.test(line.trim())) ?? [];

	if (summary.length > 0) {
		return summary.join(' · ');
	}

	return item.subtitle ?? item.notification_description ?? item.title;
};

export const getNotificationDisplayReferenceId = (item: NotificationReferenceItem): string => {
	const titleOrderId = item.title.match(/#([A-Z0-9-]+)/i)?.[1];

	return item.order_no || titleOrderId || item.ref_no || '-';
};
