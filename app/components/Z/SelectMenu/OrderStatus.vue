<template>
	<USelectMenu
		v-model="status"
		:items="items"
		value-key="value"
		size="md"
		:placeholder="t('components.selectMenu.selectOrderStatus')"
		:search-input="{
			placeholder: 'Search order status…',
			icon: 'i-lucide-search',
		}"
	>
		<template #default>
			<span v-if="status">
				<UBadge :color="getOrderStatusColor(status)" variant="subtle" class="truncate">
					{{ selectedLabel }}
				</UBadge>
			</span>
			<span v-else class="text-neutral-400">{{ t('components.selectMenu.selectOrderStatus') }}</span>
		</template>

		<template #item="{ item }">
			<UBadge :color="getOrderStatusColor(item.value)" variant="subtle" class="truncate">
				{{ item.label }}
			</UBadge>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import { OrderStatus } from 'yeppi-common';
import { getOrderStatusOptions, getOrderStatusColor } from '~/utils/options';

const { t } = useI18n();

const props = defineProps<{ status: OrderStatus | undefined }>();
const emit = defineEmits(['update:status']);

const items = computed(() => getOrderStatusOptions(t).filter((o) => o.value !== OrderStatus.REQUIRES_ACTION && o.value !== OrderStatus.REFUNDED));
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

const selectedLabel = computed(() => items.value.find((i) => i.value === status.value)?.label ?? status.value);
</script>

<style scoped></style>
