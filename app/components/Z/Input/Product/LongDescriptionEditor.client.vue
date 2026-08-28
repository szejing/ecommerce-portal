<template>
	<client-only>
		<QuillEditor
			v-model:content="html"
			content-type="html"
			theme="snow"
			:toolbar="toolbar"
			:options="{
				placeholder,
				formats,
			}"
			class="product-long-desc-editor"
		/>
	</client-only>
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
	border-color: var(--ui-border);
	border-radius: var(--ui-radius) var(--ui-radius) 0 0;
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
