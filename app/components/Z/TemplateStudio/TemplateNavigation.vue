<template>
	<div>
		<div data-testid="template-navigation-mobile" class="xl:hidden">
			<USelectMenu
				v-model="selectedKey"
				:items="mobileItems"
				value-key="value"
				:aria-label="t('components.templateStudio.templateNavigation')"
				:placeholder="t('components.templateStudio.chooseTemplate')"
				:ui="{ base: 'min-h-11' }"
				class="w-full"
			/>
		</div>

		<nav
			data-testid="template-navigation-desktop"
			:aria-label="t('components.templateStudio.templateNavigation')"
			class="hidden space-y-6 xl:block"
		>
			<section v-for="group in groups" :key="group.key" class="space-y-2">
				<h2 class="px-2 text-xs font-semibold uppercase tracking-wide text-muted">
					{{ group.label }}
				</h2>
				<div class="space-y-1">
					<UButton
						v-for="template in group.templates"
						:key="templateKey(template)"
						:data-template-key="templateKey(template)"
						:data-template-state="template.editable ? 'editable' : 'locked'"
						:aria-current="isSelected(template) ? 'page' : undefined"
						:disabled="!template.editable"
						:color="isSelected(template) ? 'primary' : 'neutral'"
						:variant="isSelected(template) ? 'soft' : 'ghost'"
						class="min-h-11 w-full justify-start px-3 text-left"
						@click="select(template)"
					>
						<UIcon :name="template.channel === 'email' ? 'i-lucide-mail' : 'i-lucide-file-text'" class="size-4 shrink-0" />
						<span class="min-w-0 flex-1 truncate">{{ displayName(template) }}</span>
						<UIcon v-if="!template.editable" name="i-lucide-lock-keyhole" class="size-4 shrink-0" />
						<span class="sr-only" v-if="!template.editable">{{ t('components.templateStudio.locked') }}</span>
					</UButton>
				</div>
			</section>
		</nav>
	</div>
</template>

<script setup lang="ts">
import type { DocumentTemplateSummary } from '~/utils/types/document-template';

const props = withDefaults(defineProps<{
	templates: DocumentTemplateSummary[];
	selected?: { channel: DocumentTemplateSummary['channel']; templateCode: string } | null;
	templateLabel?: (template: DocumentTemplateSummary) => string;
}>(), {
	selected: null,
});

const emit = defineEmits<{
	select: [template: DocumentTemplateSummary];
}>();

const { t } = useI18n();

const templateKey = (template: DocumentTemplateSummary) => `${template.channel}:${template.template_code}`;
const displayName = (template: DocumentTemplateSummary) => props.templateLabel?.(template) ?? template.display_name;

const groups = computed(() => [
	{
		key: 'customer-emails',
		label: t('components.templateStudio.customerEmails'),
		templates: props.templates.filter(template => template.channel === 'email' && template.editable),
	},
	{
		key: 'pdf-documents',
		label: t('components.templateStudio.pdfDocuments'),
		templates: props.templates.filter(template => template.channel === 'pdf' && template.editable),
	},
	{
		key: 'locked-templates',
		label: t('components.templateStudio.lockedTemplates'),
		templates: props.templates.filter(template => !template.editable),
	},
].filter(group => group.templates.length > 0));

const mobileItems = computed(() => props.templates.map(template => ({
	label: template.editable ? displayName(template) : `${displayName(template)} (${t('components.templateStudio.locked')})`,
	value: templateKey(template),
	disabled: !template.editable,
})));

const selectedKey = computed({
	get: () => props.selected ? `${props.selected.channel}:${props.selected.templateCode}` : undefined,
	set: (value: string | undefined) => {
		const template = props.templates.find(candidate => templateKey(candidate) === value);
		if (template?.editable) emit('select', template);
	},
});

const isSelected = (template: DocumentTemplateSummary) =>
	props.selected?.channel === template.channel && props.selected.templateCode === template.template_code;

const select = (template: DocumentTemplateSummary) => {
	if (template.editable) emit('select', template);
};
</script>
