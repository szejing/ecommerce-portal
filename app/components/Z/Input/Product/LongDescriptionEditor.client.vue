<template>
	<div class="product-long-desc-editor">
		<QuillEditor
			v-model:content="html"
			content-type="html"
			theme="snow"
			:toolbar="toolbar"
			:options="{
				placeholder,
				formats,
			}"
		/>
	</div>
</template>

<script lang="ts" setup>
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';

const ESSENTIAL_FORMATS = ['bold', 'italic', 'underline', 'list', 'link'] as const;

const props = withDefaults(
	defineProps<{
		modelValue?: string | null;
		placeholder?: string;
	}>(),
	{
		modelValue: '',
		placeholder: undefined,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
}>();

const formats = [...ESSENTIAL_FORMATS];
const toolbar = [
	['bold', 'italic', 'underline'],
	[{ list: 'ordered' }, { list: 'bullet' }],
	['link'],
];

const html = computed({
	get() {
		return props.modelValue ?? '';
	},
	set(value: string) {
		emit('update:modelValue', value);
	},
});
</script>

<style scoped>
:deep(.ql-toolbar.ql-snow) {
	background: var(--ui-bg-muted);
	border-color: var(--ui-border-accented);
	border-radius: var(--ui-radius) var(--ui-radius) 0 0;
}

:deep(.ql-container.ql-snow) {
	min-height: 9rem;
	border-color: var(--ui-border-accented);
	border-radius: 0 0 var(--ui-radius) var(--ui-radius);
}

:deep(.ql-toolbar.ql-snow button) {
	color: var(--ui-text-toned);
}

:deep(.ql-toolbar.ql-snow button:is(:hover, :focus-visible, .ql-active)) {
	background: var(--ui-bg-accented);
	color: var(--ui-text-highlighted);
}

:deep(.ql-toolbar.ql-snow button .ql-stroke) {
	stroke: currentColor;
}

:deep(.ql-toolbar.ql-snow button .ql-fill) {
	fill: currentColor;
}

:deep(.ql-snow .ql-tooltip) {
	background: var(--ui-bg-elevated);
	border-color: var(--ui-border-accented);
	box-shadow: 0 2px 8px rgb(0 0 0 / 20%);
	color: var(--ui-text);
}

:deep(.ql-snow .ql-tooltip input[type='text']) {
	background: var(--ui-bg);
	border-color: var(--ui-border-accented);
	color: var(--ui-text);
}

:deep(.ql-editor.ql-blank::before) {
	color: var(--ui-text-muted);
}

:deep(.ql-editor) {
	min-height: 9rem;
}
</style>
