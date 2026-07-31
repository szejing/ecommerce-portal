<template>
	<div class="space-y-6">
		<section
			v-for="field in contentFields"
			:key="field.path"
			:data-field="field.path"
			class="space-y-3 rounded-xl border border-default p-4"
		>
			<UFormField :label="fieldLabel(field)" :name="field.path" :required="!field.allow_blank">
				<UInput
					v-if="field.path === 'content.subject'"
					:model-value="fieldValue(field.path)"
					:maxlength="field.max_length"
					@update:model-value="updateField(field.path, String($event ?? ''))"
					@select="rememberSelection(field.path, $event)"
					@click="rememberSelection(field.path, $event)"
					@keyup="rememberSelection(field.path, $event)"
				/>
				<ZTemplateStudioRichTextEditor
					v-else
					:model-value="fieldValue(field.path)"
					:allowed-tokens="allowedTokens(field)"
					:max-length="field.max_length"
					:placeholder="fieldLabel(field)"
					:aria-label="fieldLabel(field)"
					@update:model-value="updateField(field.path, $event)"
				/>
			</UFormField>

			<ZTemplateStudioTokenPicker
				v-if="field.path === 'content.subject'"
				:allowed-tokens="allowedTokens(field)"
				:model-value="fieldValue(field.path)"
				:selection-start="selectionFor(field.path).start"
				:selection-end="selectionFor(field.path).end"
				:max-length="field.max_length"
				@update:model-value="updateField(field.path, $event)"
				@inserted="(_value, cursor) => setCursor(field.path, cursor)"
			/>

			<p
				v-if="fieldErrors[field.path]"
				:data-field-error="field.path"
				class="text-sm text-error"
				role="alert"
			>
				{{ fieldErrors[field.path] }}
			</p>
		</section>
	</div>
</template>

<script setup lang="ts">
import type {
	DocumentTemplateChannel,
	DocumentTemplateConfiguration,
	DocumentTemplateField,
} from '~/utils/types/document-template';

const props = withDefaults(defineProps<{
	entry: {
		channel: DocumentTemplateChannel;
		fields: DocumentTemplateField[];
		allowed_tokens: string[];
	};
	modelValue: DocumentTemplateConfiguration;
	fieldErrors?: Record<string, string>;
}>(), {
	fieldErrors: () => ({}),
});

const emit = defineEmits<{
	'update:path': [path: string, value: string];
}>();

const { t, te } = useI18n();
const selections = reactive<Record<string, { start: number; end: number }>>({});
const allowedContentFields = new Set(['content.subject', 'content.greeting', 'content.introduction', 'content.footer']);

const contentFields = computed(() => props.entry.fields.filter((field) => {
	if (!allowedContentFields.has(field.path)) return false;
	if (field.path === 'content.subject') return props.entry.channel === 'email' && field.kind === 'plain-text';
	return field.kind === 'rich-text';
}));

function tokenName(token: string): string {
	return /^\{\{([^{}]+)\}\}$/.exec(token)?.[1] ?? token;
}

function allowedTokens(field: DocumentTemplateField): string[] {
	const entryTokens = new Set(props.entry.allowed_tokens.map(tokenName));
	return field.allowed_tokens.filter(token => entryTokens.has(tokenName(token)));
}

function fieldValue(path: string): string {
	const key = path.split('.')[1] as keyof NonNullable<DocumentTemplateConfiguration['content']>;
	const value = props.modelValue.content?.[key];
	return typeof value === 'string' ? value : '';
}

function fieldLabel(field: DocumentTemplateField): string {
	const key = `components.templateStudio.fieldLabels.${field.path.replace('.', '_')}`;
	return te(key) ? t(key) : field.label;
}

function updateField(path: string, value: string): void {
	emit('update:path', path, value);
}

function rememberSelection(path: string, event: Event): void {
	const target = event.target;
	if (!(target instanceof HTMLInputElement)) return;
	selections[path] = {
		start: target.selectionStart ?? target.value.length,
		end: target.selectionEnd ?? target.value.length,
	};
}

function selectionFor(path: string): { start: number; end: number } {
	const valueLength = fieldValue(path).length;
	return selections[path] ?? { start: valueLength, end: valueLength };
}

function setCursor(path: string, cursor: number): void {
	selections[path] = { start: cursor, end: cursor };
}
</script>
