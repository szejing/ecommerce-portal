<template>
	<UModal
		:ui="{
			content: 'w-full sm:max-w-[60%] md:max-w-[40%] lg:max-w-[30%]',
		}"
	>
		<template #header>
			<h3
				class="text-lg font-bold"
				:class="{
					'text-error': titleVariant === 'danger',
				}"
			>
				{{ title ?? t('modal.confirmationTitle') }}
			</h3>
		</template>

		<template #body>
			<p>{{ message ?? t('modal.confirmationMessage') }}</p>
		</template>

		<template #footer>
			<div v-if="action == 'delete'" class="flex justify-between gap-4 w-full">
				<UButton color="neutral" variant="outline" @click="onCancel">{{ t('common.cancel') }}</UButton>
				<UButton color="error" variant="ghost" class="opacity-50 hover:opacity-100" :loading="loading" @click="onConfirm">{{ t('modal.confirm') }}</UButton>
			</div>

			<div v-else class="flex justify-between gap-4 w-full">
				<UButton color="neutral" variant="outline" @click="onCancel">{{ t('common.cancel') }}</UButton>
				<UButton color="success" :loading="loading" @click="onConfirm">{{ t('modal.confirm') }}</UButton>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
const { t } = useI18n();

const props = defineProps({
	title: { type: String, default: undefined },
	message: { type: String, default: undefined },
	titleVariant: {
		type: String as () => 'default' | 'danger',
		default: 'default',
	},
	action: {
		type: String,
		default: 'confirm',
	},
	onConfirm: { type: Function, default: undefined },
	onCancel: { type: Function, default: undefined },
});

const loading = ref(false);
// const emit = defineEmits(['confirm', 'cancel']);

const onConfirm = async () => {
	if (loading.value) return;
	loading.value = true;
	// emit('confirm');
	await props.onConfirm?.();
};

const onCancel = () => {
	// emit('cancel');
	props.onCancel?.();
};
</script>

<style scoped></style>
