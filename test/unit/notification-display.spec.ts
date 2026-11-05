import { describe, expect, it } from 'vitest';
import { getNotificationDisplayDescription, getNotificationDisplayReferenceId, toNotificationPlainText } from '../../app/utils/notification-display';

describe('getNotificationDisplayDescription', () => {
	it('uses the raw notification description before summary lines', () => {
		expect(
			getNotificationDisplayDescription({
				title: 'New order #ORD-001',
				subtitle: 'Payment: paid',
				notification_description: 'New order waiting for admin review.',
				summary_lines: ['Helmet x 1', 'Gloves x 2', 'Payment: paid'],
			}),
		).toBe('New order waiting for admin review.');
	});

	it('strips html tags so in-app announcement bodies stay readable', () => {
		expect(
			toNotificationPlainText(
				"<p>Last month's payout report is ready under <strong>Sales</strong>.</p> <p>Open it when you have a minute. Nothing else is required.</p>",
			),
		).toBe("Last month's payout report is ready under Sales. Open it when you have a minute. Nothing else is required.");
	});

	it('decodes html entities and keeps plain descriptions unchanged', () => {
		expect(toNotificationPlainText('Fish &amp; chips<br>today')).toBe('Fish & chips today');
		expect(toNotificationPlainText('New order waiting for admin review.')).toBe('New order waiting for admin review.');
	});

	it('uses ref_no when a notification has no order id', () => {
		expect(
			getNotificationDisplayReferenceId({
				title: 'New appointment for john doe',
				ref_no: 'APPT-001',
			}),
		).toBe('APPT-001');
	});
});
