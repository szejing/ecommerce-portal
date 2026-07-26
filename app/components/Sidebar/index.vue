<template>
	<div class="sidebar" :class="showSidebar ? 'translate-x-0 ease-out' : '-translate-x-40 ease-in'">
		<div v-if="!forcedShow" class="flex items-center justify-end pt-4 px-4">
			<UIcon :name="showSidebar ? ICONS.CLOSE_ROUNDED : ICONS.CHEVRON_DOUBLE_RIGHT" class="w-5 h-5 text-secondary-100" @click="toggleSidebar" />
		</div>
		<div class="space-y-2 px-2">
			<SidebarHeader class="border-b border-secondary-400 py-6" />
			<SidebarNavigation />
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';

const appUiStore = useAppUiStore();

const { forcedShow, showSidebar } = storeToRefs(appUiStore);
const { toggleSidebar } = appUiStore;
</script>

<style scoped>
.header-container {
	padding: 2.5rem 1rem;
	border-bottom: 1px solid var(--color-secondary-400);
}

.sidebar {
	position: fixed;
	z-index: 50;
	left: 0;
	top: 0;
	bottom: 0;
	width: 15rem;
	border-right: 1px solid rgba(0, 0, 0, 0.1);
	overflow-y: auto;
	transform: translateX(0);
	transition: transform 200ms ease;
	display: none;
	background: linear-gradient(to bottom, var(--color-secondary-600), var(--color-main-600));
}

@media (min-width: 768px) {
	.sidebar {
		display: block;
	}
}
</style>
