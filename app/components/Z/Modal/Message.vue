<template>
	<UModal
		:ui="{
			content: 'w-full sm:w-[50%] md:w-[30%]',
			body: `border-t-4 ${notification?.color == 'error' ? 'border-t-red-600' : 'border-t-primary-500'}`,
		}"
	>
		<template #body>
			<div class="space-y-2">
				<h3 class="text-lg text-center" :class="notification?.color == 'error' ? 'text-red-600' : 'text-primary-500'">{{ notification?.title }}</h3>
				<p class="text-neutral-800">{{ notification?.description }}</p>
			</div>
		</template>

		<template #footer>
			<div class="mx-auto w-[50%] sm:w-[25%]">
				<UButton variant="soft" block color="neutral" @click="onConfirm">{{ action || t('modal.ok') }}</UButton>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { ToastNotification } from '~/utils/types/event-notification';

const { t } = useI18n();

defineProps({
	notification: {
		type: Object as PropType<ToastNotification>,
		default: undefined,
	},
	action: {
		type: String,
		default: undefined,
	},
});

const emit = defineEmits(['confirm', 'cancel']);

const onConfirm = () => {
	emit('confirm');
};
</script>

<style scoped></style>
