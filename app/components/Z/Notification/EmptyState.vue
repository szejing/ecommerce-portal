<template>
	<div :class="['z-notification-empty', compact ? 'z-notification-empty--compact' : 'z-notification-empty--page']">
		<UIcon :name="ICONS.CHECK_OUTLINE_ROUNDED" :class="compact ? 'size-8' : 'size-10'" />
		<p>{{ t('notifications.empty') }}</p>
	</div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

withDefaults(
	defineProps<{
		compact?: boolean;
	}>(),
	{
		compact: false,
	},
);
</script>

<style scoped>
.z-notification-empty {
	display: grid;
	place-items: center;
	gap: 0.75rem;
	color: var(--color-neutral-500);
	text-align: center;
}

.z-notification-empty--compact {
	min-height: 10rem;
}

.z-notification-empty--page {
	min-height: 18rem;
}
</style>
