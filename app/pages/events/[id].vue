<script setup lang="ts">
import { EventStatus } from 'yeppi-common';

const { t } = useI18n();
const editor = useEventEditor(String(useRoute().params.id));
await editor.ready;
const {
	isNew, canManageMoney, activeTab, busy, failure, cancelling, policyFile, email, admission,
	refundOpen, refundTickets, refundReference, refundQuote, cashChargeRefund, refundTotal, orderFilter,
	editType, typeOpen, ticketPage, data, fetchError, refresh, ticketList, ticketStatus, ticketError, loadTickets,
	form, type, policies, tabs, cancelled, formatMoney, save, openType, saveType, setStatus, toggleRefund,
	openRefund, recordRefund, uploadPolicy
} = editor;
const { open: emailOpen, draft, preview, result, busy: emailBusy, failure: emailFailure, previewEmail, sendEmail } = email;
const { open: historyOpen, page: historyPage, data: history, status: historyStatus, error: historyError, reload: reloadHistory } = admission;
</script>

<template>
	<main class="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
		<UButton to="/events" variant="link" icon="i-lucide-arrow-left" class="-ms-2 min-h-11">{{ t('eventManagement.title') }}</UButton>
		<UAlert v-if="fetchError" color="error" :title="t('eventManagement.detailFailed')">
			<template #actions><UButton variant="soft" @click="refresh()">{{ t('eventManagement.retry') }}</UButton></template>
		</UAlert>
		<template v-else>
			<header class="flex flex-wrap items-start justify-between gap-3">
				<div class="min-w-0">
					<h1 class="break-words text-2xl font-semibold text-highlighted">{{ isNew ? t('eventManagement.new') : data?.name }}</h1>
					<UBadge v-if="data" class="mt-2 capitalize" variant="soft" :color="cancelled ? 'error' : data.status === EventStatus.PUBLISHED ? 'success' : 'neutral'">{{ t(`eventManagement.status.${data.status}`) }}</UBadge>
				</div>
				<div v-if="data" class="flex flex-wrap gap-2">
					<UButton v-if="canManageMoney" variant="outline" icon="i-lucide-mail" @click="emailOpen = true">{{ t('eventManagement.email.title') }}</UButton>
					<UButton v-if="data.status === EventStatus.DRAFT" :disabled="!data.ticket_types.some(row => row.is_active)" :loading="busy" @click="setStatus(EventStatus.PUBLISHED)">{{ t('eventManagement.publish') }}</UButton>
					<UButton v-if="!cancelled" color="error" variant="soft" @click="cancelling = true">{{ t('eventManagement.cancel') }}</UButton>
				</div>
			</header>
			<UAlert v-if="failure && !typeOpen && !cancelling && !emailOpen && !refundOpen" color="error" :title="failure" role="alert" />
			<UTabs v-if="data" v-model="activeTab" :items="tabs" :content="false" />
			<template v-if="activeTab === 'details'">
				<UForm :state="form" class="space-y-4" @submit="save">
					<UCard>
						<template #header><h2 class="font-semibold text-highlighted">{{ t('eventManagement.eventDetails') }}</h2></template>
						<div class="grid gap-4 sm:grid-cols-2">
							<UFormField :label="t('eventManagement.name')" name="name" required><UInput v-model="form.name" class="w-full" required :disabled="cancelled" maxlength="200" /></UFormField>
							<UFormField :label="t('eventManagement.venue')" name="venue"><UInput v-model="form.venue" class="w-full" :disabled="cancelled" /></UFormField>
							<UFormField :label="t('eventManagement.description')" name="description" class="sm:col-span-2"><UTextarea v-model="form.description" class="w-full" :disabled="cancelled" /></UFormField>
						</div>
					</UCard>
					<UCard>
						<template #header><h2 class="font-semibold text-highlighted">{{ t('eventManagement.schedule') }}</h2></template>
						<div class="grid gap-4 sm:grid-cols-2">
							<UFormField :label="t('eventManagement.starts')" name="starts_at" required><UInput v-model="form.starts_at" class="w-full" type="datetime-local" required :disabled="cancelled" /></UFormField>
							<UFormField :label="t('eventManagement.ends')" name="ends_at" required><UInput v-model="form.ends_at" class="w-full" type="datetime-local" required :disabled="cancelled" /></UFormField>
							<UFormField :label="t('eventManagement.timezone')" name="timezone" :help="t('eventManagement.timezoneHelp')" class="sm:col-span-2"><UInput v-model="form.timezone" class="w-full" :disabled="cancelled" /></UFormField>
							<UFormField :label="t('eventManagement.salesOpen')" name="sales_start" :help="t('eventManagement.salesOpenDefault')"><UInput v-model="form.sales_start" class="w-full" type="datetime-local" :disabled="cancelled" /></UFormField>
							<UFormField :label="t('eventManagement.salesClose')" name="sales_end" :help="t('eventManagement.salesCloseDefault')"><UInput v-model="form.sales_end" class="w-full" type="datetime-local" :disabled="cancelled" /></UFormField>
							<UFormField :label="t('eventManagement.earlyStart')" name="early_bird_start"><UInput v-model="form.early_bird_start" class="w-full" type="datetime-local" :disabled="cancelled" /></UFormField>
							<UFormField :label="t('eventManagement.earlyEnd')" name="early_bird_end"><UInput v-model="form.early_bird_end" class="w-full" type="datetime-local" :disabled="cancelled" /></UFormField>
						</div>
					</UCard>
					<UCard>
						<template #header><h2 class="font-semibold text-highlighted">{{ t('eventManagement.participantInfo') }}</h2></template>
						<UFormField :label="t('eventManagement.checkoutDetails')" name="participant_policy">
							<USelect v-model="form.participant_policy" :items="policies" class="w-full sm:max-w-sm" :disabled="cancelled" />
						</UFormField>
					</UCard>
					<UButton v-if="!cancelled" type="submit" :loading="busy" class="min-h-11">{{ t('eventManagement.save') }}</UButton>
				</UForm>
				<UCard v-if="data">
					<template #header><h2 class="font-semibold text-highlighted">{{ t('eventManagement.policy') }}</h2></template>
					<p class="mb-4 text-sm text-muted">{{ t('eventManagement.policyHelp') }}</p>
					<UButton v-if="data.policy_url" :to="data.policy_url" target="_blank" rel="noopener noreferrer" variant="soft" icon="i-lucide-file-text" class="mb-3">{{ t('eventManagement.viewPolicy') }}</UButton>
					<div v-if="!cancelled" class="flex flex-wrap items-end gap-3">
						<UFormField :label="t('eventManagement.uploadPdf')" :help="t('eventManagement.pdfLimit')"><UInput type="file" accept="application/pdf,.pdf" @change="policyFile = ($event.target as HTMLInputElement).files?.[0]" /></UFormField>
						<UButton variant="soft" class="min-h-11" :disabled="!policyFile" :loading="busy" @click="uploadPolicy">{{ t('eventManagement.uploadPolicy') }}</UButton>
					</div>
				</UCard>
			</template>
			<UCard v-else-if="activeTab === 'types' && data">
				<template #header>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="font-semibold text-highlighted">{{ t('eventManagement.ticketTypes') }}</h2>
						<UButton v-if="!cancelled" icon="i-lucide-plus" class="min-h-11" @click="openType()">{{ t('eventManagement.newTicketType') }}</UButton>
					</div>
				</template>
				<p v-if="!data.ticket_types.length" class="text-sm text-muted">{{ t('eventManagement.noTicketTypes') }}</p>
				<ul v-else class="divide-y divide-default">
					<li v-for="row in data.ticket_types" :key="row.id" class="flex flex-wrap items-center justify-between gap-3 py-3">
						<div class="min-w-0">
							<p class="break-words font-medium">{{ row.name }} <UBadge v-if="!row.is_active" variant="soft" color="neutral">{{ t('eventManagement.inactive') }}</UBadge></p>
							<p class="text-sm text-muted tabular-nums">{{ formatMoney(row.price, row.currency_code) }}<span v-if="row.early_bird_price !== null"> · {{ t('eventManagement.earlyBird', { price: formatMoney(row.early_bird_price, row.currency_code) }) }}</span></p>
						</div>
						<UButton v-if="!cancelled" variant="ghost" class="min-h-11" :aria-label="t('eventManagement.editNamed', { name: row.name })" @click="openType(row)">{{ t('eventManagement.edit') }}</UButton>
					</li>
				</ul>
			</UCard>
			<UCard v-else-if="activeTab === 'participants'">
				<template #header>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="font-semibold text-highlighted">{{ t('eventManagement.participants') }}</h2>
						<UButton v-if="canManageMoney" color="error" variant="soft" :disabled="!refundTickets.length" @click="openRefund">{{ t('eventManagement.recordRefund') }}</UButton>
					</div>
				</template>
				<p v-if="ticketStatus === 'pending'" role="status" class="text-sm text-muted">{{ t('eventManagement.loadingTickets') }}</p>
				<UAlert v-else-if="ticketError" color="error" :title="t('eventManagement.ticketListFailed')">
					<template #actions><UButton variant="soft" @click="loadTickets()">{{ t('eventManagement.retry') }}</UButton></template>
				</UAlert>
				<p v-else-if="!ticketList?.tickets.length" class="text-sm text-muted">{{ t('eventManagement.noPurchasedTickets') }}</p>
				<ul v-else class="divide-y divide-default">
					<li v-for="ticket in ticketList.tickets" :key="ticket.id" class="flex flex-wrap items-center justify-between gap-2 py-3">
						<div class="flex items-center gap-3">
							<UCheckbox v-if="canManageMoney && !ticket.refunded" :model-value="refundTickets.some(row => row.id === ticket.id)"
								:disabled="!!orderFilter && orderFilter !== ticket.order_no" :aria-label="t('eventManagement.selectTicket', { name: ticket.participant_name || ticket.order_no })"
								@update:model-value="toggleRefund(ticket, $event)" />
							<div><p class="font-medium">{{ ticket.participant_name || t('eventManagement.unnamedParticipant') }}</p>
								<p v-if="ticket.holder_customer_no" class="text-sm text-muted">{{ t('eventManagement.holder', { id: ticket.holder_customer_no }) }}</p>
								<NuxtLink :to="`/orders/${ticket.order_no}?type=${ticket.record_type}`" class="text-sm text-primary hover:underline">{{ t('eventManagement.order', { id: ticket.order_no }) }}</NuxtLink>
							</div>
						</div>
						<UButton variant="ghost" size="sm" @click="admission.show(ticket.id)">{{ t('eventManagement.admission.title') }}</UButton>
						<UBadge variant="soft" :color="ticket.refunded ? 'error' : 'neutral'" class="capitalize">{{ t(`eventManagement.ticketStatus.${ticket.refunded ? 'refunded' : ticket.status}`) }}</UBadge>
					</li>
				</ul>
				<UPagination v-if="(ticketList?.total ?? 0) > 25" v-model:page="ticketPage" :total="ticketList?.total ?? 0" :items-per-page="25" />
			</UCard>
		</template>
		<UModal v-model:open="typeOpen" :title="editType ? t('eventManagement.editTicketType') : t('eventManagement.newTicketType')">
			<template #body>
				<UForm :state="type" class="space-y-4" @submit="saveType">
					<UAlert v-if="failure" color="error" :title="failure" role="alert" />
					<UFormField :label="t('eventManagement.ticketName')" name="name" required><UInput v-model="type.name" class="w-full" required /></UFormField>
					<div class="grid gap-3 sm:grid-cols-2">
						<UFormField :label="t('eventManagement.code')" name="code" required><UInput v-model="type.code" class="w-full" maxlength="30" required /></UFormField>
						<UFormField :label="t('eventManagement.currency')" name="currency_code" required><UInput v-model="type.currency_code" class="w-full" maxlength="3" required /></UFormField>
						<UFormField :label="t('eventManagement.price')" name="price" required><UInput v-model.number="type.price" class="w-full" type="number" min="0" step="0.01" required /></UFormField>
						<UFormField :label="t('eventManagement.earlyPrice')" name="early_bird_price"><UInput :model-value="type.early_bird_price?.toString() ?? ''" class="w-full" type="number" min="0" step="0.01" @update:model-value="type.early_bird_price = $event === '' ? null : Number($event)" /></UFormField>
					</div>
					<UCheckbox v-model="type.is_active" :label="t('eventManagement.available')" />
					<div class="flex justify-end gap-2"><UButton variant="ghost" @click="typeOpen = false">{{ t('eventManagement.close') }}</UButton><UButton type="submit" :loading="busy">{{ t('eventManagement.saveType') }}</UButton></div>
				</UForm>
			</template>
		</UModal>
		<ZModalEventAdmissionHistory
			v-if="!isNew"
			v-model:open="historyOpen"
			v-model:page="historyPage"
			:rows="history?.history ?? []"
			:total="history?.total ?? 0"
			:busy="historyStatus === 'pending'"
			:failed="Boolean(historyError)"
			@retry="reloadHistory()"
		/>
		<ZModalEventUpdateEmail
			v-if="canManageMoney && !isNew"
			v-model:open="emailOpen"
			v-model:subject="draft.subject"
			v-model:message="draft.message"
			:preview="preview"
			:result="result"
			:busy="emailBusy"
			:failure="emailFailure"
			@preview="previewEmail"
			@send="sendEmail"
		/>
		<UModal v-model:open="refundOpen" :title="t('eventManagement.refundTitle')" :description="t('eventManagement.refundDescription')">
			<template #body>
				<UForm :state="{ refundReference }" class="space-y-4" @submit="recordRefund">
					<UAlert v-if="failure" color="error" :title="failure" />
					<p class="text-sm">{{ t('eventManagement.selected', { count: refundTickets.length, id: orderFilter }) }}</p>
					<UFormField :label="t('eventManagement.refundReference')" required><UInput v-model="refundReference" required maxlength="120" class="w-full" /></UFormField>
					<template v-if="refundQuote">
						<UFormField v-if="refundQuote.cash_charge_max" :label="t('eventManagement.cashChargeRefund')" :help="t('eventManagement.cashChargeHelp')">
							<UInput v-model.number="cashChargeRefund" type="number" min="0" :max="refundQuote.cash_charge_max" step="0.01" class="w-full" />
						</UFormField>
						<p class="font-semibold tabular-nums">{{ t('eventManagement.refundTotal', { amount: formatMoney(refundTotal, refundQuote.currency_code) }) }}</p>
					</template>
					<UButton type="submit" color="error" :disabled="!refundQuote" :loading="busy">{{ t('eventManagement.recordRefund') }}</UButton>
				</UForm>
			</template>
		</UModal>
		<UModal v-model:open="cancelling" :title="t('eventManagement.cancelTitle')" :description="t('eventManagement.cancelDescription')">
			<template #footer>
				<UAlert v-if="failure" color="error" :title="failure" role="alert" />
				<UButton variant="ghost" @click="cancelling = false">{{ t('eventManagement.keep') }}</UButton>
				<UButton color="error" :loading="busy" @click="setStatus(EventStatus.CANCELLED)">{{ t('eventManagement.cancel') }}</UButton>
			</template>
		</UModal>
	</main>
</template>
