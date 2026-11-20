import { parseAbsolute, parseDateTime, toCalendarDateTime } from '@internationalized/date';
import { EventStatus, ParticipantInformationPolicy, UserRoles } from 'yeppi-common';
import { useAuthStore } from '~/stores/Auth/Auth';

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
	id: string; order_no: string; participant_name: string | null; status: string; refunded: boolean; record_type: 'order' | 'sale'; holder_customer_no: string | null;
};
type ScheduleField = 'starts_at' | 'ends_at' | 'sales_start' | 'sales_end' | 'early_bird_start' | 'early_bird_end';
type RefundQuote = { amount: number; cash_charge_max: number; currency_code: string };

export function useEventEditor(id: string) {
	const { t } = useI18n();
	const isNew = id === 'new';
	const api = `/merchant/events/${id}`;
	const toast = useToast();
	const auth = useAuthStore();
	const canManageMoney = computed(() => auth.user?.role === UserRoles.MERCHANT_ADMIN);
	const requestFetch = useRequestFetch();
	const activeTab = ref('details');
	const busy = ref(false);
	const failure = ref('');
	const email = useEventUpdateEmail(id);
	const admission = useEventAdmissionHistory(id);
	const cancelling = ref(false);
	const policyFile = ref<File>();
	const refundOpen = ref(false);
	const refundTickets = ref<TicketRow[]>([]);
	const refundReference = ref('');
	const refundRequest = ref('');
	const refundQuote = ref<RefundQuote>();
	const cashChargeRefund = ref(0);
	const refundTotal = computed(() => Math.round(((refundQuote.value?.amount ?? 0) + Number(cashChargeRefund.value)) * 100) / 100);
	const orderFilter = computed(() => refundTickets.value[0]?.order_no);
	const editType = ref<string | null>(null);
	const typeOpen = ref(false);
	const ticketPage = ref(1);
	const ready = useAsyncData(`event-${id}`,
		() => isNew ? Promise.resolve(null) : requestFetch<EventDetail>(api));
	const { data, error: fetchError, refresh } = ready;
	const { data: ticketList, status: ticketStatus, error: ticketError, execute: loadTickets } = useAsyncData(
		`event-tickets-${id}`,
		() => $fetch<{ tickets: TicketRow[]; total: number }>(`${api}/tickets`, { query: { skip: (ticketPage.value - 1) * 25 } }),
		{ immediate: false, server: false },
	);
	watch([activeTab, ticketPage], () => {
		if (activeTab.value === 'participants') void loadTickets();
	});
	const inputDate = (value: string | null | undefined, timezone: string) => value
		? toCalendarDateTime(parseAbsolute(value, timezone)).toString().slice(0, 16)
		: '';

	function initialForm(event?: EventDetail | null) {
		const timezone = event?.timezone ?? 'Asia/Kuala_Lumpur';
		return {
			name: event?.name ?? '', venue: event?.venue ?? '', description: event?.description ?? '',
			timezone,
			starts_at: inputDate(event?.starts_at, timezone), ends_at: inputDate(event?.ends_at, timezone),
			sales_start: inputDate(event?.sales_start, timezone), sales_end: inputDate(event?.sales_end, timezone),
			early_bird_start: inputDate(event?.early_bird_start, timezone), early_bird_end: inputDate(event?.early_bird_end, timezone),
			participant_policy: event?.participant_policy ?? 'inherit',
		};
	}
	const form = reactive(initialForm(data.value));
	if (!isNew && !data.value) {
		const stop = watch(data, (event) => {
			if (!event) return;
			Object.assign(form, initialForm(event));
			stop();
		}, { flush: 'sync' });
	}
	const type = reactive({ code: '', name: '', currency_code: 'MYR', price: 0, early_bird_price: null as number | null, is_active: true });
	const policies = computed(() => [
		{ label: t('eventManagement.useMerchantDefault'), value: 'inherit' },
		{ label: t('eventManagement.buyerOnly'), value: ParticipantInformationPolicy.BUYER_ONLY },
		{ label: t('eventManagement.allParticipants'), value: ParticipantInformationPolicy.ALL_PARTICIPANTS },
	]);
	const tabs = computed(() => [
		{ label: t('eventManagement.details'), value: 'details', icon: 'i-lucide-calendar-days' },
		{ label: t('eventManagement.ticketTypes'), value: 'types', icon: 'i-lucide-ticket' },
		{ label: t('eventManagement.participants'), value: 'participants', icon: 'i-lucide-users' },
	]);
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
			failure.value = response.data?.message || (error instanceof RangeError ? t('eventManagement.timeZoneError') : t('eventManagement.saveFailed'));
		} finally {
			busy.value = false;
		}
	}

	function scheduleValue(field: ScheduleField) {
		const current = data.value;
		const value = form[field];
		if (current && form.timezone === current.timezone && value === inputDate(current[field], current.timezone)) {
			return current[field];
		}
		return value ? parseDateTime(value).toDate(form.timezone, 'reject').toISOString() : null;
	}

	async function save() {
		await run(async () => {
			const event = await $fetch<EventDetail>(isNew ? '/merchant/events' : api, {
				method: isNew ? 'POST' : 'PATCH',
				body: { ...form, starts_at: scheduleValue('starts_at'), ends_at: scheduleValue('ends_at'),
					sales_start: scheduleValue('sales_start'), sales_end: scheduleValue('sales_end'),
					early_bird_start: scheduleValue('early_bird_start'), early_bird_end: scheduleValue('early_bird_end'),
					participant_policy: form.participant_policy === 'inherit' ? null : form.participant_policy },
			});
			toast.add({ title: t('eventManagement.saved'), color: 'primary' });
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
			toast.add({ title: t('eventManagement.ticketTypeSaved'), color: 'primary' });
		});
	}

	async function setStatus(status: EventStatus) {
		await run(async () => {
			await $fetch(`${api}/status`, { method: 'PATCH', body: { status } });
			cancelling.value = false;
			await refresh();
			toast.add({ title: status === EventStatus.CANCELLED ? t('eventManagement.cancelled') : t('eventManagement.published'), color: 'primary' });
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
			refundQuote.value = await $fetch<RefundQuote>(`${api}/tickets/refund/preview`, {
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
			toast.add({ title: t('eventManagement.refundRecorded'), description: String(result.amount), color: 'primary' });
		});
	}

	async function uploadPolicy() {
		const file = policyFile.value;
		if (!file) return;
		await run(async () => {
			if (file.size > 5 * 1024 * 1024) {
				failure.value = t('eventManagement.policyTooLarge');
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
			toast.add({ title: t('eventManagement.policyUploaded'), color: 'primary' });
		});
	}

	return {
		ready, isNew, canManageMoney, activeTab, busy, failure, cancelling, policyFile, email, admission,
		refundOpen, refundTickets, refundReference, refundQuote, cashChargeRefund, refundTotal, orderFilter,
		editType, typeOpen, ticketPage, data, fetchError, refresh, ticketList, ticketStatus, ticketError, loadTickets,
		form, type, policies, tabs, cancelled, formatMoney, save, openType, saveType, setStatus, toggleRefund,
		openRefund, recordRefund, uploadPolicy
	};
}
