<template>
	<div v-if="tokens.length" class="space-y-2">
		<p class="text-xs font-medium text-muted">{{ t('components.templateStudio.availableTokens') }}</p>
		<div class="flex flex-wrap gap-2">
			<UButton
				v-for="token in tokens"
				:key="token.name"
				:data-token="token.name"
				type="button"
				color="neutral"
				variant="soft"
				size="sm"
				class="min-h-11 font-mono text-xs"
				@click="insert(token.value)"
			>
				{{ token.value }}
			</UButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import { insertTemplateToken } from '~/utils/document-template';

const props = withDefaults(defineProps<{
	allowedTokens: readonly string[];
	modelValue?: string;
	selectionStart?: number;
	selectionEnd?: number;
}>(), {
	modelValue: undefined,
	selectionStart: undefined,
	selectionEnd: undefined,
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
	'select': [token: string];
	'inserted': [value: string, cursor: number];
}>();

const { t } = useI18n();

function tokenName(token: string): string {
	const match = /^\{\{([^{}]+)\}\}$/.exec(token);
	return match?.[1] ?? token;
}

function tokenValue(token: string): string {
	return `{{${tokenName(token)}}}`;
}

const tokens = computed(() => {
	const seen = new Set<string>();
	return props.allowedTokens.flatMap((token) => {
		const name = tokenName(token);
		if (!name || seen.has(name)) return [];
		seen.add(name);
		return [{ name, value: tokenValue(token) }];
	});
});

function insert(token: string): void {
	emit('select', token);
	if (props.modelValue === undefined) return;

	const start = props.selectionStart ?? props.modelValue.length;
	const end = props.selectionEnd ?? start;
	const allowedTokens = tokens.value.map(item => item.value);
	const result = insertTemplateToken(props.modelValue, start, end, token, allowedTokens);
	emit('update:modelValue', result.value);
	emit('inserted', result.value, result.cursor);
}
</script>
