<template>
	<UDashboardGroup>
		<UDashboardSidebar
			id="default"
			v-model:open="showSidebar"
			collapsible
			resizable
			class="bg-elevated/25"
			:ui="{ footer: 'px-2 lg:border-t lg:border-default' }"
		>
			<template #header="{ collapsed }">
				<SidebarHeader :collapsed="collapsed" />
				<!-- <UDashboardSidebarCollapse class="hidden lg:flex" /> -->
			</template>

			<!-- Grouped Navigation Sections: render on client to avoid hydration mismatch and initial flash -->
			<template #default="{ collapsed }">
				<ClientOnly>
					<template v-for="nav in navigations" :key="`${nav.label}-${route.path}`">
						<UNavigationMenu
							:collapsed="collapsed"
							:items="navItemsWithOpen(nav.links)"
							orientation="vertical"
							type="multiple"
							:ui="{
								content: 'overflow-hidden data-[state=open]:animate-nav-accordion-down data-[state=closed]:animate-nav-accordion-up',
							}"
						>
							<template #item-label="{ item }">
								<ULink v-if="item.to" :to="item.to" class="block size-full" @click="(e: MouseEvent) => onNavItemLabelClick(e, item)">
									{{ t(String(item?.label ?? '')) }}
								</ULink>
								<template v-else>
									{{ t(String(item?.label ?? '')) }}
								</template>
							</template>
						</UNavigationMenu>
					</template>
					<template #fallback>
						<div class="min-h-[200px] space-y-2 px-2 py-2" aria-hidden="true">
							<template v-for="i in 8" :key="i">
								<div class="flex items-center gap-3 rounded-md px-2 py-2.5">
									<USkeleton class="h-5 w-5 shrink-0 rounded" />
									<USkeleton class="h-4 flex-1 max-w-[140px]" />
								</div>
							</template>
						</div>
					</template>
				</ClientOnly>
			</template>

			<template #footer="{ collapsed }">
				<ZUserMenu :collapsed="collapsed" />
			</template>
		</UDashboardSidebar>
		<div class="flex flex-1 flex-col min-w-0">
			<div
				v-if="isStoreHidden"
				class="flex w-full shrink-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 bg-red-600 px-4 py-2.5 text-center text-sm font-medium text-white"
				role="status"
			>
				<span>{{ t('pages.storeProfilePage.storeDisabledBanner') }}</span>
				<button
					type="button"
					class="underline underline-offset-2 font-semibold hover:text-white/90 disabled:opacity-70"
					:disabled="merchantInfoStore.updating"
					@click="onEnableStore"
				>
					{{ t('pages.storeProfilePage.enableStoreNow') }}
				</button>
			</div>
			<slot />
		</div>
	</UDashboardGroup>
</template>

<script lang="ts" setup>
const { t } = useI18n();
const route = useRoute();
const appUiStore = useAppUiStore();
const merchantInfoStore = useMerchantInfoStore();
const { navigations, showSidebar } = storeToRefs(appUiStore);
const { isStoreHidden } = storeToRefs(merchantInfoStore);

const onEnableStore = async () => {
	try {
		await merchantInfoStore.setHideStore(false);
	} catch {
		// notification handled in store
	}
};

const pathMatchesLink = (path: string, link: { to?: string; children?: unknown[] }): boolean => {
	if (!link.to || typeof link.to !== 'string') return false;
	const to = link.to === '/' ? '/' : link.to.replace(/\/$/, '');
	return path === to || (to !== '/' && path.startsWith(to + '/'));
};

const navItemsWithOpen = (links: Array<Record<string, unknown>>): Array<Record<string, unknown>> => {
	const path = route.path;
	return links.map((link) => ({
		...link,
		defaultOpen: !!(Array.isArray(link.children) && link.children.length && pathMatchesLink(path, link as { to?: string; children?: unknown[] })),
	}));
};

const onNavItemLabelClick = (e: MouseEvent, item: Record<string, unknown>) => {
	if (Array.isArray(item.children) && item.children.length) {
		e.stopPropagation();
	}
};
</script>
