<template>
	<ZPagePanel id="email-blast" :title="t('nav.emailBlast')" back-to="/announcements">
		<template #navbar-right>
			<UButton
				class="min-h-11 lg:hidden"
				color="neutral"
				variant="soft"
				icon="i-lucide-eye"
				@click="previewOpen = true"
			>
				{{ t('platformAnnouncements.common.preview') }}
			</UButton>
		</template>

		<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
			<div class="min-w-0 space-y-4">
				<UAlert
					color="info"
					variant="subtle"
					icon="i-lucide-mail"
					:title="t('platformAnnouncements.email.introTitle')"
					:description="t('platformAnnouncements.email.intro')"
				/>

				<UAccordion :items="guideItems">
					<template #guide-body>
						<ol class="list-decimal space-y-2 pl-5 text-sm leading-5 text-muted">
							<li v-for="step in steps" :key="step">{{ step }}</li>
						</ol>
						<p class="mt-4 text-sm font-medium text-default">
							{{ t('platformAnnouncements.email.sampleLabel') }}
						</p>
						<pre class="mt-2 overflow-x-auto rounded-md bg-elevated p-3 text-xs leading-5 text-default">{{ sampleBody }}</pre>
					</template>
				</UAccordion>

				<UCard>
					<UForm :state="form" class="space-y-4" @submit="onSubmit">
						<UFormField :label="t('platformAnnouncements.email.subject')" name="subject" required :error="errors.subject">
							<UInput v-model="form.subject" class="w-full" :placeholder="t('platformAnnouncements.email.subjectPlaceholder')" />
						</UFormField>
						<UFormField
							:label="t('platformAnnouncements.email.body')"
							name="body_html"
							required
							:description="t('platformAnnouncements.email.bodyHelp')"
							:error="errors.body_html"
						>
							<ZAnnouncementHtmlEditor
								v-model="form.body_html"
								:aria-label="t('platformAnnouncements.email.body')"
							/>
						</UFormField>
						<div class="grid gap-4 sm:grid-cols-2">
							<UFormField :label="t('platformAnnouncements.email.ctaLabel')" name="cta_label" :error="errors.cta">
								<UInput v-model="form.cta_label" class="w-full" :placeholder="t('platformAnnouncements.email.ctaLabelPlaceholder')" />
							</UFormField>
							<UFormField
								:label="t('platformAnnouncements.email.ctaUrl')"
								name="cta_url"
								:description="t('platformAnnouncements.email.ctaHelp')"
							>
								<UInput v-model="form.cta_url" class="w-full" placeholder="https://" />
							</UFormField>
						</div>
						<UFormField
							:label="t('platformAnnouncements.email.schedule')"
							name="scheduled_at"
							:description="t('platformAnnouncements.email.scheduleHelp')"
							:error="errors.scheduled_at"
						>
							<UPopover v-model:open="schedulePopoverOpen" class="w-full sm:w-56" :content="{ align: 'start' }" :modal="true">
								<UButton
									type="button"
									icon="i-lucide-calendar"
									color="neutral"
									variant="outline"
									class="w-full min-h-11 min-w-0 justify-between group"
								>
									<span class="truncate">{{ scheduleLabel }}</span>
									<UIcon name="i-lucide-chevron-down" class="size-5 shrink-0 text-dimmed transition-transform group-data-[state=open]:rotate-180" />
								</UButton>
								<template #content>
									<div class="space-y-2 p-2">
										<ZDatePicker v-model="scheduledDate" :min-date="scheduleMinDate" @close="schedulePopoverOpen = false" />
										<div v-if="scheduledDate" class="flex justify-end border-t border-default pt-2">
											<UButton type="button" :label="t('components.filter.clear')" color="neutral" variant="soft" size="sm" @click="clearSchedule" />
										</div>
									</div>
								</template>
							</UPopover>
						</UFormField>
						<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
							<UButton
								type="button"
								color="neutral"
								variant="soft"
								class="min-h-11 justify-center"
								@click="fillSample"
							>
								{{ t('platformAnnouncements.common.useSample') }}
							</UButton>
							<UButton type="submit" color="primary" class="min-h-11 justify-center" :loading="saving" :disabled="saving">
								{{ scheduledDate ? t('platformAnnouncements.email.scheduleAction') : t('platformAnnouncements.email.sendNow') }}
							</UButton>
						</div>
					</UForm>
				</UCard>

				<div class="space-y-2">
					<h2 class="text-sm font-semibold text-default">{{ t('platformAnnouncements.email.recent') }}</h2>
					<UAlert
						v-if="loadError"
						color="error"
						variant="soft"
						icon="i-lucide-circle-alert"
						:description="loadError"
					>
						<template #actions>
							<UButton color="error" variant="outline" size="sm" @click="loadBlasts">
								{{ t('common.refresh') }}
							</UButton>
						</template>
					</UAlert>
					<div v-if="loading" class="space-y-2">
						<USkeleton class="h-14 w-full" />
						<USkeleton class="h-14 w-full" />
					</div>
					<ul v-else class="divide-y divide-default rounded-lg border border-default">
						<li
							v-for="blast in blasts"
							:key="blast.id"
							class="flex flex-col gap-3 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="min-w-0 space-y-1">
								<p class="truncate font-medium text-default">{{ blast.subject }}</p>
								<div class="flex flex-wrap items-center gap-2">
									<UBadge :color="announcementStatusColor(blast.status)" variant="subtle" :label="statusLabel(blast.status)" />
									<span v-if="whenLabel(blast)" class="text-xs text-muted">{{ whenLabel(blast) }}</span>
								</div>
							</div>
							<div class="flex shrink-0 gap-2">
								<UButton
									v-if="blast.status === 'scheduled'"
									size="sm"
									color="neutral"
									variant="soft"
									class="min-h-11"
									:loading="actingId === blast.id"
									@click="cancelBlast(blast.id)"
								>
									{{ t('platformAnnouncements.email.cancelSchedule') }}
								</UButton>
								<UButton
									v-if="blast.status === 'draft'"
									size="sm"
									color="primary"
									variant="soft"
									class="min-h-11"
									:loading="actingId === blast.id"
									@click="sendBlast(blast.id)"
								>
									{{ t('platformAnnouncements.email.send') }}
								</UButton>
							</div>
						</li>
						<li v-if="!blasts.length" class="p-4 text-sm text-muted">
							{{ t('platformAnnouncements.email.empty') }}
						</li>
					</ul>
				</div>
			</div>

			<aside class="hidden lg:block lg:sticky lg:top-4">
				<ZAnnouncementEmailPreview
					:subject="form.subject"
					:body-html="form.body_html"
					:cta-label="form.cta_label"
					:cta-url="form.cta_url"
					:platform-name="platformName"
				/>
			</aside>
		</div>

		<USlideover
			v-model:open="previewOpen"
			side="bottom"
			:title="t('platformAnnouncements.email.previewTitle')"
			:ui="{ content: 'max-h-[85vh]' }"
		>
			<template #body>
				<ZAnnouncementEmailPreview
					:subject="form.subject"
					:body-html="form.body_html"
					:cta-label="form.cta_label"
					:cta-url="form.cta_url"
					:platform-name="platformName"
				/>
			</template>
		</USlideover>
	</ZPagePanel>
</template>

<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui';
import { isBefore, startOfDay } from 'date-fns';
import { getFormattedDate } from 'yeppi-common';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';
import { reduceAnnouncementMessage } from '~/utils/announcement-message';
import {
	announcementHtmlHasText,
	announcementStatusColor,
	emailSampleHtml,
	formatAnnouncementWhen,
	type PlatformAnnouncementRow,
} from '~/utils/platform-announcement';

definePageMeta({
	layout: 'default',
});

const { t } = useI18n();
const { $api } = useNuxtApp();
const { platformName } = usePlatformShell();
const requestUrl = useRequestURL();

useHead({ title: () => t('nav.emailBlast') });

const form = reactive({
	subject: '',
	body_html: '',
	cta_label: '',
	cta_url: '',
});

const scheduledDate = ref<Date | null>(null);
const schedulePopoverOpen = ref(false);
const scheduleMinDate = computed(() => startOfDay(new Date()));
const scheduleLabel = computed(() => scheduledDate.value
	? getFormattedDate(scheduledDate.value, 'dd-MM-yyyy')
	: t('common.notSet'));

const errors = reactive({
	subject: '',
	body_html: '',
	cta: '',
	scheduled_at: '',
});

const blasts = ref<PlatformAnnouncementRow[]>([]);
const loading = ref(false);
const saving = ref(false);
const actingId = ref('');
const loadError = ref('');
const previewOpen = ref(false);

const steps = computed(() => [
	t('platformAnnouncements.email.how1'),
	t('platformAnnouncements.email.how2'),
	t('platformAnnouncements.email.how3'),
	t('platformAnnouncements.email.how4'),
]);

const sampleBody = computed(() => emailSampleHtml({
	hello: t('platformAnnouncements.email.sampleHello'),
	before: t('platformAnnouncements.email.sampleMaintenanceBefore'),
	when: t('platformAnnouncements.email.sampleMaintenanceWhen'),
	after: t('platformAnnouncements.email.sampleMaintenanceAfter'),
	safe: t('platformAnnouncements.email.sampleSafe'),
}));

const guideItems = computed<AccordionItem[]>(() => [
	{
		label: t('platformAnnouncements.common.how'),
		icon: 'i-lucide-circle-help',
		slot: 'guide',
	},
]);

function statusLabel(status: string | undefined) {
	if (!status) return '';
	const key = `platformAnnouncements.status.${status}`;
	const label = t(key);
	return label === key ? status : label;
}

function whenLabel(row: PlatformAnnouncementRow) {
	if (row.status === 'scheduled' && row.scheduled_at) {
		return t('platformAnnouncements.email.scheduledFor', { when: formatAnnouncementWhen(row.scheduled_at) });
	}
	if (row.sent_at) {
		return t('platformAnnouncements.email.sentAt', { when: formatAnnouncementWhen(row.sent_at) });
	}
	return formatAnnouncementWhen(row.created_at);
}

function errorMessage(error: unknown, fallback: string) {
	if (error instanceof Error && error.message) return error.message;
	if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
		return error.message;
	}
	return fallback;
}

function clearSchedule() {
	scheduledDate.value = null;
	schedulePopoverOpen.value = false;
}

function fillSample() {
	form.subject = t('platformAnnouncements.email.sampleSubject');
	form.body_html = sampleBody.value;
	form.cta_label = t('platformAnnouncements.email.sampleCta');
	form.cta_url = requestUrl.origin;
	successNotification(t('platformAnnouncements.common.sampleFilled'));
}

function validate() {
	errors.subject = form.subject.trim() ? '' : t('platformAnnouncements.email.subjectRequired');
	errors.body_html = announcementHtmlHasText(form.body_html) ? '' : t('platformAnnouncements.email.bodyRequired');
	const hasLabel = Boolean(form.cta_label.trim());
	const hasUrl = Boolean(form.cta_url.trim());
	errors.cta = hasLabel === hasUrl ? '' : t('platformAnnouncements.email.ctaPair');
	errors.scheduled_at = '';
	if (scheduledDate.value && isBefore(startOfDay(scheduledDate.value), startOfDay(new Date()))) {
		errors.scheduled_at = t('platformAnnouncements.email.schedulePast');
	}
	return !errors.subject && !errors.body_html && !errors.cta && !errors.scheduled_at;
}

async function loadBlasts() {
	loading.value = true;
	loadError.value = '';
	try {
		const res = await $api.platformAnnouncement.listEmailBlasts();
		blasts.value = (res.blasts ?? []) as PlatformAnnouncementRow[];
	} catch (error) {
		loadError.value = errorMessage(error, t('platformAnnouncements.email.loadFailed'));
	} finally {
		loading.value = false;
	}
}

async function onSubmit() {
	form.body_html = reduceAnnouncementMessage(form.body_html);
	if (!validate()) return;
	const scheduled = scheduledDate.value ? startOfDay(scheduledDate.value) : null;
	saving.value = true;
	try {
		await $api.platformAnnouncement.createEmailBlast({
			subject: form.subject.trim(),
			body_html: form.body_html,
			cta_label: form.cta_label.trim() || null,
			cta_url: form.cta_url.trim() || null,
			scheduled_at: scheduled ? scheduled.toISOString() : null,
			send_now: !scheduled,
		});
		successNotification(scheduled
			? t('platformAnnouncements.email.scheduled')
			: t('platformAnnouncements.email.sent'));
		form.subject = '';
		form.body_html = '';
		form.cta_label = '';
		form.cta_url = '';
		scheduledDate.value = null;
		await loadBlasts();
	} catch (error) {
		failedNotification(errorMessage(error, t('platformAnnouncements.email.saveFailed')));
	} finally {
		saving.value = false;
	}
}

async function cancelBlast(id: string) {
	actingId.value = id;
	try {
		await $api.platformAnnouncement.cancelEmailBlast(id);
		successNotification(t('platformAnnouncements.email.cancelled'));
		await loadBlasts();
	} catch (error) {
		failedNotification(errorMessage(error, t('platformAnnouncements.email.actionFailed')));
	} finally {
		actingId.value = '';
	}
}

async function sendBlast(id: string) {
	actingId.value = id;
	try {
		await $api.platformAnnouncement.sendEmailBlast(id);
		successNotification(t('platformAnnouncements.email.sent'));
		await loadBlasts();
	} catch (error) {
		failedNotification(errorMessage(error, t('platformAnnouncements.email.actionFailed')));
	} finally {
		actingId.value = '';
	}
}

onMounted(loadBlasts);
</script>
