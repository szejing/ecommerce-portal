<template>
	<div data-testid="template-navigation">
		<USelect
			v-model="selectedKey"
			:items="items"
			value-key="value"
			label-key="label"
			:aria-label="t('components.templateStudio.templateNavigation')"
			:placeholder="t('components.templateStudio.chooseTemplate')"
			color="neutral"
			variant="outline"
			class="w-full max-w-md"
			:ui="{ trailingIcon: 'group-data-[state=open]:rotate-180 transition-transform duration-200' }"
		/>
	</div>
</template>

<script setup lang="ts">
import type { DocumentTemplateSummary } from '~/utils/types/document-template';

const props = withDefaults(
	defineProps<{
		templates: DocumentTemplateSummary[];
		selected?: { channel: DocumentTemplateSummary['channel']; templateCode: string } | null;
		templateLabel?: (template: DocumentTemplateSummary) => string;
	}>(),
	{
		selected: null,
	},
);

const emit = defineEmits<{
	select: [template: DocumentTemplateSummary];
}>();

const { t } = useI18n();

const templateKey = (template: DocumentTemplateSummary) => `${template.channel}:${template.template_code}`;
const displayName = (template: DocumentTemplateSummary) => props.templateLabel?.(template) ?? template.display_name;

const editableTemplates = computed(() => props.templates.filter((template) => template.editable));

const items = computed(() =>
	editableTemplates.value.map((template) => ({
		label: displayName(template),
		value: templateKey(template),
	})),
);

const selectedKey = computed({
	get: () => (props.selected ? `${props.selected.channel}:${props.selected.templateCode}` : undefined),
	set: (value: string | undefined) => {
		const template = editableTemplates.value.find((candidate) => templateKey(candidate) === value);
		if (template) emit('select', template);
	},
});
</script>
