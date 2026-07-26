<template>
	<div class="flex items-start justify-between">
		<div class="flex-1">
			<div class="flex items-center gap-2">
				<UIcon :name="ICONS.LAYERS" class="text-primary-500 w-6 h-6" />
				<h2 class="text-xl font-semibold">{{ t('components.productUpdate.additionalInfo') }}</h2>
				<span class="text-xs text-neutral-500 ml-2">({{ t('components.productUpdate.optional') }})</span>
			</div>
			<p class="text-sm text-neutral-500 mt-1">{{ t('components.productUpdate.additionalInfoDescription') }}</p>
		</div>
		<UTooltip :text="t('components.productUpdate.additionalInfoTooltip')" :popper="{ placement: 'bottom' }">
			<UIcon :name="ICONS.HELP" class="text-neutral-400 hover:text-primary-500 w-5 h-5 cursor-help" />
		</UTooltip>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
const { t } = useI18n();
// Uses global ICONS from app/utils/icons.ts (auto-imported)
</script>
