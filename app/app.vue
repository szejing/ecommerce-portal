<template>
	<UApp :toaster="toastToaster">
		<NuxtRouteAnnouncer />
		<NuxtLayout>
			<NuxtLoadingIndicator color="repeating-linear-gradient(to right,#C2C9FF 0%,#402E7A 100%)" />
			<NuxtPage />
		</NuxtLayout>
	</UApp>
</template>

<script lang="ts" setup>
import { ZModalMessage } from '#components';
import { ICONS } from '~/utils/icons';
import { getToastProgress, toastToaster } from '~/utils/toast-appearance';

const toast = useToast();

const appUiStore = useAppUiStore();
const { toastNotification, modal } = storeToRefs(appUiStore);

const colorMode = useColorMode();

const color = computed(() => (colorMode.value === 'dark' ? '#1b1718' : 'white'));

useHead({
	meta: [
		{ charset: 'utf-8' },
		{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
		{ key: 'theme-color', name: 'theme-color', content: color },
	],
	link: [{ rel: 'icon', href: '/favicon.ico' }],
	htmlAttrs: {
		lang: 'en',
	},
});

watch(toastNotification, () => {
	if (toastNotification.value) {
		toast.add({
			id: toastNotification.value.id,
			color: toastNotification.value.color,
			title: toastNotification.value.title,
			description: toastNotification.value.description,
			icon: toastNotification.value.icon,
			duration: toastNotification.value.timeout,
			progress: getToastProgress(toastNotification.value.color),
			closeIcon: ICONS.CLOSE_ROUNDED,
		});
	}
});

watch(modal, () => {
	const m = useOverlay();
	if (modal.value) {
		m.create(ZModalMessage, {
			props: {
				notification: modal.value,
				action: 'Ok',
				onConfirm: () => {
					appUiStore.clearModal();
				},
			},
		});
	}
});
</script>

<style scoped></style>
