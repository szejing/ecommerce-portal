<template>
	<ZPagePanel id="in-app-announcement" :title="t('nav.inAppAnnouncement')" back-to="/announcements">
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
					icon="i-lucide-bell"
					:title="t('platformAnnouncements.inApp.introTitle')"
					:description="t('platformAnnouncements.inApp.intro')"
				/>

				<UAccordion :items="guideItems">
					<template #guide-body>
						<ol class="list-decimal space-y-2 pl-5 text-sm leading-5 text-muted">
							<li v-for="step in steps" :key="step">{{ step }}</li>
						</ol>
						<p class="mt-4 text-sm font-medium text-default">
							{{ t('platformAnnouncements.inApp.sampleLabel') }}
						</p>
						<pre class="mt-2 overflow-x-auto rounded-md bg-elevated p-3 text-xs leading-5 text-default">{{ sampleBody }}</pre>
					</template>
				</UAccordion>

				<UCard>
					<UForm :state="form" class="space-y-4" @submit="onSubmit">
						<UFormField :label="t('platformAnnouncements.inApp.title')" name="title" required :error="errors.title">
							<UInput v-model="form.title" class="w-full" :placeholder="t('platformAnnouncements.inApp.titlePlaceholder')" />
						</UFormField>
						<UFormField
							:label="t('platformAnnouncements.inApp.body')"
							name="body_html"
							required
							:description="t('platformAnnouncements.inApp.bodyHelp')"
							:error="errors.body_html"
						>
							<ZAnnouncementHtmlEditor
								v-model="form.body_html"
								:aria-label="t('platformAnnouncements.inApp.body')"
							/>
						</UFormField>
						<UFormField
							:label="t('platformAnnouncements.inApp.imageUrl')"
							name="image_url"
							:description="t('platformAnnouncements.inApp.imageHelp')"
							:error="errors.image_url"
						>
							<UInput v-model="form.image_url" class="w-full" placeholder="https://" />
						</UFormField>
						<div class="grid gap-4 sm:grid-cols-2">
							<UFormField :label="t('platformAnnouncements.inApp.ctaLabel')" name="cta_label" :error="errors.cta">
								<UInput v-model="form.cta_label" class="w-full" :placeholder="t('platformAnnouncements.inApp.ctaLabelPlaceholder')" />
							</UFormField>
							<UFormField
								:label="t('platformAnnouncements.inApp.ctaUrl')"
								name="cta_url"
								:description="t('platformAnnouncements.inApp.ctaHelp')"
							>
								<UInput v-model="form.cta_url" class="w-full" placeholder="/analytics/sales" />
							</UFormField>
						</div>
						<UFormField
							:label="t('platformAnnouncements.inApp.merchantIds')"
							name="merchant_ids"
							:description="t('platformAnnouncements.inApp.merchantHelp')"
						>
							<UInput v-model="form.merchant_ids" class="w-full" placeholder="M00001, M00002" />
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
								{{ t('platformAnnouncements.inApp.publish') }}
							</UButton>
						</div>
					</UForm>
				</UCard>

				<div class="space-y-2">
					<h2 class="text-sm font-semibold text-default">{{ t('platformAnnouncements.inApp.listTitle') }}</h2>
					<UAlert
						v-if="loadError"
						color="error"
						variant="soft"
						icon="i-lucide-circle-alert"
						:description="loadError"
					>
						<template #actions>
							<UButton color="error" variant="outline" size="sm" @click="load">
								{{ t('common.refresh') }}
							</UButton>
						</template>
					</UAlert>
					<ul class="divide-y divide-default rounded-lg border border-default">
						<li
							v-for="row in announcements"
							:key="row.id"
							class="flex flex-col gap-3 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
						>
							<div class="min-w-0 space-y-1">
								<p class="truncate font-medium text-default">{{ row.title }}</p>
								<div class="flex flex-wrap items-center gap-2">
									<UBadge :color="announcementStatusColor(row.status)" variant="subtle" :label="statusLabel(row.status)" />
									<span v-if="audienceLabel(row)" class="text-xs text-muted">{{ audienceLabel(row) }}</span>
									<span v-if="formatAnnouncementWhen(row.created_at)" class="text-xs text-muted">
										{{ formatAnnouncementWhen(row.created_at) }}
									</span>
								</div>
							</div>
							<div class="flex shrink-0 gap-2">
								<UButton
									v-if="row.status !== 'published'"
									size="sm"
									color="primary"
									variant="soft"
									class="min-h-11"
									:loading="actingId === row.id"
									@click="publish(row.id)"
								>
									{{ t('platformAnnouncements.inApp.publish') }}
								</UButton>
								<UButton
									v-if="row.status === 'published'"
									size="sm"
									color="neutral"
									variant="soft"
									class="min-h-11"
									:loading="actingId === row.id"
									@click="unpublish(row.id)"
								>
									{{ t('platformAnnouncements.inApp.unpublish') }}
								</UButton>
							</div>
						</li>
						<li v-if="!announcements.length && !loadError" class="p-4 text-sm text-muted">
							{{ t('platformAnnouncements.inApp.empty') }}
						</li>
					</ul>
				</div>
			</div>

			<aside class="hidden lg:block lg:sticky lg:top-4">
				<ZAnnouncementInAppPreview
					:title="form.title"
					:body-html="form.body_html"
					:image-url="form.image_url"
					:cta-label="form.cta_label"
					:cta-url="form.cta_url"
				/>
			</aside>
		</div>

		<USlideover
			v-model:open="previewOpen"
			side="bottom"
			:title="t('platformAnnouncements.inApp.previewTitle')"
			:ui="{ content: 'max-h-[85vh]' }"
		>
			<template #body>
				<ZAnnouncementInAppPreview
					:title="form.title"
					:body-html="form.body_html"
					:image-url="form.image_url"
					:cta-label="form.cta_label"
					:cta-url="form.cta_url"
				/>
			</template>
		</USlideover>
	</ZPagePanel>
</template>

<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';
import {
	isHttpsCoverImageUrl,
	reduceAnnouncementMessage,
} from '~/utils/announcement-message';
import {
	announcementHtmlHasText,
	announcementStatusColor,
	formatAnnouncementWhen,
	inAppSampleHtml,
	type PlatformAnnouncementRow,
} from '~/utils/platform-announcement';

definePageMeta({
	layout: 'default',
});

const { t } = useI18n();
const { $api } = useNuxtApp();

useHead({ title: () => t('nav.inAppAnnouncement') });

const form = reactive({
	title: '',
	body_html: '',
	image_url: '',
	cta_label: '',
	cta_url: '',
	merchant_ids: '',
});

const errors = reactive({
	title: '',
	body_html: '',
	image_url: '',
	cta: '',
});

const announcements = ref<PlatformAnnouncementRow[]>([]);
const saving = ref(false);
const actingId = ref('');
const loadError = ref('');
const previewOpen = ref(false);

const steps = computed(() => [
	t('platformAnnouncements.inApp.how1'),
	t('platformAnnouncements.inApp.how2'),
	t('platformAnnouncements.inApp.how3'),
	t('platformAnnouncements.inApp.how4'),
]);

const sampleBody = computed(() => inAppSampleHtml({
	before: t('platformAnnouncements.inApp.sampleLeadBefore'),
	emphasis: t('platformAnnouncements.inApp.sampleLeadEmphasis'),
	after: t('platformAnnouncements.inApp.sampleLeadAfter'),
	follow: t('platformAnnouncements.inApp.sampleFollow'),
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

function audienceLabel(row: PlatformAnnouncementRow) {
	const ids = row.merchant_ids?.filter(Boolean) ?? [];
	if (!ids.length) return t('platformAnnouncements.inApp.audienceAll');
	return t('platformAnnouncements.inApp.audienceSome', { ids: ids.join(', ') });
}

function errorMessage(error: unknown, fallback: string) {
	if (error instanceof Error && error.message) return error.message;
	if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
		return error.message;
	}
	return fallback;
}

function fillSample() {
	form.title = t('platformAnnouncements.inApp.sampleTitle');
	form.body_html = sampleBody.value;
	form.cta_label = t('platformAnnouncements.inApp.sampleCta');
	form.cta_url = '/analytics/sales';
	form.image_url = '';
	successNotification(t('platformAnnouncements.common.sampleFilled'));
}

function validate() {
	errors.title = form.title.trim() ? '' : t('platformAnnouncements.inApp.titleRequired');
	errors.body_html = announcementHtmlHasText(form.body_html) ? '' : t('platformAnnouncements.inApp.bodyRequired');
	const image = form.image_url.trim();
	errors.image_url = !image || isHttpsCoverImageUrl(image) ? '' : t('platformAnnouncements.inApp.imageInvalid');
	const hasLabel = Boolean(form.cta_label.trim());
	const hasUrl = Boolean(form.cta_url.trim());
	errors.cta = hasLabel === hasUrl ? '' : t('platformAnnouncements.inApp.ctaPair');
	return !errors.title && !errors.body_html && !errors.image_url && !errors.cta;
}

async function load() {
	loadError.value = '';
	try {
		const res = await $api.platformAnnouncement.listInApp();
		announcements.value = (res.announcements ?? []) as PlatformAnnouncementRow[];
	} catch (error) {
		loadError.value = errorMessage(error, t('platformAnnouncements.inApp.loadFailed'));
	}
}

async function onSubmit() {
	form.body_html = reduceAnnouncementMessage(form.body_html);
	if (!validate()) return;
	saving.value = true;
	try {
		const merchantIds = form.merchant_ids
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);
		await $api.platformAnnouncement.createInApp({
			title: form.title.trim(),
			body_html: form.body_html,
			image_url: form.image_url.trim() || null,
			cta_label: form.cta_label.trim() || null,
			cta_url: form.cta_url.trim() || null,
			merchant_ids: merchantIds.length ? merchantIds : undefined,
			publish: true,
		});
		successNotification(t('platformAnnouncements.inApp.published'));
		form.title = '';
		form.body_html = '';
		form.image_url = '';
		form.cta_label = '';
		form.cta_url = '';
		form.merchant_ids = '';
		await load();
	} catch (error) {
		failedNotification(errorMessage(error, t('platformAnnouncements.inApp.publishFailed')));
	} finally {
		saving.value = false;
	}
}

async function publish(id: string) {
	actingId.value = id;
	try {
		await $api.platformAnnouncement.publishInApp(id);
		successNotification(t('platformAnnouncements.inApp.published'));
		await load();
	} catch (error) {
		failedNotification(errorMessage(error, t('platformAnnouncements.inApp.actionFailed')));
	} finally {
		actingId.value = '';
	}
}

async function unpublish(id: string) {
	actingId.value = id;
	try {
		await $api.platformAnnouncement.unpublishInApp(id);
		successNotification(t('platformAnnouncements.inApp.unpublished'));
		await load();
	} catch (error) {
		failedNotification(errorMessage(error, t('platformAnnouncements.inApp.actionFailed')));
	} finally {
		actingId.value = '';
	}
}

onMounted(load);
</script>
