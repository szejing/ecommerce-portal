<template>
	<UCard :ui="{ body: 'p-3 sm:p-4' }">
		<div class="space-y-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div class="min-w-0">
					<h2 class="font-semibold text-default">{{ t('components.templateStudio.preview') }}</h2>
					<p v-if="emailPreview?.subject" class="truncate text-xs text-muted">{{ emailPreview.subject }}</p>
				</div>
				<UButton
					data-action="refresh-preview"
					type="button"
					color="neutral"
					variant="outline"
					icon="i-lucide-refresh-cw"
					:loading="loading"
					class="min-h-11 shrink-0"
					@click="emit('refresh')"
				>
					{{ t('components.templateStudio.refreshPreview') }}
				</UButton>
			</div>

			<div v-if="channel === 'email'" class="space-y-3">
				<div class="flex rounded-lg bg-elevated p-1" :aria-label="t('components.templateStudio.previewViewport')">
					<UButton
						data-viewport="desktop"
						type="button"
						:variant="viewport === 'desktop' ? 'solid' : 'ghost'"
						color="neutral"
						:aria-pressed="viewport === 'desktop'"
						class="min-h-11 flex-1 justify-center"
						@click="viewport = 'desktop'"
					>
						{{ t('components.templateStudio.desktop') }}
					</UButton>
					<UButton
						data-viewport="mobile"
						type="button"
						:variant="viewport === 'mobile' ? 'solid' : 'ghost'"
						color="neutral"
						:aria-pressed="viewport === 'mobile'"
						class="min-h-11 flex-1 justify-center"
						@click="viewport = 'mobile'"
					>
						{{ t('components.templateStudio.mobile') }}
					</UButton>
				</div>

				<div
					v-if="emailPreview"
					data-preview-frame
					class="mx-auto w-full overflow-hidden rounded-lg border border-default bg-white transition-[max-width]"
					:class="viewport === 'mobile' ? 'max-w-[390px]' : 'max-w-full'"
				>
					<iframe
						sandbox=""
						:srcdoc="emailSrcdoc"
						:title="t('components.templateStudio.emailPreviewTitle')"
						class="h-[42rem] w-full border-0 bg-white"
					/>
				</div>
				<PreviewEmptyState v-else />
			</div>

			<div v-else class="space-y-3">
				<object
					v-if="pdfPreview"
					data-preview-frame
					:data="pdfPreview.objectUrl"
					type="application/pdf"
					class="h-[42rem] w-full rounded-lg border border-default bg-white"
					:aria-label="t('components.templateStudio.pdfPreviewTitle')"
				>
					<p class="p-4 text-sm text-muted">{{ t('components.templateStudio.pdfPreviewUnavailable') }}</p>
				</object>
				<PreviewEmptyState v-else />
			</div>
		</div>
	</UCard>
</template>

<script setup lang="ts">
import type { EmailPreview, PdfPreview } from '~/stores/DocumentTemplate/DocumentTemplate';
import type { DocumentTemplateChannel } from '~/utils/types/document-template';

const props = withDefaults(defineProps<{
	channel: DocumentTemplateChannel;
	preview?: EmailPreview | PdfPreview | null;
	loading?: boolean;
}>(), {
	preview: null,
	loading: false,
});

const emit = defineEmits<{
	refresh: [];
}>();

const { t } = useI18n();
const viewport = ref<'desktop' | 'mobile'>('desktop');
const csp = "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src https: data:; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;

const emailPreview = computed(() => props.channel === 'email' && props.preview?.channel === 'email' ? props.preview : null);
const pdfPreview = computed(() => props.channel === 'pdf' && props.preview?.channel === 'pdf' ? props.preview : null);
const emailSrcdoc = computed(() => {
	const html = emailPreview.value?.html ?? '';
	if (/<head(?:\s[^>]*)?>/i.test(html)) return html.replace(/<head(?:\s[^>]*)?>/i, match => `${match}${cspMeta}`);
	return `<!doctype html><html><head>${cspMeta}</head><body>${html}</body></html>`;
});

const PreviewEmptyState = defineComponent({
	setup: () => () => h('div', {
		class: 'flex min-h-64 items-center justify-center rounded-lg border border-dashed border-default p-6 text-center text-sm text-muted',
	}, t('components.templateStudio.previewEmpty')),
});
</script>
