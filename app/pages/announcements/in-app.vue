<template>
	<ZPagePanel id="in-app-announcement" title="In-app Announcement">
		<div class="mx-auto max-w-3xl space-y-6">
			<UForm :state="form" class="space-y-4" @submit="onSubmit">
				<UFormField label="Title" name="title" required>
					<UInput v-model="form.title" />
				</UFormField>
				<UFormField label="Body (HTML)" name="body_html" required>
					<UTextarea v-model="form.body_html" :rows="8" />
				</UFormField>
				<UFormField label="Image URL" name="image_url">
					<UInput v-model="form.image_url" />
				</UFormField>
				<div class="grid gap-4 sm:grid-cols-2">
					<UFormField label="CTA label" name="cta_label">
						<UInput v-model="form.cta_label" />
					</UFormField>
					<UFormField label="CTA URL" name="cta_url">
						<UInput v-model="form.cta_url" />
					</UFormField>
				</div>
				<UFormField
					label="Merchant IDs (comma-separated, empty = all on platform)"
					name="merchant_ids"
				>
					<UInput v-model="form.merchant_ids" placeholder="M00001, M00002" />
				</UFormField>
				<div class="flex flex-wrap gap-2">
					<UButton type="submit" color="primary" :loading="saving" :disabled="saving">
						Publish
					</UButton>
				</div>
			</UForm>

			<div class="space-y-2">
				<h2 class="text-sm font-semibold">Announcements</h2>
				<ul class="divide-y divide-default rounded-lg border border-default">
					<li
						v-for="row in announcements"
						:key="String(row.id)"
						class="flex items-center justify-between gap-3 p-3 text-sm"
					>
						<div class="min-w-0">
							<p class="truncate font-medium">{{ row.title }}</p>
							<p class="text-muted">{{ row.status }}</p>
						</div>
						<div class="flex shrink-0 gap-2">
							<UButton
								v-if="row.status !== 'published'"
								size="xs"
								color="primary"
								variant="soft"
								@click="publish(String(row.id))"
							>
								Publish
							</UButton>
							<UButton
								v-if="row.status === 'published'"
								size="xs"
								color="neutral"
								variant="soft"
								@click="unpublish(String(row.id))"
							>
								Unpublish
							</UButton>
						</div>
					</li>
					<li v-if="!announcements.length" class="p-3 text-muted">No announcements yet.</li>
				</ul>
			</div>
		</div>
	</ZPagePanel>
</template>

<script setup lang="ts">
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';

definePageMeta({
	layout: 'default',
});

const { $api } = useNuxtApp();

const form = reactive({
	title: '',
	body_html: '',
	image_url: '',
	cta_label: '',
	cta_url: '',
	merchant_ids: '',
});

const announcements = ref<Record<string, unknown>[]>([]);
const saving = ref(false);

async function load() {
	const res = await $api.platformAnnouncement.listInApp();
	announcements.value = res.announcements ?? [];
}

async function onSubmit() {
	saving.value = true;
	try {
		const merchantIds = form.merchant_ids
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);
		await $api.platformAnnouncement.createInApp({
			title: form.title,
			body_html: form.body_html,
			image_url: form.image_url || null,
			cta_label: form.cta_label || null,
			cta_url: form.cta_url || null,
			merchant_ids: merchantIds.length ? merchantIds : undefined,
			publish: true,
		});
		successNotification('Announcement published');
		form.title = '';
		form.body_html = '';
		form.image_url = '';
		form.cta_label = '';
		form.cta_url = '';
		form.merchant_ids = '';
		await load();
	} catch (error) {
		failedNotification(error instanceof Error ? error.message : 'Failed to publish');
	} finally {
		saving.value = false;
	}
}

async function publish(id: string) {
	await $api.platformAnnouncement.publishInApp(id);
	await load();
}

async function unpublish(id: string) {
	await $api.platformAnnouncement.unpublishInApp(id);
	await load();
}

onMounted(load);
</script>
