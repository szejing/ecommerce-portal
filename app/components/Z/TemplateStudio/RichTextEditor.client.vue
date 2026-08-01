<template>
	<div class="space-y-3">
		<QuillEditor
			ref="editorRef"
			:content="editorContent"
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
import { Delta, Quill, QuillEditor } from '@vueup/vue-quill';
import { Mention, MentionBlot } from 'quill-mention';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import 'quill-mention/dist/quill.mention.css';
import { planPlainTextTokenChipify } from '~/utils/document-template';
import {
	hydrateTemplateTokensInHtml,
	serializeTemplateTokenHtml,
} from './template-token-blot';

type QuillRange = { index: number; length: number };
type QuillContents = { ops?: Array<{ insert?: string | Record<string, unknown> }> };
type QuillInstance = {
	root: HTMLElement;
	getSelection: (focus?: boolean) => QuillRange | null;
	getIndex: (blot: unknown) => number;
	getContents: () => QuillContents;
	on: (event: string, handler: (...args: unknown[]) => void) => void;
	updateContents: (change: Delta, source?: string) => void;
	setSelection: (index: number, length: number, source?: string) => void;
	deleteText: (index: number, length: number, source?: string) => void;
	insertText: (index: number, text: string, source?: string) => void;
	insertEmbed: (index: number, type: string, value: unknown, source?: string) => void;
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

const formats = [...ESSENTIAL_FORMATS, 'templateToken'];
const editorRef = ref<{
	getQuill?: () => QuillInstance;
	setContents?: (content: string, source?: string) => void;
}>();
const quill = shallowRef<QuillInstance>();
const selection = ref<QuillRange>({ index: 0, length: 0 });
let rejectedContentUpdate = false;
const removeClickBoundEditors = new WeakSet<object>();
const textChangeBoundEditors = new WeakSet<object>();
let chipifying = false;
/** Last serialized storage HTML we emitted (or last external model applied). */
let lastSerialized = props.modelValue;
/**
 * Hydrated HTML shown to Quill. Only updated for external modelValue changes —
 * never re-hydrated from self-echo, or Quill's embed DOM fights setHTML.
 */
const editorContent = ref(
	hydrateTemplateTokensInHtml(props.modelValue, props.allowedTokens),
);

function currentSerializedFromEditor(): string | undefined {
	const root = quill.value?.root;
	if (!root?.innerHTML) return undefined;
	return serializeTemplateTokenHtml(root.innerHTML);
}

function applyExternalModelValue(html: string): void {
	lastSerialized = html;
	editorContent.value = hydrateTemplateTokensInHtml(html, props.allowedTokens);
}

watch(
	() => props.modelValue,
	(next) => {
		const live = currentSerializedFromEditor();
		if (next === lastSerialized || (live !== undefined && next === live)) return;
		applyExternalModelValue(next);
	},
);

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
					editor.insertEmbed(start, 'templateToken', token, 'user');
					editor.insertText(start + 1, ' ', 'user');
					editor.setSelection(start + 2, 0, 'user');
				},
			},
		},
	];
});

function bindTokenRemove(editor: QuillInstance): void {
	if (removeClickBoundEditors.has(editor) || !editor.root?.addEventListener) return;
	removeClickBoundEditors.add(editor);
	editor.root.addEventListener('click', (event: Event) => {
		const target = event.target as HTMLElement | null;
		const button = target?.closest?.('[data-token-remove]') as HTMLElement | null;
		if (!button || !editor.root.contains(button)) return;
		event.preventDefault();
		event.stopPropagation();
		const chip = button.closest('.template-token-chip');
		if (!chip) return;
		const blot = Quill.find(chip);
		if (!blot) return;
		const index = editor.getIndex(blot);
		editor.deleteText(index, 1, 'user');
	});
}

/**
 * Convert newly completed allowlisted `{{token}}` plain text into embeds.
 * Uses deleteText/insertEmbed (api source) — does not rebind `:content`.
 */
function chipifyPlainTokensInEditor(editor: QuillInstance): void {
	if (chipifying || !props.allowedTokens.length) return;
	const ops = editor.getContents?.()?.ops;
	if (!ops?.length) return;
	const replacements = planPlainTextTokenChipify(ops, props.allowedTokens);
	if (!replacements.length) return;

	chipifying = true;
	try {
		const sel = editor.getSelection?.(false);
		let cursor = sel?.index ?? null;

		for (let i = replacements.length - 1; i >= 0; i--) {
			const replacement = replacements[i]!;
			if (cursor !== null) {
				if (cursor >= replacement.index + replacement.length) {
					cursor -= replacement.length - 1;
				} else if (cursor > replacement.index) {
					cursor = replacement.index + 1;
				}
			}
			editor.deleteText(replacement.index, replacement.length, 'api');
			editor.insertEmbed(replacement.index, 'templateToken', replacement.token, 'api');
		}

		if (cursor !== null) {
			editor.setSelection(cursor, 0, 'silent');
			selection.value = { index: cursor, length: 0 };
		}
	} finally {
		chipifying = false;
	}
}

function bindPlainTokenChipify(editor: QuillInstance): void {
	if (typeof editor.on !== 'function' || textChangeBoundEditors.has(editor)) return;
	textChangeBoundEditors.add(editor);
	editor.on('text-change', (_delta, _oldDelta, source) => {
		if (source !== 'user') return;
		chipifyPlainTokensInEditor(editor);
	});
}

function rememberEditor(instance: QuillInstance): void {
	quill.value = instance;
	if (props.ariaLabel) instance.root.setAttribute('aria-label', props.ariaLabel);
	bindTokenRemove(instance);
	bindPlainTokenChipify(instance);
}

function rememberSelection(payload: { range?: QuillRange | null }): void {
	if (payload.range) selection.value = payload.range;
}

function updateContent(value: unknown): void {
	if (typeof value !== 'string') return;
	const serialized = serializeTemplateTokenHtml(value);
	if (props.maxLength !== undefined && serialized.length > props.maxLength) {
		rejectedContentUpdate = true;
		const restore = hydrateTemplateTokensInHtml(props.modelValue, props.allowedTokens);
		editorContent.value = restore;
		editorRef.value?.setContents?.(restore, 'silent');
		return;
	}
	lastSerialized = serialized;
	emit('update:modelValue', serialized);
}

function insertToken(token: string): void {
	const value = tokenValue(token);
	let editor = quill.value;
	if (!editor) {
		try {
			editor = editorRef.value?.getQuill?.();
		} catch {
			editor = undefined;
		}
	}
	if (!editor) {
		const next = `${props.modelValue}${value}`;
		if (props.maxLength === undefined || next.length <= props.maxLength) emit('update:modelValue', next);
		return;
	}
	const range = selection.value;
	rejectedContentUpdate = false;
	const change = new Delta()
		.retain(range.index)
		.delete(range.length)
		.insert({ templateToken: value });
	editor.updateContents(change, 'user');
	if (rejectedContentUpdate) {
		editor.setSelection(range.index, range.length, 'silent');
		rejectedContentUpdate = false;
		return;
	}
	editor.setSelection(range.index + 1, 0, 'silent');
	selection.value = { index: range.index + 1, length: 0 };
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

:deep(.ql-editor .template-token-chip) {
	display: inline-flex;
	align-items: center;
	gap: 0.25rem;
	border-radius: 9999px;
	border: 1px solid color-mix(in oklab, var(--ui-primary) 30%, transparent);
	background-color: color-mix(in oklab, var(--ui-primary) 10%, transparent);
	padding: 0.125rem 0.5rem;
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
	font-size: 0.75rem;
	line-height: 1rem;
	color: var(--ui-primary);
	vertical-align: middle;
	user-select: none;
}

:deep(.ql-editor .template-token-chip button[data-token-remove]) {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1rem;
	height: 1rem;
	border-radius: 9999px;
	color: var(--ui-primary);
	cursor: pointer;
}
</style>
