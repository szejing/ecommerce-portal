<template>
	<div class="space-y-3">
		<div :id="toolbarId" class="ql-toolbar ql-snow" role="toolbar" :aria-label="t('components.templateStudio.richTextToolbar')">
			<span class="ql-formats">
				<button type="button" class="ql-bold" :aria-label="t('components.templateStudio.bold')" />
				<button type="button" class="ql-italic" :aria-label="t('components.templateStudio.italic')" />
				<button type="button" class="ql-link" :aria-label="t('components.templateStudio.link')" />
			</span>
		</div>
		<QuillEditor
			ref="editorRef"
			:content="modelValue"
			content-type="html"
			theme="snow"
			:toolbar="`#${toolbarId}`"
			:options="{ placeholder, formats }"
			class="template-rich-text-editor"
			@ready="rememberEditor"
			@selection-change="rememberSelection"
			@update:content="updateContent"
		/>
		<ZTemplateStudioTokenPicker
			v-if="allowedTokens.length"
			:allowed-tokens="allowedTokens"
			@select="insertToken"
		/>
	</div>
</template>

<script setup lang="ts">
import { Delta, QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';

type QuillRange = { index: number; length: number };
type QuillInstance = {
	root: HTMLElement;
	getSelection: (focus?: boolean) => QuillRange | null;
	updateContents: (change: Delta, source?: string) => void;
	setSelection: (index: number, length: number, source?: string) => void;
};

const props = withDefaults(defineProps<{
	modelValue: string;
	allowedTokens?: readonly string[];
	placeholder?: string;
	maxLength?: number;
	ariaLabel?: string;
}>(), {
	allowedTokens: () => [],
	placeholder: undefined,
	maxLength: undefined,
	ariaLabel: undefined,
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const { t } = useI18n();
const toolbarId = `template-rich-text-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
const formats = ['bold', 'italic', 'link'];
const editorRef = ref<{
	getQuill?: () => QuillInstance;
	setContents?: (content: string, source?: string) => void;
}>();
const quill = shallowRef<QuillInstance>();
const selection = ref<QuillRange>({ index: 0, length: 0 });
let rejectedContentUpdate = false;

function rememberEditor(instance: QuillInstance): void {
	quill.value = instance;
	if (props.ariaLabel) instance.root.setAttribute('aria-label', props.ariaLabel);
}

function rememberSelection(payload: { range?: QuillRange | null }): void {
	if (payload.range) selection.value = payload.range;
}

function updateContent(value: unknown): void {
	if (typeof value !== 'string') return;
	if (props.maxLength !== undefined && value.length > props.maxLength) {
		rejectedContentUpdate = true;
		editorRef.value?.setContents?.(props.modelValue, 'silent');
		return;
	}
	emit('update:modelValue', value);
}

function insertToken(token: string): void {
	let editor = quill.value;
	if (!editor) {
		try {
			editor = editorRef.value?.getQuill?.();
		} catch {
			editor = undefined;
		}
	}
	if (!editor) {
		const value = `${props.modelValue}${token}`;
		if (props.maxLength === undefined || value.length <= props.maxLength) emit('update:modelValue', value);
		return;
	}
	const range = selection.value;
	const change = new Delta().retain(range.index).delete(range.length).insert(token);
	rejectedContentUpdate = false;
	editor.updateContents(change, 'user');
	if (rejectedContentUpdate) {
		editor.setSelection(range.index, range.length, 'silent');
		rejectedContentUpdate = false;
		return;
	}
	editor.setSelection(range.index + token.length, 0, 'silent');
	selection.value = { index: range.index + token.length, length: 0 };
}

watch(() => props.ariaLabel, (value) => {
	if (!quill.value) return;
	if (value) quill.value.root.setAttribute('aria-label', value);
	else quill.value.root.removeAttribute('aria-label');
});
</script>

<style scoped>
:deep(.ql-toolbar.ql-snow) {
	border-color: var(--ui-border);
	border-radius: var(--ui-radius) var(--ui-radius) 0 0;
}

:deep(.ql-toolbar.ql-snow button) {
	min-height: 2.75rem;
	min-width: 2.75rem;
}

:deep(.ql-container.ql-snow) {
	min-height: 9rem;
	border-color: var(--ui-border);
	border-radius: 0 0 var(--ui-radius) var(--ui-radius);
}
</style>
