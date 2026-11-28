<template>
	<div class="flex items-start justify-between">
		<div class="flex-1">
			<div class="flex items-center gap-2">
				<UIcon :name="ICONS.LAYERS" class="text-primary-500 w-6 h-6" />
				<h2 class="text-xl font-semibold">{{ t(titleKey) }}</h2>
				<span class="text-xs text-neutral-500 ml-2">({{ t('components.productUpdate.optional') }})</span>
			</div>
			<p class="text-sm text-neutral-500 mt-1">{{ t(descriptionKey) }}</p>
		</div>
		<UTooltip :text="t('components.productUpdate.additionalInfoTooltip')" :popper="{ placement: 'bottom' }">
			<UIcon :name="ICONS.HELP" class="text-neutral-400 hover:text-primary-500 w-5 h-5 cursor-help" />
		</UTooltip>
	</div>
</template>

<script lang="ts" setup>
const props = withDefaults(
	defineProps<{
		titleKey?: string;
		descriptionKey?: string;
	}>(),
	{
		titleKey: 'components.productUpdate.additionalInfo',
		descriptionKey: 'components.productUpdate.additionalInfoDescription',
	},
);
const { titleKey, descriptionKey } = toRefs(props);
const { t } = useI18n();
</script>
