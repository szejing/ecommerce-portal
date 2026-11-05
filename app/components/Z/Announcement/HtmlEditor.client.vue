<template>
	<QuillEditor
		:content="editorContent"
		content-type="html"
		theme="snow"
		:toolbar="toolbar"
		:options="{ placeholder, formats }"
		class="announcement-html-editor"
		@ready="rememberEditor"
		@update:content="updateContent"
	/>
</template>

<script setup lang="ts">
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';

const props = withDefaults(
	defineProps<{
		modelValue: string;
		placeholder?: string;
		ariaLabel?: string;
	}>(),
	{
		placeholder: undefined,
		ariaLabel: undefined,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const formats = ['bold', 'italic', 'underline', 'list', 'link'];
const toolbar = [
	['bold', 'italic', 'underline'],
	[{ list: 'ordered' }, { list: 'bullet' }],
	['link'],
];

const editorContent = ref(props.modelValue);
const quillRoot = shallowRef<HTMLElement>();
let lastEmitted = props.modelValue;

watch(
	() => props.modelValue,
	(next) => {
		if (next === lastEmitted) return;
		lastEmitted = next;
		editorContent.value = next;
	},
);

function rememberEditor(instance: { root: HTMLElement }) {
	quillRoot.value = instance.root;
	if (props.ariaLabel) instance.root.setAttribute('aria-label', props.ariaLabel);
}

function updateContent(value: unknown) {
	if (typeof value !== 'string') return;
	lastEmitted = value;
	emit('update:modelValue', value);
}

watch(
	() => props.ariaLabel,
	(value) => {
		const root = quillRoot.value;
		if (!root) return;
		if (value) root.setAttribute('aria-label', value);
		else root.removeAttribute('aria-label');
	},
);
</script>

<style scoped>
:deep(.ql-toolbar.ql-snow) {
	border-color: var(--ui-border);
	border-radius: var(--ui-radius) var(--ui-radius) 0 0;
	padding: 0.3rem 0.4rem;
}

:deep(.ql-toolbar.ql-snow .ql-formats) {
	margin-right: 0.625rem;
}

:deep(.ql-toolbar.ql-snow button) {
	height: 1.5rem;
	width: 1.5rem;
	min-height: 1.5rem;
	min-width: 1.5rem;
	padding: 0.15rem;
}

:deep(.ql-toolbar.ql-snow button svg) {
	height: 1rem;
	width: 1rem;
}

:deep(.ql-container.ql-snow) {
	min-height: 9rem;
	border-color: var(--ui-border);
	border-radius: 0 0 var(--ui-radius) var(--ui-radius);
}

:deep(.ql-editor) {
	min-height: 9rem;
}
</style>
