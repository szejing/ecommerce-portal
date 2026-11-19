<script setup lang="ts">
import { parseAbsolute, parseDateTime, toCalendarDateTime } from '@internationalized/date';
import { EventStatus, ParticipantInformationPolicy } from 'yeppi-common';

type TicketType = {
	id: string; code: string; name: string; currency_code: string;
	price: number; early_bird_price: number | null; is_active: boolean;
};
type EventDetail = {
	id: string; name: string; description: string; venue: string; timezone: string;
	starts_at: string; ends_at: string; sales_start: string; sales_end: string;
	early_bird_start: string | null; early_bird_end: string | null;
	participant_policy: ParticipantInformationPolicy | null; status: EventStatus;
	policy_url: string | null; ticket_types: TicketType[];
};
type TicketRow = {
	id: string; order_no: string; participant_name: string | null; status: string; refunded: boolean; record_type: 'order' | 'sale';
};
const route = useRoute();
const id = String(route.params.id);
const isNew = id === 'new';
const api = `/merchant/events/${id}`;
const toast = useToast();
const requestFetch = useRequestFetch();
const activeTab = ref('details');
const busy = ref(false);
const failure = ref('');
const cancelling = ref(false);
const policyFile = ref<File>();
const emailOpen = ref(false);
const refundOpen = ref(false);
const emailDraft = reactive({ subject: '', message: '' });
const emailPreview = ref<{ subject: string; message: string; recipient_count: number }>();
const emailResult = ref<{ sent: number; failed: number; skipped: number }>();
const emailRequest = ref('');
const refundTickets = ref<TicketRow[]>([]);
const refundReference = ref('');
const refundRequest = ref('');
const refundQuote = ref<{ amount: number; cash_charge_max: number; currency_code: string }>();
const cashChargeRefund = ref(0);
const refundTotal = computed(() => Math.round(((refundQuote.value?.amount ?? 0) + Number(cashChargeRefund.value)) * 100) / 100);
const orderFilter = computed(() => refundTickets.value[0]?.order_no);
watch(emailDraft, () => {
	emailPreview.value = undefined;
	emailResult.value = undefined;
	emailRequest.value = '';
});

const editType = ref<string | null>(null);
const typeOpen = ref(false);
const ticketPage = ref(1);
const { data, error: fetchError, refresh } = await useAsyncData(`event-${id}`,
	() => isNew ? Promise.resolve(null) : requestFetch<EventDetail>(api));
const { data: ticketList, status: ticketStatus, error: ticketError, execute: loadTickets } = useAsyncData(
	`event-tickets-${id}`,
	() => $fetch<{ tickets: TicketRow[]; total: number }>(`${api}/tickets`, { query: { skip: (ticketPage.value - 1) * 25 } }),
	{ immediate: false, server: false },
);
watch([activeTab, ticketPage], () => {
	if (activeTab.value === 'participants') void loadTickets();
});
const eventTimezone = data.value?.timezone ?? 'Asia/Kuala_Lumpur';
const inputDate = (value?: string | null) => value
	? toCalendarDateTime(parseAbsolute(value, eventTimezone)).toString().slice(0, 16)
	: '';
const iso = (value: string, timezone: string) => value
	? parseDateTime(value).toDate(timezone, 'reject').toISOString()
	: null;
const form = reactive({
	name: data.value?.name ?? '', venue: data.value?.venue ?? '', description: data.value?.description ?? '',
	timezone: data.value?.timezone ?? 'Asia/Kuala_Lumpur',
	starts_at: inputDate(data.value?.starts_at), ends_at: inputDate(data.value?.ends_at),
	sales_start: inputDate(data.value?.sales_start), sales_end: inputDate(data.value?.sales_end),
	early_bird_start: inputDate(data.value?.early_bird_start), early_bird_end: inputDate(data.value?.early_bird_end),
	participant_policy: data.value?.participant_policy ?? 'inherit',
});
const type = reactive({ code: '', name: '', currency_code: 'MYR', price: 0, early_bird_price: null as number | null, is_active: true });
const policies = [
	{ label: 'Use merchant default', value: 'inherit' },
	{ label: 'Buyer only', value: ParticipantInformationPolicy.BUYER_ONLY },
	{ label: 'All participants required', value: ParticipantInformationPolicy.ALL_PARTICIPANTS },
];
const tabs = [
	{ label: 'Details', value: 'details', icon: 'i-lucide-calendar-days' },
	{ label: 'Ticket types', value: 'types', icon: 'i-lucide-ticket' },
	{ label: 'Participants', value: 'participants', icon: 'i-lucide-users' },
];
const cancelled = computed(() => data.value?.status === EventStatus.CANCELLED);
const formatMoney = (value: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);

async function run(work: () => Promise<void>) {
	if (busy.value) return;
	busy.value = true;
	failure.value = '';
	try {
		await work();
	} catch (error) {
		const response = error as { data?: { message?: string }; message?: string };
		failure.value = response.data?.message || (error instanceof RangeError ? 'Check the time zone and schedule.' : 'The change could not be saved. Try again.');
	} finally {
		busy.value = false;
	}
}

async function save() {
	await run(async () => {
		const event = await $fetch<EventDetail>(isNew ? '/merchant/events' : api, {
			method: isNew ? 'POST' : 'PATCH',
			body: { ...form, starts_at: iso(form.starts_at, form.timezone), ends_at: iso(form.ends_at, form.timezone),
				sales_start: iso(form.sales_start, form.timezone), sales_end: iso(form.sales_end, form.timezone),
				early_bird_start: iso(form.early_bird_start, form.timezone), early_bird_end: iso(form.early_bird_end, form.timezone),
				participant_policy: form.participant_policy === 'inherit' ? null : form.participant_policy },
		});
		toast.add({ title: 'Event saved', color: 'primary' });
		if (isNew) await navigateTo(`/events/${event.id}`);
		else await refresh();
	});
}

function openType(row?: TicketType) {
	editType.value = row?.id ?? null;
	Object.assign(type, { code: row?.code ?? '', name: row?.name ?? '', price: row?.price ?? 0,
		early_bird_price: row?.early_bird_price ?? null, currency_code: row?.currency_code ?? 'MYR',
		is_active: row?.is_active ?? true });
	failure.value = '';
	typeOpen.value = true;
}

async function saveType() {
	await run(async () => {
		const endpoint = `${api}/ticket-types${editType.value ? '/' + editType.value : ''}`;
		await $fetch(endpoint, { method: editType.value ? 'PATCH' : 'POST', body: type });
		typeOpen.value = false;
		await refresh();
		toast.add({ title: 'Ticket type saved', color: 'primary' });
	});
}

async function setStatus(status: EventStatus) {
	await run(async () => {
		await $fetch(`${api}/status`, { method: 'PATCH', body: { status } });
		cancelling.value = false;
		await refresh();
		toast.add({ title: status === EventStatus.CANCELLED ? 'Event cancelled' : 'Event published', color: 'primary' });
	});
}

async function previewEmail() {
	await run(async () => {
		emailPreview.value = await $fetch(`${api}/tickets/update-email/preview`, {
			method: 'POST', body: emailDraft,
		});
		emailRequest.value ||= crypto.randomUUID();
	});
}

async function sendEmail() {
	if (!emailPreview.value || !emailRequest.value) return;
	await run(async () => {
		emailResult.value = await $fetch(`${api}/tickets/update-email/send`, {
			method: 'POST', body: { ...emailDraft, request_id: emailRequest.value },
		});
	});
}

function toggleRefund(ticket: TicketRow, checked: boolean | 'indeterminate') {
	if (checked === true) refundTickets.value.push(ticket);
	else refundTickets.value = refundTickets.value.filter((row) => row.id !== ticket.id);
}

async function openRefund() {
	if (!orderFilter.value) return;
	refundRequest.value = crypto.randomUUID();
	refundReference.value = '';
	cashChargeRefund.value = 0;
	refundQuote.value = undefined;
	refundOpen.value = true;
	await run(async () => {
		refundQuote.value = await $fetch(`${api}/tickets/refund/preview`, {
			method: 'POST', body: { ticket_ids: refundTickets.value.map((row) => row.id), order_no: orderFilter.value },
		});
	});
}

async function recordRefund() {
	if (!orderFilter.value || !refundReference.value.trim() || !refundQuote.value) return;
	await run(async () => {
		const result = await $fetch<{ amount: number }>(`${api}/tickets/refund`, {
			method: 'POST',
			body: {
				ticket_ids: refundTickets.value.map((row) => row.id), order_no: orderFilter.value,
				reference: refundReference.value, request_id: refundRequest.value, expected_amount: refundTotal.value, cash_charge_refund: Number(cashChargeRefund.value),
			},
		});
		refundOpen.value = false;
		refundTickets.value = [];
		await loadTickets();
		toast.add({ title: 'Ticket refund recorded', description: String(result.amount), color: 'primary' });
	});
}

async function uploadPolicy() {
	const file = policyFile.value;
	if (!file) return;
	await run(async () => {
		if (file.size > 5 * 1024 * 1024) {
			failure.value = 'The policy PDF must be 5 MB or smaller.';
			return;
		}
		const pdfBase64 = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
			reader.onerror = reject;
			reader.readAsDataURL(file);
		});
		await $fetch(`${api}/policy`, { method: 'POST', body: { pdf_base64: pdfBase64 } });
		policyFile.value = undefined;
		await refresh();
		toast.add({ title: 'Policy uploaded', color: 'primary' });
	});
}
</script>

<template>
	<main class="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
		<UButton to="/events" variant="link" icon="i-lucide-arrow-left" class="-ms-2 min-h-11">Events</UButton>
		<UAlert v-if="fetchError" color="error" title="This event couldn’t load">
			<template #actions><UButton variant="soft" @click="refresh()">Try again</UButton></template>
		</UAlert>
		<template v-else>
			<header class="flex flex-wrap items-start justify-between gap-3">
				<div class="min-w-0">
					<h1 class="break-words text-2xl font-semibold text-highlighted">{{ isNew ? 'Create event' : data?.name }}</h1>
					<UBadge v-if="data" class="mt-2 capitalize" variant="soft" :color="cancelled ? 'error' : data.status === EventStatus.PUBLISHED ? 'success' : 'neutral'">{{ data.status }}</UBadge>
				</div>
				<div v-if="data" class="flex flex-wrap gap-2">
					<UButton variant="outline" icon="i-lucide-mail" @click="failure = ''; emailOpen = true">Send update email</UButton>
					<UButton v-if="data.status === EventStatus.DRAFT" :disabled="!data.ticket_types.some(row => row.is_active)" :loading="busy" @click="setStatus(EventStatus.PUBLISHED)">Publish event</UButton>
					<UButton v-if="!cancelled" color="error" variant="soft" @click="cancelling = true">Cancel event</UButton>
				</div>
			</header>
			<UAlert v-if="failure && !typeOpen && !cancelling && !emailOpen && !refundOpen" color="error" :title="failure" role="alert" />
			<UTabs v-if="data" v-model="activeTab" :items="tabs" :content="false" />
			<template v-if="activeTab === 'details'">
				<UForm :state="form" class="space-y-4" @submit="save">
					<UCard>
						<template #header><h2 class="font-semibold text-highlighted">Event details</h2></template>
						<div class="grid gap-4 sm:grid-cols-2">
							<UFormField label="Event name" name="name" required><UInput v-model="form.name" class="w-full" required :disabled="cancelled" maxlength="200" /></UFormField>
							<UFormField label="Venue" name="venue"><UInput v-model="form.venue" class="w-full" :disabled="cancelled" /></UFormField>
							<UFormField label="Description" name="description" class="sm:col-span-2"><UTextarea v-model="form.description" class="w-full" :disabled="cancelled" /></UFormField>
						</div>
					</UCard>
					<UCard>
						<template #header><h2 class="font-semibold text-highlighted">Schedule and sales</h2></template>
						<div class="grid gap-4 sm:grid-cols-2">
							<UFormField label="Starts" name="starts_at" required><UInput v-model="form.starts_at" class="w-full" type="datetime-local" required :disabled="cancelled" /></UFormField>
							<UFormField label="Ends" name="ends_at" required><UInput v-model="form.ends_at" class="w-full" type="datetime-local" required :disabled="cancelled" /></UFormField>
							<UFormField label="Event time zone" name="timezone" help="All date and time fields use this time zone." class="sm:col-span-2"><UInput v-model="form.timezone" class="w-full" :disabled="cancelled" /></UFormField>
							<UFormField label="Sales open" name="sales_start" help="Defaults to publication."><UInput v-model="form.sales_start" class="w-full" type="datetime-local" :disabled="cancelled" /></UFormField>
							<UFormField label="Sales close" name="sales_end" help="Defaults to event end."><UInput v-model="form.sales_end" class="w-full" type="datetime-local" :disabled="cancelled" /></UFormField>
							<UFormField label="Early bird starts" name="early_bird_start"><UInput v-model="form.early_bird_start" class="w-full" type="datetime-local" :disabled="cancelled" /></UFormField>
							<UFormField label="Early bird ends" name="early_bird_end"><UInput v-model="form.early_bird_end" class="w-full" type="datetime-local" :disabled="cancelled" /></UFormField>
						</div>
					</UCard>
					<UCard>
						<template #header><h2 class="font-semibold text-highlighted">Participant information</h2></template>
						<UFormField label="Details required at checkout" name="participant_policy">
							<USelect v-model="form.participant_policy" :items="policies" class="w-full sm:max-w-sm" :disabled="cancelled" />
						</UFormField>
					</UCard>
					<UButton v-if="!cancelled" type="submit" :loading="busy" class="min-h-11">Save event</UButton>
				</UForm>
				<UCard v-if="data">
					<template #header><h2 class="font-semibold text-highlighted">Event policy PDF</h2></template>
					<p class="mb-4 text-sm text-muted">Buyers must acknowledge the current PDF at checkout.</p>
					<UButton v-if="data.policy_url" :to="data.policy_url" target="_blank" rel="noopener noreferrer" variant="soft" icon="i-lucide-file-text" class="mb-3">View current policy</UButton>
					<div v-if="!cancelled" class="flex flex-wrap items-end gap-3">
						<UFormField label="Upload PDF" help="Maximum 5 MB."><UInput type="file" accept="application/pdf,.pdf" @change="policyFile = ($event.target as HTMLInputElement).files?.[0]" /></UFormField>
						<UButton variant="soft" class="min-h-11" :disabled="!policyFile" :loading="busy" @click="uploadPolicy">Upload policy</UButton>
					</div>
				</UCard>
			</template>
			<UCard v-else-if="activeTab === 'types' && data">
				<template #header>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="font-semibold text-highlighted">Ticket types</h2>
						<UButton v-if="!cancelled" icon="i-lucide-plus" class="min-h-11" @click="openType()">Add ticket type</UButton>
					</div>
				</template>
				<p v-if="!data.ticket_types.length" class="text-sm text-muted">Add a ticket type before publishing this event.</p>
				<ul v-else class="divide-y divide-default">
					<li v-for="row in data.ticket_types" :key="row.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
						<div class="min-w-0">
							<p class="break-words font-medium">{{ row.name }} <UBadge v-if="!row.is_active" variant="soft" color="neutral">Inactive</UBadge></p>
							<p class="text-sm text-muted tabular-nums">{{ formatMoney(row.price, row.currency_code) }}<span v-if="row.early_bird_price !== null"> · Early bird {{ formatMoney(row.early_bird_price, row.currency_code) }}</span></p>
						</div>
						<UButton v-if="!cancelled" variant="ghost" class="min-h-11" :aria-label="`Edit ${row.name}`" @click="openType(row)">Edit</UButton>
					</li>
				</ul>
			</UCard>
			<UCard v-else-if="activeTab === 'participants'">
				<template #header>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="font-semibold text-highlighted">Participants</h2>
						<UButton color="error" variant="soft" :disabled="!refundTickets.length" @click="openRefund">Record refund</UButton>
					</div>
				</template>
				<p v-if="ticketStatus === 'pending'" role="status" class="text-sm text-muted">Loading tickets…</p>
				<UAlert v-else-if="ticketError" color="error" title="Tickets couldn’t load">
					<template #actions><UButton variant="soft" @click="loadTickets()">Try again</UButton></template>
				</UAlert>
				<p v-else-if="!ticketList?.tickets.length" class="text-sm text-muted">No tickets have been purchased.</p>
				<ul v-else class="divide-y divide-default">
					<li v-for="ticket in ticketList.tickets" :key="ticket.id" class="flex flex-wrap items-center justify-between gap-2 py-3">
						<div class="flex items-center gap-3">
							<UCheckbox v-if="!ticket.refunded" :model-value="refundTickets.some(row => row.id === ticket.id)"
								:disabled="!!orderFilter && orderFilter !== ticket.order_no" :aria-label="`Select ticket for ${ticket.participant_name || ticket.order_no}`"
								@update:model-value="toggleRefund(ticket, $event)" />
							<div><p class="font-medium">{{ ticket.participant_name || 'Unnamed participant' }}</p>
								<NuxtLink :to="`/orders/${ticket.order_no}?type=${ticket.record_type}`" class="text-sm text-primary hover:underline">Order #{{ ticket.order_no }}</NuxtLink>
							</div>
						</div>
						<UBadge variant="soft" :color="ticket.refunded ? 'error' : 'neutral'" class="capitalize">{{ ticket.refunded ? 'Refunded' : ticket.status.replaceAll('_', ' ') }}</UBadge>
					</li>
				</ul>
				<UPagination v-if="(ticketList?.total ?? 0) > 25" v-model:page="ticketPage" :total="ticketList?.total ?? 0" :items-per-page="25" />
			</UCard>
		</template>
		<UModal v-model:open="typeOpen" :title="editType ? 'Edit ticket type' : 'Add ticket type'">
			<template #body>
				<UForm :state="type" class="space-y-4" @submit="saveType">
					<UAlert v-if="failure" color="error" :title="failure" role="alert" />
					<UFormField label="Name" name="name" required><UInput v-model="type.name" class="w-full" required /></UFormField>
					<div class="grid gap-3 sm:grid-cols-2">
						<UFormField label="Code" name="code" required><UInput v-model="type.code" class="w-full" maxlength="30" required /></UFormField>
						<UFormField label="Currency" name="currency_code" required><UInput v-model="type.currency_code" class="w-full" maxlength="3" required /></UFormField>
						<UFormField label="Regular price" name="price" required><UInput v-model.number="type.price" class="w-full" type="number" min="0" step="0.01" required /></UFormField>
						<UFormField label="Early-bird price" name="early_bird_price"><UInput :model-value="type.early_bird_price?.toString() ?? ''" class="w-full" type="number" min="0" step="0.01" @update:model-value="type.early_bird_price = $event === '' ? null : Number($event)" /></UFormField>
					</div>
					<UCheckbox v-model="type.is_active" label="Available for sale" />
					<div class="flex justify-end gap-2"><UButton variant="ghost" @click="typeOpen = false">Close</UButton><UButton type="submit" :loading="busy">Save ticket type</UButton></div>
				</UForm>
			</template>
		</UModal>
		<UModal v-model:open="emailOpen" title="Send event update" description="The message goes to buyers and current ticket holders.">
			<template #body>
				<UForm :state="emailDraft" class="space-y-4" @submit="previewEmail">
					<UAlert v-if="failure" color="error" :title="failure" />
					<UFormField label="Subject" name="subject" required><UInput v-model="emailDraft.subject" required maxlength="150" class="w-full" :disabled="busy" /></UFormField>
					<UFormField label="Message" name="message" required><UTextarea v-model="emailDraft.message" required maxlength="6000" class="w-full" :disabled="busy" /></UFormField>
					<UButton type="submit" variant="soft" :loading="busy">Preview recipients</UButton>
					<div v-if="emailPreview" class="space-y-2 rounded-lg bg-elevated p-4">
						<p class="font-medium">{{ emailPreview.subject }}</p>
						<p class="whitespace-pre-wrap break-words text-sm">{{ emailPreview.message }}</p>
						<p class="text-sm text-muted">{{ emailPreview.recipient_count }} recipients</p>
					</div>
					<UAlert v-if="emailResult" color="neutral" :title="`${emailResult.sent} sent · ${emailResult.failed} failed · ${emailResult.skipped} already handled`" />
					<UButton v-if="emailPreview && (!emailResult || emailResult.failed)" :disabled="!emailPreview.recipient_count" :loading="busy" @click="sendEmail">{{ emailResult ? 'Retry failed sends' : 'Send update email' }}</UButton>
				</UForm>
			</template>
		</UModal>
		<UModal v-model:open="refundOpen" title="Record ticket refund" description="Confirm you have already returned the money to the original payer. The selected tickets will no longer admit.">
			<template #body>
				<UForm :state="{ refundReference }" class="space-y-4" @submit="recordRefund">
					<UAlert v-if="failure" color="error" :title="failure" />
					<p class="text-sm">{{ refundTickets.length }} selected for Order #{{ orderFilter }}</p>
					<UFormField label="Refund reference" required><UInput v-model="refundReference" required maxlength="120" class="w-full" /></UFormField>
					<template v-if="refundQuote">
						<UFormField v-if="refundQuote.cash_charge_max" label="Cash charge to refund" help="Optional. Defaults to zero.">
							<UInput v-model.number="cashChargeRefund" type="number" min="0" :max="refundQuote.cash_charge_max" step="0.01" class="w-full" />
						</UFormField>
						<p class="font-semibold tabular-nums">Refund total {{ formatMoney(refundTotal, refundQuote.currency_code) }}</p>
					</template>
					<UButton type="submit" color="error" :disabled="!refundQuote" :loading="busy">Record refund</UButton>
				</UForm>
			</template>
		</UModal>
		<UModal v-model:open="cancelling" title="Cancel event?" description="This closes sales and stops ticket transfers and admission. Refunds must be recorded separately.">
			<template #footer>
				<UAlert v-if="failure" color="error" :title="failure" role="alert" />
				<UButton variant="ghost" @click="cancelling = false">Keep event</UButton>
				<UButton color="error" :loading="busy" @click="setStatus(EventStatus.CANCELLED)">Cancel event</UButton>
			</template>
		</UModal>
	</main>
</template>
