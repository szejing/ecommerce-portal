<template>
	<UCard :ui="{ body: 'p-0 sm:p-0' }">
		<div v-if="templateName || $slots.actions" class="flex flex-col gap-4 border-b border-default px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
			<h2 v-if="templateName" class="truncate text-lg font-semibold text-default">{{ templateName }}</h2>
			<div v-if="$slots.actions" class="flex flex-wrap gap-2 lg:justify-end">
				<slot name="actions" />
			</div>
		</div>

		<UTabs v-model="activeTab" :items="tabItems" class="w-full px-4 py-4 sm:px-6">
			<template #content>
				<slot name="content">
					<div class="py-10 text-center text-sm text-muted">{{ t('components.templateStudio.contentComingSoon') }}</div>
				</slot>
			</template>
			<template #brand>
				<slot name="brand">
					<div class="py-10 text-center text-sm text-muted">{{ t('components.templateStudio.brandComingSoon') }}</div>
				</slot>
			</template>
		</UTabs>

		<div v-if="$slots.administration" class="border-t border-default px-4 py-4 sm:px-6">
			<slot name="administration" />
		</div>
	</UCard>
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui';

withDefaults(defineProps<{
	templateName?: string;
}>(), {
	templateName: undefined,
});

const { t } = useI18n();
const activeTab = defineModel<string>('activeTab', { default: 'content' });

const tabItems = computed<TabsItem[]>(() => [
	{ label: t('components.templateStudio.content'), value: 'content', slot: 'content', icon: 'i-lucide-type' },
	{ label: t('components.templateStudio.brand'), value: 'brand', slot: 'brand', icon: 'i-lucide-palette' },
]);
</script>
