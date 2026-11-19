<script setup lang="ts">
import type { TicketStatus } from 'yeppi-common';

type AdmissionRow = { id: string; to_status: TicketStatus; staff_id: string; created_at: string };

const { eventId } = defineProps<{ eventId: string }>();
const ticketId = defineModel<string>();
const historyPage = ref(1);
const historyOpen = computed({
	get: () => Boolean(ticketId.value),
	set: (open) => { if (!open) ticketId.value = undefined; },
});

const { data: history, status: historyStatus, error: historyError, execute: loadHistory, clear } = useAsyncData(
	`ticket-admissions-${eventId}`,
	() => $fetch<{ history: AdmissionRow[]; total: number }>(`/merchant/events/${eventId}/tickets/${ticketId.value}/admissions`, {
		query: { skip: (historyPage.value - 1) * 25 },
	}),
	{ immediate: false, server: false },
);
watch(ticketId, () => {
	clear();
	if (historyPage.value !== 1) historyPage.value = 1;
	else if (ticketId.value) void loadHistory();
});
watch(historyPage, () => { if (ticketId.value) void loadHistory(); });
</script>

<template>
	<UModal v-model:open="historyOpen" title="Admission history">
		<template #body>
			<p v-if="historyStatus === 'pending'" aria-live="polite">Loading admission history…</p>
			<UAlert v-else-if="historyError" color="error" title="Admission history couldn’t load">
				<template #actions><UButton variant="soft" @click="loadHistory()">Try again</UButton></template>
			</UAlert>
			<p v-else-if="!history?.history.length" class="text-muted">This ticket has no scans yet.</p>
			<ul v-else class="divide-y divide-default">
				<li v-for="row in history.history" :key="row.id" class="flex flex-wrap items-center justify-between gap-2 py-3">
					<UBadge variant="soft" class="capitalize">{{ row.to_status.replaceAll('_', ' ') }}</UBadge>
					<p class="text-sm text-muted">{{ new Date(row.created_at).toLocaleString() }}<span v-if="row.staff_id"> · {{ row.staff_id }}</span></p>
				</li>
			</ul>
			<UPagination v-if="(history?.total ?? 0) > 25" v-model:page="historyPage" :total="history?.total ?? 0" :items-per-page="25" />
		</template>
	</UModal>
</template>
