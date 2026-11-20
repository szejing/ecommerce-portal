import type { TicketStatus } from 'yeppi-common';

export type AdmissionHistoryRow = {
	id: string;
	to_status: TicketStatus;
	staff_id: string;
	created_at: string;
};

export type EventUpdateDraft = { subject: string; message: string };
export type EventUpdatePreview = EventUpdateDraft & { recipient_count: number };
export type EventUpdateDelivery = { sent: number; failed: number; skipped: number };
