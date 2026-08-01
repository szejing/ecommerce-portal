<template>
	<div class="space-y-3">
		<QuillEditor
			ref="editorRef"
			:content="modelValue"
			content-type="html"
			theme="snow"
			toolbar="essential"
			:modules="mentionModules"
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
import { Mention, MentionBlot } from 'quill-mention';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import 'quill-mention/dist/quill.mention.css';

type QuillRange = { index: number; length: number };
type QuillInstance = {
	root: HTMLElement;
	getSelection: (focus?: boolean) => QuillRange | null;
	updateContents: (change: Delta, source?: string) => void;
	setSelection: (index: number, length: number, source?: string) => void;
	deleteText: (index: number, length: number, source?: string) => void;
	insertText: (index: number, text: string, source?: string) => void;
};

type MentionListItem = { id: string; value: string };
type MentionModuleHost = {
	quill: QuillInstance;
	mentionCharPos?: number;
	cursorPos?: number;
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

const ESSENTIAL_FORMATS = [
	'header',
	'bold',
	'italic',
	'underline',
	'list',
	'align',
	'blockquote',
	'code-block',
	'link',
	'color',
] as const;

const formats = [...ESSENTIAL_FORMATS];
const editorRef = ref<{
	getQuill?: () => QuillInstance;
	setContents?: (content: string, source?: string) => void;
}>();
const quill = shallowRef<QuillInstance>();
const selection = ref<QuillRange>({ index: 0, length: 0 });
let rejectedContentUpdate = false;

function tokenName(token: string): string {
	return /^\{\{([^{}]+)\}\}$/.exec(token)?.[1] ?? token;
}

function tokenValue(token: string): string {
	return `{{${tokenName(token)}}}`;
}

const mentionModules = computed(() => {
	if (!props.allowedTokens.length) return undefined;

	const items: MentionListItem[] = [];
	const seen = new Set<string>();
	for (const token of props.allowedTokens) {
		const name = tokenName(token);
		if (!name || seen.has(name)) continue;
		seen.add(name);
		items.push({ id: name, value: name });
	}

	return [
		{ name: 'blots/mention', module: MentionBlot },
		{
			name: 'modules/mention',
			module: Mention,
			options: {
				mentionDenotationChars: ['@'],
				allowedChars: /^[A-Za-z0-9_]*$/,
				showDenotationChar: false,
				spaceAfterInsert: true,
				source: (
					searchTerm: string,
					renderList: (matches: MentionListItem[], term: string) => void,
				) => {
					const term = searchTerm.toLowerCase();
					const matches = !term
						? items
						: items.filter((item) => item.value.toLowerCase().includes(term));
					renderList(matches, searchTerm);
				},
				onSelect(this: MentionModuleHost, item: MentionListItem | DOMStringMap) {
					const name = String(item.value ?? item.id ?? '');
					if (!name) return;
					const token = tokenValue(name);
					const editor = this.quill;
					const start = this.mentionCharPos;
					const end = this.cursorPos;
					if (start === undefined || end === undefined) return;
					editor.deleteText(start, end - start, 'user');
					editor.insertText(start, token, 'user');
					editor.insertText(start + token.length, ' ', 'user');
					editor.setSelection(start + token.length + 1, 0, 'user');
				},
			},
		},
	];
});

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
	height: 1.75rem;
	width: 1.75rem;
	min-height: 1.75rem;
	min-width: 1.75rem;
	padding: 0.2rem;
}

:deep(.ql-container.ql-snow) {
	min-height: 9rem;
	border-color: var(--ui-border);
	border-radius: 0 0 var(--ui-radius) var(--ui-radius);
}
</style>
