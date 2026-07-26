<template>
	<USelectMenu
		v-model="status"
		:items="items"
		value-key="value"
		size="md"
		:placeholder="t('components.selectMenu.selectProductStatus')"
		:search-input="{
			placeholder: 'Search product status…',
			icon: 'i-lucide-search',
		}"
	>
		<template #default>
			<span v-if="status">
				<UBadge :color="getProductStatusColor(status)" variant="subtle" class="truncate">
					{{ selectedLabel }}
				</UBadge>
			</span>
			<span v-else class="text-neutral-400">{{ t('components.selectMenu.selectStatus') }}</span>
		</template>

		<template #item="{ item }">
			<UBadge :color="getProductStatusColor(item.value)" variant="subtle" class="truncate">
				{{ item.label }}
			</UBadge>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import type { ProductStatus } from 'yeppi-common';
import { getProductStatusOptions, getProductStatusColor } from '~/utils/options';

const { t } = useI18n();

const props = defineProps<{ status: ProductStatus | undefined }>();
const emit = defineEmits(['update:status']);

const items = computed(() => getProductStatusOptions(t));

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
