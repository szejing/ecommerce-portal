<template>
	<div class="space-y-3">
		<section
			v-for="block in blocks"
			:key="block.id"
			:data-block="block.id"
			class="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-default p-4"
		>
			<div class="min-w-0 space-y-1">
				<div class="flex items-center gap-2">
					<UIcon v-if="block.required" name="i-lucide-lock-keyhole" class="size-4 shrink-0 text-muted" />
					<h3 class="text-sm font-semibold text-default">{{ blockLabel(block) }}</h3>
				</div>
				<p class="text-xs text-muted">
					{{ t(block.required ? 'components.templateStudio.requiredSection' : 'components.templateStudio.optionalSection') }}
				</p>
			</div>
			<UCheckbox
				:model-value="enabled(block)"
				:disabled="block.required"
				:aria-label="blockLabel(block)"
				@update:model-value="toggle(block, $event)"
			/>
		</section>
	</div>
</template>

<script setup lang="ts">
import type { DocumentTemplateBlock, DocumentTemplateConfiguration } from '~/utils/types/document-template';

type ConfiguredBlock = NonNullable<DocumentTemplateConfiguration['blocks']>[number];

const props = withDefaults(defineProps<{
	blocks: DocumentTemplateBlock[];
	modelValue?: ConfiguredBlock[];
}>(), {
	modelValue: () => [],
});

const emit = defineEmits<{
	'update:modelValue': [blocks: ConfiguredBlock[]];
}>();

const { t, te } = useI18n();

function enabled(block: DocumentTemplateBlock): boolean {
	if (block.required) return true;
	return props.modelValue.find(value => value.id === block.id)?.enabled ?? block.default_enabled;
}

function blockLabel(block: DocumentTemplateBlock): string {
	const key = `components.templateStudio.blockLabels.${block.id}`;
	return te(key) ? t(key) : block.label;
}

function toggle(block: DocumentTemplateBlock, value: boolean | 'indeterminate'): void {
	if (block.required || typeof value !== 'boolean') return;
	emit('update:modelValue', props.blocks.map(candidate => ({
		id: candidate.id,
		enabled: candidate.required ? true : (candidate.id === block.id ? value : enabled(candidate)),
		props: {},
	})));
}
</script>
