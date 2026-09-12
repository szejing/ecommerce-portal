import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveNotificationMessage } from '../../app/utils/notification-message';

describe('resolveNotificationMessage', () => {
	const t = vi.fn((key: string, values?: Record<string, unknown>) => {
		if (key === 'components.fulfillment.notifications.markedAs') {
			return `Fulfillment marked as ${values?.status}`;
		}
		if (key === 'components.fulfillment.notifications.created') {
			return 'Fulfillment created';
		}
		if (key === 'options.processing') {
			return 'Processing';
		}
		return key;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		t.mockClear();
	});

	it('translates i18n keys through $i18n.t', () => {
		vi.stubGlobal('useNuxtApp', () => ({ $i18n: { t } }));

		expect(resolveNotificationMessage('components.fulfillment.notifications.created')).toBe('Fulfillment created');
		expect(t).toHaveBeenCalledWith('components.fulfillment.notifications.created');
	});

	it('translates interpolation values that are themselves i18n keys', () => {
		vi.stubGlobal('useNuxtApp', () => ({ $i18n: { t } }));

		expect(
			resolveNotificationMessage('components.fulfillment.notifications.markedAs', {
				status: 'options.processing',
			}),
		).toBe('Fulfillment marked as Processing');
		expect(t).toHaveBeenCalledWith('options.processing');
		expect(t).toHaveBeenCalledWith('components.fulfillment.notifications.markedAs', { status: 'Processing' });
	});

	it('leaves already-translated copy unchanged', () => {
		vi.stubGlobal('useNuxtApp', () => ({ $i18n: { t } }));

		expect(resolveNotificationMessage('Fulfillment created')).toBe('Fulfillment created');
		expect(t).not.toHaveBeenCalled();
	});

	it('returns the original string when i18n is unavailable', () => {
		vi.stubGlobal('useNuxtApp', () => {
			throw new Error('no nuxt');
		});

		expect(resolveNotificationMessage('components.fulfillment.notifications.created')).toBe(
			'components.fulfillment.notifications.created',
		);
	});
});
