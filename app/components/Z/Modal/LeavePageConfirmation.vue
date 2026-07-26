<template>
	<UModal
		:ui="{
			content: 'w-full sm:max-w-[60%] md:max-w-[40%] lg:max-w-[30%]',
		}"
	>
		<template #header>
			<h3 class="text-lg font-bold">{{ title ?? t('modal.leavePage') }}</h3>
		</template>

		<template #body>
			<p>{{ message ?? t('modal.leavePageMessage') }}</p>
		</template>

		<template #footer>
			<div class="flex justify-between gap-4 w-full">
				<UButton color="primary" variant="outline" @click="onStay">{{ t('modal.stay') }}</UButton>
				<UButton color="neutral" variant="outline" @click="onLeave">{{ t('modal.leave') }}</UButton>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
const { t } = useI18n();

const props = withDefaults(
	defineProps<{
		title?: string;
		message?: string;
		onStay?: () => void;
		onLeave?: () => void;
	}>(),
	{
		title: undefined,
		message: undefined,
	},
);

// const emit = defineEmits<{ stay: []; leave: [] }>();

const onStay = () => {
	props.onStay?.();
	// emit('stay');
};

const onLeave = () => {
	props.onLeave?.();
	// emit('leave');
};
</script>
