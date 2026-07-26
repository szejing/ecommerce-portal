<template>
	<USelectMenu v-model="status" :items="items" value-key="value" size="md" :placeholder="t('components.selectMenu.selectOrderItemStatus')">
		<template #default>
			<span v-if="status">
				<UBadge :color="getOrderItemStatusColor(status)" variant="subtle" class="truncate">
					{{ selectedLabel }}
				</UBadge>
			</span>
			<span v-else class="text-neutral-400">{{ t('components.selectMenu.selectOrderItemStatus') }}</span>
		</template>

		<template #item="{ item }">
			<UBadge :color="getOrderItemStatusColor(item.value)" variant="subtle" class="truncate">
				{{ item.label }}
			</UBadge>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import type { OrderItemStatus } from 'yeppi-common';
import { getOrderItemStatusOptions, getOrderItemStatusColor } from '~/utils/options';

const { t } = useI18n();

const props = defineProps<{ status: OrderItemStatus | undefined }>();
const emit = defineEmits(['update:status']);

const items = computed(() => getOrderItemStatusOptions(t));

const status = computed({
	get() {
		return props.status ?? 'All';
	},
	set(value) {
		if (value === 'All') {
			emit('update:status', undefined);
		} else {
			emit('update:status', value);
		}
	},
});

const selectedLabel = computed(() => items.value.find((i) => i.value === status.value)?.label ?? status.value ?? '');
</script>

<style scoped></style>
