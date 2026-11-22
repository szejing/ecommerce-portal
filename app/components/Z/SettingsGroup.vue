<template>
	<UCard :ui="compactOnMobile ? { body: 'max-lg:p-3' } : undefined">
		<div :class="compactOnMobile ? 'space-y-2 lg:space-y-4' : 'space-y-4'">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0 space-y-1">
					<h3 class="font-semibold text-gray-900 dark:text-white" :class="compactOnMobile ? 'text-base lg:text-lg' : 'text-lg'">{{ title }}</h3>
					<p class="text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>
				</div>
				<div class="flex shrink-0 items-center justify-center rounded-full" :class="[iconBgClass, compactOnMobile ? 'size-8 lg:size-10' : 'size-10']">
					<UIcon :name="icon" class="text-white" :class="compactOnMobile ? 'size-5 lg:size-6' : 'size-6'" />
				</div>
			</div>

			<USeparator />

			<div class="-mx-1">
				<NuxtLink
					v-for="item in items"
					:key="item.to"
					:to="item.to"
					class="group flex items-center justify-between gap-2 rounded-md px-2 py-2.5 text-sm text-gray-700 dark:text-gray-300 transition-colors cursor-pointer hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800/60 dark:hover:text-white"
					:class="{ 'min-h-11': compactOnMobile }"
				>
					<span class="min-w-0 wrap-anywhere">{{ item.label }}</span>
					<UIcon :name="ICONS.CHEVRON_RIGHT" class="shrink-0 text-lg text-gray-400 dark:text-gray-500 transition-colors group-hover:text-gray-600 group-hover:translate-x-0.5 dark:group-hover:text-gray-300" />
				</NuxtLink>
			</div>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';

const props = defineProps<{
	title: string;
	description: string;
	compactOnMobile?: boolean;
	icon: string;
	color: 'green' | 'blue' | 'pink' | 'purple' | 'teal' | 'orange' | 'red' | 'slate';
	items: { label: string; to: string }[];
}>();

const colorBgMap: Record<string, string> = {
	green: 'bg-green-400',
	blue: 'bg-blue-400',
	pink: 'bg-pink-400',
	purple: 'bg-purple-400',
	teal: 'bg-teal-400',
	orange: 'bg-orange-400',
	red: 'bg-red-400',
	slate: 'bg-slate-400',
};

const iconBgClass = computed(() => colorBgMap[props.color] ?? colorBgMap.blue);
</script>
