<template>
	<UDashboardPanel :id="id" :grow="grow">
		<template #header>
			<UDashboardNavbar
				:title="description ? undefined : title"
				:as="description ? { title: 'div' } : undefined"
				:ui="{
					right: 'gap-3',
					title: description ? 'flex min-w-0 flex-col items-start gap-0.5 overflow-visible font-normal whitespace-normal' : undefined,
				}"
			>
				<template v-if="description" #title>
					<h1 class="truncate text-xl font-semibold leading-tight text-highlighted">{{ title }}</h1>
					<p class="truncate text-sm font-normal leading-snug text-muted">{{ description }}</p>
				</template>
				<template v-if="$slots.leading" #leading>
					<slot name="leading" />
				</template>
				<template #right>
					<div class="page-panel-actions">
						<slot v-if="$slots['navbar-right']" name="navbar-right" />

						<UPopover v-if="!isMasterSession" v-model:open="notificationPopoverOpen" :content="{ align: 'end' }">
							<UButton class="notification-btn" color="secondary" variant="soft" square :aria-label="t('notifications.open')" @click="refreshNotifications">
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
			<UDashboardToolbar v-if="$slots.toolbar || backTo" :ui="toolbarFill ? { left: 'min-w-0 flex-1' } : undefined">
				<template #left>
					<div :class="toolbarFill ? 'w-full min-w-0 py-1.5' : 'py-2 space-y-2'">
						<ZBackButton v-if="backTo" :fallback-to="backTo" labeled />
						<slot name="toolbar" />
					</div>
				</template>
			</UDashboardToolbar>
		</template>
		<template #body>
			<slot />
		</template>
		<template v-if="$slots.footer" #footer>
			<slot name="footer" />
		</template>
	</UDashboardPanel>
</template>

<script lang="ts" setup>
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
		/** When provided, ZBackButton is shown in the toolbar (avoids conflict with navbar burger on mobile). */
		backTo?: string;
		/** When true, the panel grows to fill available space. */
		grow?: boolean;
		/** Stretch the toolbar slot across the panel so filters are not stuck on the left. */
		toolbarFill?: boolean;
	}>(),
	{ grow: false, toolbarFill: true },
);

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
	if (!isMasterSession.value) {
		notificationStore.getNotifications();
	}
});
</script>

<style scoped>
.page-panel-actions {
	display: flex;
	align-items: center;
	gap: 0.75rem;
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
