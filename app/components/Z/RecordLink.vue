<template>
	<component
		:is="to ? NuxtLink : 'button'"
		v-bind="to ? { to } : { type: 'button' }"
		class="flex min-h-16 w-full items-center text-start gap-2.5 px-2 py-2.5 hover:bg-elevated focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
	>
		<slot name="leading" />
		<span class="min-w-0 flex-1 wrap-anywhere">
			<slot />
		</span>
		<span v-if="$slots.trailing" class="flex max-w-1/2 flex-col items-end gap-1 text-end">
			<slot name="trailing" />
		</span>
		<UIcon :name="ICONS.CHEVRON_RIGHT" class="size-4 shrink-0 text-muted" aria-hidden="true" />
	</component>
</template>

<script lang="ts" setup>
import { NuxtLink } from '#components';
import { ICONS } from '~/utils/icons';

defineProps<{ to?: string }>();
</script>
