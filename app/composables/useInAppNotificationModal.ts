import { NotificationType } from 'yeppi-common';
import { ZModalNotificationInAppMessage } from '#components';
import type { NotificationItem } from '~/utils/types/notification';

export function useInAppNotificationModal() {
	const overlay = useOverlay();
	const notificationStore = useNotificationStore();
	const rowSelectLocked = ref(false);

	const openInAppNotification = async (item: NotificationItem) => {
		if (rowSelectLocked.value) {
			return;
		}

		rowSelectLocked.value = true;

		try {
			if (!item.read_at) {
				await notificationStore.openNotificationItem(NotificationType.PLATFORM_ANNOUNCEMENT, item);
			}

			const modal = overlay.create(ZModalNotificationInAppMessage, {
				destroyOnClose: true,
			});
			const instance = modal.open({ item });
			await instance.result;
		} finally {
			setTimeout(() => {
				rowSelectLocked.value = false;
			}, 300);
		}
	};

	return {
		openInAppNotification,
		rowSelectLocked,
	};
}
