import type { NotificationSeverity, NotificationType } from 'yeppi-common';

export type NotificationAction = {
	label: string;
	url: string;
};

export type NotificationItem = {
	id: string;
	notification_ids?: string[];
	title: string;
	subtitle?: string;
	order_no?: string;
	summary_lines?: string[];
	ref_no?: string;
	status?: string;
	scheduled_at?: string | Date;
	created_at?: string | Date;
	updated_at?: string | Date;
	read_at?: string;
	opened_at?: string;
	image_url?: string;
	notification_type?: NotificationType;
	notification_title?: string;
	notification_description?: string;
	notification_severity?: NotificationSeverity;
	action: NotificationAction;
};

export type Notification = {
	type: NotificationType;
	title: string;
	description: string;
	severity: NotificationSeverity;
	count: number;
	action: NotificationAction;
	items: NotificationItem[];
};

export type NotificationCenter = {
	generated_at: string | Date;
	total_count: number;
	notifications: Notification[];
	handled_scenarios: NotificationType[];
};

export type NotificationEntry = {
	type: NotificationType;
	severity: NotificationSeverity;
	item: NotificationItem;
};

export type NotificationBadgeColor = 'primary' | 'error' | 'success' | 'warning' | 'secondary' | 'info' | 'neutral';

export type NotificationDisplayRow = NotificationEntry & {
	key: string;
	ref_no: string;
	dateTime: string;
	description: string;
	lastUpdated: string;
	descriptionPrefix?: string;
	statusBadge?: {
		label: string;
		color: NotificationBadgeColor;
	};
	referenceBadge?: {
		label: string;
		color: NotificationBadgeColor;
	};
	isRead: boolean;
};
