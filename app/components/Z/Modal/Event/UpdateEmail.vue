<script setup lang="ts">
const { eventId } = defineProps<{ eventId: string }>();
const emailOpen = defineModel<boolean>({ required: true });
const emailDraft = reactive({ subject: '', message: '' });
const emailPreview = ref<{ subject: string; message: string; recipient_count: number }>();
const emailResult = ref<{ sent: number; failed: number; skipped: number }>();
const emailRequest = ref('');
const busy = ref(false);
const failure = ref('');
const endpoint = computed(() => `/merchant/events/${eventId}/tickets/update-email`);

watch(emailDraft, () => {
	emailPreview.value = undefined;
	emailResult.value = undefined;
	emailRequest.value = '';
});

async function previewEmail() {
	if (busy.value) return;
	busy.value = true;
	failure.value = '';
	try {
		emailPreview.value = await $fetch(`${endpoint.value}/preview`, { method: 'POST', body: emailDraft });
		emailRequest.value ||= crypto.randomUUID();
	} catch {
		failure.value = 'Could not preview this email. Try again.';
	} finally {
		busy.value = false;
	}
}

async function sendEmail() {
	if (!emailPreview.value || !emailRequest.value || busy.value) return;
	busy.value = true;
	failure.value = '';
	try {
		emailResult.value = await $fetch(`${endpoint.value}/send`, {
			method: 'POST',
			body: { ...emailDraft, request_id: emailRequest.value },
		});
	} catch {
		failure.value = 'Could not confirm delivery. Retry with the same preview.';
	} finally {
		busy.value = false;
	}
}
</script>

<template>
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
</template>
