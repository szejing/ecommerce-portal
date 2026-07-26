<template>
	<USelectMenu
		v-model="status"
		:items="items"
		value-key="value"
		size="md"
		:placeholder="t('components.selectMenu.selectPaymentStatus')"
		:search-input="{
			placeholder: 'Search payment status…',
			icon: 'i-lucide-search',
		}"
	>
		<template #default>
			<span v-if="status">
				<UBadge :color="getPaymentStatusColor(status)" variant="subtle" class="truncate">
					{{ selectedLabel }}
				</UBadge>
			</span>
			<span v-else class="text-neutral-400">{{ t('components.selectMenu.selectPaymentStatus') }}</span>
		</template>

		<template #item="{ item }">
			<UBadge :color="getPaymentStatusColor(item.value)" variant="subtle" class="truncate">
				{{ item.label }}
			</UBadge>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import type { PaymentStatus } from 'yeppi-common';
import { getPaymentStatusOptions, getPaymentStatusColor } from '~/utils/options';

const { t } = useI18n();

const props = defineProps<{ paymentStatus: PaymentStatus | undefined }>();
const emit = defineEmits(['update:paymentStatus']);

const items = computed(() => getPaymentStatusOptions(t));

const status = computed({
	get() {
		return props.paymentStatus;
	},
	set(value) {
		emit('update:paymentStatus', value);
	},
});

const selectedLabel = computed(() => items.value.find((i) => i.value === status.value)?.label ?? status.value ?? '');
</script>

<style scoped></style>
