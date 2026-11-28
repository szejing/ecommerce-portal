<template>
	<UDashboardPanel :id="id" :grow="grow" :ui="{ body: 'min-w-0 max-lg:gap-3 max-lg:p-3' }">
		<template #header>
			<UDashboardNavbar
				:title="description ? undefined : title"
				:as="description ? { title: 'div' } : undefined"
				class="max-lg:h-14 max-lg:px-2"
				:ui="{
					right: 'gap-3',
					toggle: backTo ? 'max-lg:hidden' : 'max-lg:min-h-11 max-lg:min-w-11 max-lg:justify-center',
					title: description
						? 'flex min-w-0 flex-col items-start gap-0.5 overflow-visible font-normal whitespace-normal max-lg:overflow-hidden'
						: 'max-lg:block max-lg:text-sm',
				}"
			>
				<template v-if="description" #title>
					<h1 class="max-w-full truncate text-xl font-semibold leading-tight text-highlighted max-lg:text-sm">{{ title }}</h1>
					<p class="truncate text-sm font-normal leading-snug text-muted max-lg:sr-only">{{ description }}</p>
				</template>
				<template v-if="backTo || $slots.leading" #leading>
					<ZBackButton v-if="backTo" :fallback-to="backTo" class="min-h-11 min-w-11 shrink-0 justify-center lg:hidden" />
					<slot name="leading" />
				</template>
				<template #right>
					<div class="flex items-center gap-3 max-lg:gap-1">
						<template v-if="$slots['navbar-right']">
							<slot v-if="compactOnMobile || inlineMobileActions" name="navbar-right" />
							<UPopover v-else-if="isMobile" :content="{ align: 'end' }" :ui="{ content: 'max-w-[calc(100vw_-_1rem)]' }">
								<UButton
									color="neutral"
									variant="ghost"
									:icon="ICONS.HORIZONTAL_ELLIPSIS"
									:aria-label="t('portalMobile.actions')"
									class="min-h-11 min-w-11 justify-center"
								/>
								<template #content>
									<div class="flex flex-wrap items-center gap-2 p-3 [&_button]:min-h-11 [&_a]:min-h-11">
										<slot name="navbar-right" />
									</div>
								</template>
							</UPopover>
							<div v-else class="hidden items-center gap-3 lg:flex">
								<slot name="navbar-right" />
							</div>
						</template>

						<UPopover v-if="!isMasterSession" v-model:open="notificationPopoverOpen" :content="{ align: 'end' }">
							<UButton class="notification-btn max-lg:min-h-11 max-lg:min-w-11 max-lg:justify-center" color="secondary" variant="soft" square :aria-label="t('notifications.open')" @click="refreshNotifications">
								<UIcon :name="ICONS.BELL" class="size-5" />
								<!-- ClientOnly: unreadCount is filled by client-only 02.init-app before hydrate; SSR always has 0 -->
								<ClientOnly>
									<span v-if="notificationStore.unreadCount > 0" class="notification-count">
										{{ notificationStore.unreadCount > 99 ? '99+' : notificationStore.unreadCount }}
									</span>
								</ClientOnly>
							</UButton>

							<template #content>
								<div class="notification-panel">
									<div class="notification-header">
										<div>
											<p class="notification-kicker">{{ t('notifications.actionCenter') }}</p>
											<h3>{{ t('notifications.title') }}</h3>
										</div>
										<UButton
											color="neutral"
											variant="ghost"
											size="xs"
											:icon="ICONS.REFRESH"
											:loading="notificationStore.loading"
											@click="refreshNotifications"
										/>
									</div>

									<ZNotificationEmptyState v-if="notificationStore.activeNotifications.length === 0" compact />

									<div v-else class="notification-list">
										<template v-for="notification in notificationStore.activeNotifications" :key="notification.items[0]?.id ?? notification.type">
											<ZNotificationItemRow
												v-for="item in notification.items"
												:key="item.id"
												:item="item"
												:severity="notification.severity"
												layout="popover"
												@select="openNotification(notification.type, item)"
											/>
										</template>
									</div>

									<UButton class="notification-view-all" color="neutral" variant="ghost" size="sm" block @click="viewAllNotifications">
										{{ t('notifications.viewAll') }}
									</UButton>
								</div>
							</template>
						</UPopover>
					</div>
				</template>
			</UDashboardNavbar>
			<UDashboardToolbar v-if="!isMobile && ($slots.toolbar || backTo)" class="max-lg:hidden" :ui="toolbarFill ? { left: 'min-w-0 flex-1' } : undefined">
				<template #left>
					<div :class="toolbarFill ? 'w-full min-w-0 py-1.5' : 'py-2 space-y-2'">
						<ZBackButton v-if="backTo" :fallback-to="backTo" labeled />
						<slot name="toolbar" />
					</div>
				</template>
			</UDashboardToolbar>
		</template>
		<template #body>
			<template v-if="isMobile && $slots.toolbar && !compactOnMobile && !desktopToolbar">
				<UDrawer v-if="mobileFilterDrawer" :title="t('portalMobile.filters')" :close="{ class: 'min-h-11 min-w-11 justify-center' }">
					<UButton color="neutral" variant="outline" :icon="ICONS.FILTER" :label="t('portalMobile.filters')" class="min-h-11 self-start" />
					<template #body>
						<div class="mobile-page-toolbar pb-[env(safe-area-inset-bottom)]">
							<slot name="toolbar" />
						</div>
					</template>
				</UDrawer>
				<div v-else class="mobile-page-toolbar">
					<slot name="toolbar" />
				</div>
			</template>
			<slot />
		</template>
		<template v-if="$slots.footer" #footer>
			<div class="shrink-0 max-lg:pb-[env(safe-area-inset-bottom)] max-lg:[&_button]:min-h-11 lg:contents">
				<slot name="footer" />
			</div>
		</template>
	</UDashboardPanel>
</template>

<script lang="ts" setup>
import { useMediaQuery } from '@vueuse/core';
import { isMasterLoginId, KEY, NotificationType } from 'yeppi-common';
import type { NotificationItem } from '~/utils/types/notification';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

withDefaults(
	defineProps<{
		id: string;
		title: string;
		/** Secondary line under the navbar title. */
		description?: string;
		/** The mobile navbar shows Back. The desktop toolbar shows the labelled control. */
		backTo?: string;
		/** When true, the panel grows to fill available space. */
		grow?: boolean;
		/** Stretch the toolbar slot across the panel so filters are not stuck on the left. */
		toolbarFill?: boolean;
		/** Keep the caller’s own mobile navbar actions and toolbar layout. */
		compactOnMobile?: boolean;
		/** Keep a frequently used action such as Save or Preview beside the title. */
		inlineMobileActions?: boolean;
		/** Put a dense reporting toolbar in a bottom sheet at narrow widths. */
		mobileFilterDrawer?: boolean;
		/** The page provides its own mobile controls. */
		desktopToolbar?: boolean;
	}>(),
	{ grow: false, toolbarFill: true },
);

const desktopViewport = useMediaQuery('(min-width: 1024px)');
const mounted = ref(false);
const isMobile = computed(() => mounted.value && !desktopViewport.value);

const notificationStore = useNotificationStore();
const { openInAppNotification } = useInAppNotificationModal();
const notificationPopoverOpen = ref(false);
const isMasterSession = computed(() => isMasterLoginId(useCookie(KEY.X_MERCHANT_ID).value));

const refreshNotifications = async () => {
	await notificationStore.getNotifications();
};

const viewAllNotifications = async () => {
	notificationPopoverOpen.value = false;
	console.log('viewAllNotifications');
	await navigateTo('/notifications');
};

const openNotification = async (type: NotificationType, item: NotificationItem) => {
	if (type === NotificationType.PLATFORM_ANNOUNCEMENT) {
		notificationPopoverOpen.value = false;
		await openInAppNotification(item);
		return;
	}

	const updated = await notificationStore.openNotificationItem(type, item);

	if (!updated) {
		return;
	}

	notificationPopoverOpen.value = false;
	await navigateTo(updated.action?.url ?? item.action?.url ?? '/notifications');
};

onMounted(() => {
	mounted.value = true;
	if (!isMasterSession.value) {
		notificationStore.getNotifications();
	}
});
</script>

<style scoped>
.mobile-page-toolbar :deep(input[data-slot='base']),
.mobile-page-toolbar :deep(button[data-slot='base']) {
	min-height: 2.75rem;
}

.mobile-page-toolbar :deep(input[data-slot='base']) {
	font-size: 1rem;
}

.notification-btn {
	position: relative;
}

.notification-count {
	position: absolute;
	top: -0.35rem;
	right: -0.35rem;
	min-width: 1.25rem;
	height: 1.25rem;
	padding: 0 0.25rem;
	border-radius: 9999px;
	background: var(--color-error-500, #ef4444);
	color: white;
	font-size: 0.7rem;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 0 0 2px var(--ui-bg);
}

.notification-panel {
	width: min(24rem, calc(100vw - 2rem));
	max-height: 32rem;
	overflow-y: auto;
	padding: 1rem;
}

.notification-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: 1rem;
}

.notification-kicker {
	font-size: 0.7rem;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--ui-text-muted);
}

.notification-header h3 {
	font-size: 1rem;
	font-weight: 700;
	color: var(--ui-text-highlighted);
}

.notification-list {
	display: flex;
	flex-direction: column;
	gap: 0.35rem;
}

.notification-view-all {
	margin-top: 0.75rem;
}
</style>
