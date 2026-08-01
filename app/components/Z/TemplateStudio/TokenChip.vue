<template>
	<UBadge
		color="primary"
		variant="subtle"
		size="sm"
		class="template-token-chip font-mono align-middle rounded-md mr-1"
		:data-token-chip="tokenName"
		contenteditable="false"
	>
		{{ token }}
	</UBadge>
</template>

<script setup lang="ts">
import { normalizeTemplateToken } from '~/utils/document-template';

const props = defineProps<{ token: string }>();

const token = computed(() => normalizeTemplateToken(props.token));
const tokenName = computed(() => token.value.slice(2, -2));
</script>
