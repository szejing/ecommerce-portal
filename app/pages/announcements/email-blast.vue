<template>
	<ZPagePanel id="email-blast" title="Email Blast">
		<div class="mx-auto max-w-3xl space-y-6">
			<UForm :state="form" class="space-y-4" @submit="onSubmit">
				<UFormField label="Subject" name="subject" required>
					<UInput v-model="form.subject" />
				</UFormField>
				<UFormField label="Body (HTML)" name="body_html" required>
					<UTextarea v-model="form.body_html" :rows="8" />
				</UFormField>
				<div class="grid gap-4 sm:grid-cols-2">
					<UFormField label="CTA label" name="cta_label">
						<UInput v-model="form.cta_label" />
					</UFormField>
					<UFormField label="CTA URL" name="cta_url">
						<UInput v-model="form.cta_url" />
					</UFormField>
				</div>
				<UFormField label="Schedule at (KL / ISO, optional)" name="scheduled_at">
					<UInput v-model="form.scheduled_at" placeholder="2026-10-20T10:00:00+08:00" />
				</UFormField>
				<div class="flex flex-wrap gap-2">
					<UButton type="submit" color="primary" :loading="saving" :disabled="saving">
						{{ form.scheduled_at ? 'Schedule' : 'Send now' }}
					</UButton>
				</div>
			</UForm>

			<div class="space-y-2">
				<h2 class="text-sm font-semibold">Recent blasts</h2>
				<div v-if="loading" class="space-y-2">
					<USkeleton class="h-10 w-full" />
					<USkeleton class="h-10 w-full" />
				</div>
				<ul v-else class="divide-y divide-default rounded-lg border border-default">
					<li v-for="blast in blasts" :key="String(blast.id)" class="flex items-center justify-between gap-3 p-3 text-sm">
						<div class="min-w-0">
							<p class="truncate font-medium">{{ blast.subject }}</p>
							<p class="text-muted">{{ blast.status }}</p>
						</div>
						<div class="flex shrink-0 gap-2">
							<UButton
								v-if="blast.status === 'scheduled'"
								size="xs"
								color="neutral"
								variant="soft"
								@click="cancelBlast(String(blast.id))"
							>
								Cancel
							</UButton>
							<UButton
								v-if="blast.status === 'draft'"
								size="xs"
								color="primary"
								variant="soft"
								@click="sendBlast(String(blast.id))"
							>
								Send
							</UButton>
						</div>
					</li>
					<li v-if="!blasts.length" class="p-3 text-muted">No blasts yet.</li>
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
	subject: '',
	body_html: '',
	cta_label: '',
	cta_url: '',
	scheduled_at: '',
});

const blasts = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const saving = ref(false);

async function loadBlasts() {
	loading.value = true;
	try {
		const res = await $api.platformAnnouncement.listEmailBlasts();
		blasts.value = res.blasts ?? [];
	} finally {
		loading.value = false;
	}
}

async function onSubmit() {
	saving.value = true;
	try {
		await $api.platformAnnouncement.createEmailBlast({
			subject: form.subject,
			body_html: form.body_html,
			cta_label: form.cta_label || null,
			cta_url: form.cta_url || null,
			scheduled_at: form.scheduled_at || null,
			send_now: !form.scheduled_at,
		});
		successNotification('Email blast saved');
		form.subject = '';
		form.body_html = '';
		form.cta_label = '';
		form.cta_url = '';
		form.scheduled_at = '';
		await loadBlasts();
	} catch (error) {
		failedNotification(error instanceof Error ? error.message : 'Failed to save blast');
	} finally {
		saving.value = false;
	}
}

async function cancelBlast(id: string) {
	await $api.platformAnnouncement.cancelEmailBlast(id);
	await loadBlasts();
}

async function sendBlast(id: string) {
	await $api.platformAnnouncement.sendEmailBlast(id);
	await loadBlasts();
}

onMounted(loadBlasts);
</script>
