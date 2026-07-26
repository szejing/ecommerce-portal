<template>
	<USelectMenu
		v-model="duration"
		:items="items"
		value-key="label"
		size="md"
		class="min-w-0 w-full"
		:placeholder="t('components.selectMenu.selectDuration')"
	>
		<template #default>
			<span v-if="duration" class="truncate">{{ duration }}</span>
			<span v-else class="text-muted">{{ t('components.selectMenu.selectDuration') }}</span>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
const { t } = useI18n();
const duration_options = ['30m', '1h', '1h30m', '2h', '2h30m', '3h', '3h30m'];

const items = computed(() => duration_options.map((d) => ({ label: d })));

const props = defineProps<{ duration: string | null }>();

const emit = defineEmits(['update:duration']);

const duration = computed({
	get() {
		return props.duration ?? '';
	},
	set(val) {
		emit('update:duration', val);
	},
});
</script>
