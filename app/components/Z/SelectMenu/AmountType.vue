<template>
	<USelectMenu v-model="amountType" :items="items" value-key="value" size="md" :ui="{ base: 'min-w-[200px]' }">
		<template #default>
			<span v-if="amountType">{{ selectedLabel }}</span>
			<span v-else class="text-neutral-400">{{ t('components.selectMenu.selectAmountType') }}</span>
		</template>

		<template #item="{ item }">
			<span class="truncate">{{ item.label }}</span>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import type { AmountType } from 'yeppi-common';
import { getAmountTypeOptions } from '~/utils/options';

const { t } = useI18n();

const props = defineProps<{ amountType: AmountType | undefined }>();
const emit = defineEmits(['update:amountType']);

const items = computed(() => getAmountTypeOptions(t));

const amountType = computed({
	get() {
		return props.amountType;
	},
	set(value) {
		emit('update:amountType', value);
	},
});

const selectedLabel = computed(() => items.value.find((i) => i.value === amountType.value)?.label ?? amountType.value ?? '');
</script>

<style scoped></style>
