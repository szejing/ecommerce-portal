<template>
	<USelectMenu
		v-model="status"
		:items="items"
		value-key="value"
		:size="appearance === 'pill' ? 'sm' : 'md'"
		:variant="appearance === 'pill' ? 'none' : undefined"
		:trailing-icon="appearance === 'pill' ? '' : undefined"
		:disabled="disabled"
		:placeholder="t('components.selectMenu.selectAppointmentStatus')"
		:aria-label="t('components.zModal.changeAppointmentStatus')"
		:search-input="{
			placeholder: t('components.selectMenu.searchAppointmentStatus'),
			icon: 'i-lucide-search',
		}"
		:ui="selectUi"
		:class="{ 'status-select-pill': appearance === 'pill' }"
	>
		<template #default>
			<span v-if="status" :class="appearance === 'pill' ? 'status-select-pill-label' : undefined">
				<UBadge v-if="appearance !== 'pill'" :color="getAppointmentStatusColor(status)" variant="subtle" class="truncate">
					{{ selectedLabel }}
				</UBadge>
				<template v-else>{{ selectedLabel }}</template>
			</span>
			<span v-else class="text-muted">{{ t('components.selectMenu.selectAppointmentStatus') }}</span>
		</template>

		<template #item="{ item }">
			<UBadge :color="getAppointmentStatusColor(item.value)" variant="subtle" class="truncate">
				{{ item.label }}
			</UBadge>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import type { AppointmentStatus } from 'yeppi-common';
import { getAppointmentStatusColor, getAppointmentStatusLabel, getAppointmentStatusUpdateOptions } from '~/utils/options';

const { t } = useI18n();

const props = withDefaults(
	defineProps<{
		status: AppointmentStatus | undefined;
		disabled?: boolean;
		appearance?: 'default' | 'pill';
		includeNoShow?: boolean;
	}>(),
	{
		disabled: false,
		appearance: 'default',
		includeNoShow: false,
	},
);
const emit = defineEmits(['update:status']);

const items = computed(() => {
	const options = getAppointmentStatusUpdateOptions(t, { includeNoShow: props.includeNoShow });
	if (props.status && !options.some((item) => item.value === props.status)) {
		return [...options, { value: props.status, label: getAppointmentStatusLabel(t, props.status) }];
	}
	return options;
});

const status = computed({
	get() {
		return props.status;
	},
	set(value) {
		emit('update:status', value);
	},
});

const selectedLabel = computed(() => items.value.find((item) => item.value === status.value)?.label ?? getAppointmentStatusLabel(t, status.value));

const selectUi = computed(() => {
	if (props.appearance !== 'pill') {
		return { base: 'min-w-[150px]' };
	}

	return {
		base: '!min-w-0 w-auto max-w-full px-2.5 py-1 rounded-none bg-transparent text-inverted hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-0 cursor-pointer',
		trailing: 'hidden',
		trailingIcon: 'hidden',
		value: 'truncate text-xs font-semibold uppercase tracking-wide text-inverted',
		content: 'min-w-48',
	};
});
</script>

<style scoped>
.status-select-pill {
	min-width: 0;
	width: auto;
}

.status-select-pill-label {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 0.6875rem;
	font-weight: 600;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: inherit;
}
</style>
