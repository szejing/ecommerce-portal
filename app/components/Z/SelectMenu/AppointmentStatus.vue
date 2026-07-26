<template>
	<USelectMenu
		v-model="status"
		:items="items"
		value-key="value"
		size="md"
		:ui="{ base: 'min-w-[150px]' }"
		:search-input="{
			placeholder: 'Search appointment status…',
			icon: 'i-lucide-search',
		}"
	>
		<template #default>
			<span v-if="status">
				<UBadge :color="getAppointmentStatusColor(status)" variant="subtle" class="truncate">
					{{ selectedLabel }}
				</UBadge>
			</span>
			<span v-else class="text-neutral-400">{{ t('components.selectMenu.selectAppointmentStatus') }}</span>
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
import { getAppointmentStatusOptions, getAppointmentStatusColor } from '~/utils/options';

const { t } = useI18n();

const props = defineProps<{ status: AppointmentStatus | undefined }>();
const emit = defineEmits(['update:status']);

const items = computed(() => getAppointmentStatusOptions(t));

const status = computed({
	get() {
		return props.status;
	},
	set(value) {
		emit('update:status', value);
	},
});

const selectedLabel = computed(() => items.value.find((i) => i.value === status.value)?.label ?? status.value ?? '');
</script>

<style scoped></style>
