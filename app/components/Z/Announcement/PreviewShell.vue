<template>
	<div class="rounded-lg border border-default bg-elevated/40 p-3 sm:p-4">
		<div class="mb-2 flex items-center justify-between gap-2">
			<p class="text-sm font-semibold text-default">{{ title }}</p>
			<UBadge color="neutral" variant="subtle" :label="badge" />
		</div>
		<p class="mb-3 text-xs leading-5 text-muted">{{ hint }}</p>
		<div class="overflow-hidden rounded-lg border border-default bg-default">
			<slot name="header" />
			<slot />
		</div>
	</div>
</template>

<script setup lang="ts">
defineProps<{
	title: string;
	badge: string;
	hint: string;
}>();
</script>
