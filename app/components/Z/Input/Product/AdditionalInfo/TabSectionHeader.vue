<template>
	<div class="flex items-start justify-between mb-4">
		<div class="flex-1">
			<div class="flex items-center gap-2">
				<UIcon :name="icon" class="text-primary-500 w-5 h-5" />
				<h3 class="text-lg font-semibold text-neutral-900">{{ t(titleKey) }}</h3>
			</div>
			<p class="text-sm text-neutral-500 mt-1">{{ t(descriptionKey) }}</p>
		</div>
		<UTooltip v-if="tooltipKey" :text="t(tooltipKey)" :popper="{ placement: 'left' }">
			<UIcon :name="ICONS.HELP" class="text-neutral-400 hover:text-primary-500 w-4 h-4 cursor-help shrink-0" />
		</UTooltip>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
const { t } = useI18n();
defineProps<{
	/** Icon name from ICONS (e.g. ICONS.LAYERS) */
	icon: string;
	/** i18n key for section title */
	titleKey: string;
	/** i18n key for short description below title */
	descriptionKey: string;
	/** i18n key for help tooltip; omit to hide tooltip */
	tooltipKey?: string;
}>();
</script>
