<template>
	<UDropdownMenu :items="items">
		<UButton color="neutral" variant="ghost" :icon="ICONS.HORIZONTAL_ELLIPSIS" />

		<template #item="{ item }">
			<UIcon :name="item.icon" class="size-5 text-neutral-500" />
			<span class="truncate text-neutral-500">{{ item.label }}</span>
		</template>

		<template #danger="{ item }">
			<UIcon :name="item.icon" class="size-5 text-red-600" />
			<span class="truncate text-red-600">{{ item.label }}</span>
		</template>
	</UDropdownMenu>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';

defineProps<{ items: any }>();
</script>

<style scoped></style>
