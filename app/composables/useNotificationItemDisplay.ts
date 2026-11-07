import { format } from 'date-fns';
import { toNotificationPlainText } from '~/utils/notification-display';
import type { NotificationItem } from '~/utils/types/notification';

export const useNotificationItemDisplay = () => {
	const formatDateTime = (date?: string | Date) => {
		if (!date) {
			return '-';
		}

		return format(new Date(date), 'dd MMM, h:mm a');
	};

	const formatItemMeta = (item: NotificationItem) => {
		const date = item.scheduled_at ?? item.updated_at ?? item.created_at;
		const parts = [item.status, item.ref_no].filter((part): part is string => !!part);

		if (date) {
			parts.push(formatDateTime(date));
		}

		return parts.join(' · ');
	};

	const getSummaryLines = (item: NotificationItem) => {
		const lines = item.summary_lines?.length
			? item.summary_lines
			: [item.subtitle].filter((line): line is string => !!line);

		return lines.map((line) => toNotificationPlainText(line)).filter((line) => line.length > 0);
	};

	return {
		formatDateTime,
		formatItemMeta,
		getSummaryLines,
	};
};
