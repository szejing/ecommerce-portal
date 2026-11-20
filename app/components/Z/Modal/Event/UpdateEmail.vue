<script setup lang="ts">
import type { EventUpdateDelivery, EventUpdatePreview } from '~/utils/types/event-management';

defineProps<{ preview?: EventUpdatePreview; result?: EventUpdateDelivery; busy: boolean; failure: string }>();
const open = defineModel<boolean>('open', { required: true });
const subject = defineModel<string>('subject', { required: true });
const message = defineModel<string>('message', { required: true });
const emit = defineEmits<{ preview: []; send: [] }>();
const { t } = useI18n();
</script>

<template>
	<UModal v-model:open="open" :title="t('eventManagement.email.title')" :description="t('eventManagement.email.description')">
		<template #body>
			<UForm :state="{ subject, message }" class="space-y-4" @submit="emit('preview')">
				<UAlert v-if="failure" color="error" :title="failure" />
				<UFormField :label="t('eventManagement.email.subject')" name="subject" required><UInput v-model="subject" required maxlength="150" class="w-full" :disabled="busy" /></UFormField>
				<UFormField :label="t('eventManagement.email.message')" name="message" required><UTextarea v-model="message" required maxlength="6000" class="w-full" :disabled="busy" /></UFormField>
				<UButton type="submit" variant="soft" :loading="busy">{{ t('eventManagement.email.preview') }}</UButton>
				<div v-if="preview" class="space-y-2 rounded-lg bg-elevated p-4">
					<p class="font-medium">{{ preview.subject }}</p>
					<p class="whitespace-pre-wrap break-words text-sm">{{ preview.message }}</p>
					<p class="text-sm text-muted">{{ t('eventManagement.email.recipientCount', { count: preview.recipient_count }) }}</p>
				</div>
				<UAlert v-if="result" color="neutral" :title="t('eventManagement.email.result', result)" />
				<UButton v-if="preview && (!result || result.failed)" :disabled="!preview.recipient_count" :loading="busy" @click="emit('send')">{{ t(result ? 'eventManagement.email.retry' : 'eventManagement.email.title') }}</UButton>
			</UForm>
		</template>
	</UModal>
</template>
