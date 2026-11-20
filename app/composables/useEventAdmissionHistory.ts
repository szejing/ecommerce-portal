import type { AdmissionHistoryRow } from '~/utils/types/event-management';

export function useEventAdmissionHistory(eventId: string) {
	const ticketId = ref<string>();
	const page = ref(1);
	const open = computed({
		get: () => Boolean(ticketId.value),
		set: (value) => { if (!value) ticketId.value = undefined; },
	});
	const { data, status, error, execute, clear } = useAsyncData(
		`ticket-admissions-${eventId}`,
		(_, { signal }) => $fetch<{ history: AdmissionHistoryRow[]; total: number }>(
			`/merchant/events/${eventId}/tickets/${ticketId.value}/admissions`,
			{ query: { skip: (page.value - 1) * 25 }, signal },
		),
		{ immediate: false, server: false },
	);

	watch([ticketId, page], () => {
		clear();
		if (ticketId.value) void execute();
	});

	function show(id: string) {
		page.value = 1;
		ticketId.value = id;
	}

	return { open, page, data, status, error, reload: execute, show };
}
