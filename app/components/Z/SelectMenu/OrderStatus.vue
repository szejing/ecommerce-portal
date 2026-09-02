<template>
	<USelectMenu
		v-model="status"
		:items="items"
		value-key="value"
		:size="appearance === 'pill' ? 'sm' : 'md'"
		:variant="appearance === 'pill' ? 'none' : undefined"
		:trailing-icon="appearance === 'pill' ? '' : undefined"
		:disabled="disabled"
		:placeholder="t('components.selectMenu.selectOrderStatus')"
		:aria-label="t('components.orderDetail.changeOrderStatus')"
		:search-input="{
			placeholder: 'Search order status…',
			icon: 'i-lucide-search',
		}"
		:ui="selectUi"
		:class="{ 'status-select-pill': appearance === 'pill' }"
	>
		<template #default>
			<span v-if="status" :class="appearance === 'pill' ? 'status-select-pill-label' : undefined">
				<UBadge v-if="appearance !== 'pill'" :color="getOrderStatusColor(status)" variant="subtle" class="truncate">
					{{ selectedLabel }}
				</UBadge>
				<template v-else>{{ selectedLabel }}</template>
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
import type { OrderStatus } from 'yeppi-common';
import { getOrderStatusUpdateOptions, getOrderStatusColor } from '~/utils/options';

const { t } = useI18n();

const props = withDefaults(
	defineProps<{
		status: OrderStatus | undefined;
		disabled?: boolean;
		appearance?: 'default' | 'pill';
	}>(),
	{
		disabled: false,
		appearance: 'default',
	},
);
const emit = defineEmits(['update:status']);

const items = computed(() => getOrderStatusUpdateOptions(t));
const status = computed({
	get() {
		return props.status;
	},
	set(value) {
		emit('update:status', value);
	},
});

const selectedLabel = computed(() => items.value.find((i) => i.value === status.value)?.label ?? status.value);

const selectUi = computed(() => {
	if (props.appearance !== 'pill') {
		return undefined;
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
