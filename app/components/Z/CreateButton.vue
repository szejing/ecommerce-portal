<template>
	<div class="flex items-center gap-3">
		<UButton :color="color" :variant="variant" @click="handleClick">
			<UIcon :name="icon ?? ICONS.ADD_OUTLINE" class="w-4 h-4" />
			{{ label }}
		</UButton>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const props = withDefaults(
	defineProps<{
		/** Route to navigate to when clicked. If not set, only @click is emitted. */
		to?: string;
		/** Button label (e.g. "Add Product", "Add Category"). Defaults to translated "Create". */
		label?: string;
		/** Replaces the default plus icon. */
		icon?: string;
		color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral';
		variant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link';
	}>(),
	{
		color: 'success',
		variant: 'solid',
	},
);

const emit = defineEmits<{ click: [] }>();

const label = computed(() => props.label ?? t('common.create'));

function handleClick() {
	emit('click');
	if (props.to) {
		navigateTo(props.to);
	}
}
</script>
