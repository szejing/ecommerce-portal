<template>
	<UModal
		:ui="{
			content: 'w-full sm:max-w-[60%] md:max-w-[40%] lg:max-w-[30%]',
		}"
	>
		<template #body>
			<div class="space-y-2">
				<h3>{{ title ?? t('components.zModal.confirmationTitle') }}</h3>
				<p>{{ message ?? t('components.zModal.confirmationMessage') }}</p>
			</div>
		</template>

		<template #footer>
			<div class="flex-jend gap-4">
				<UButton @click="onConfirm">{{ t('common.ok') }}</UButton>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
const { t } = useI18n();
defineProps({
	title: {
		type: String,
		default: undefined,
	},
	message: {
		type: String,
		default: undefined,
	},
	action: {
		type: String,
		default: 'confirm',
	},
});

const emit = defineEmits(['confirm', 'cancel']);

const onConfirm = () => {
	emit('confirm');
};
</script>

<style scoped></style>
