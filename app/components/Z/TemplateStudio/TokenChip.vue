<template>
	<span
		class="template-token-chip inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary align-middle"
		:data-token-chip="tokenName"
		contenteditable="false"
	>
		<span>{{ token }}</span>
		<button
			v-if="removable"
			type="button"
			class="inline-flex size-4 items-center justify-center rounded-full text-primary hover:bg-primary/20"
			:aria-label="t('components.templateStudio.removeToken', { token })"
			:data-token-remove="tokenName"
			@click.stop.prevent="emit('remove')"
		>
			<UIcon name="i-lucide-x" class="size-3" />
		</button>
	</span>
</template>

<script setup lang="ts">
import { normalizeTemplateToken } from '~/utils/document-template';

const props = withDefaults(
	defineProps<{ token: string; removable?: boolean }>(),
	{ removable: true },
);

const emit = defineEmits<{ remove: [] }>();
const { t } = useI18n();
const token = computed(() => normalizeTemplateToken(props.token));
const tokenName = computed(() => token.value.slice(2, -2));
</script>
