import type { EventUpdateDelivery, EventUpdateDraft, EventUpdatePreview } from '~/utils/types/event-management';

export function useEventUpdateEmail(eventId: string) {
	const { t } = useI18n();
	const open = ref(false);
	const draft = reactive<EventUpdateDraft>({ subject: '', message: '' });
	const preview = ref<EventUpdatePreview>();
	const result = ref<EventUpdateDelivery>();
	const requestId = ref('');
	const busy = ref(false);
	const failure = ref('');
	const endpoint = `/merchant/events/${eventId}/tickets/update-email`;

	watch(draft, () => {
		preview.value = undefined;
		result.value = undefined;
		requestId.value = '';
	});

	async function previewEmail() {
		if (busy.value) return;
		busy.value = true;
		failure.value = '';
		try {
			preview.value = await $fetch<EventUpdatePreview>(`${endpoint}/preview`, { method: 'POST', body: draft });
			requestId.value ||= crypto.randomUUID();
		} catch {
			failure.value = t('eventManagement.email.previewFailed');
		} finally {
			busy.value = false;
		}
	}

	async function sendEmail() {
		if (!preview.value || !requestId.value || busy.value) return;
		busy.value = true;
		failure.value = '';
		try {
			result.value = await $fetch<EventUpdateDelivery>(`${endpoint}/send`, {
				method: 'POST',
				body: { ...draft, request_id: requestId.value },
			});
		} catch {
			failure.value = t('eventManagement.email.sendFailed');
		} finally {
			busy.value = false;
		}
	}

	return { open, draft, preview, result, busy, failure, previewEmail, sendEmail };
}
