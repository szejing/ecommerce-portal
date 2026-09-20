<template>
	<div class="flex gap-2">
		<USelectMenu
			:model-value="dialCode"
			:items="dialCodeOptions"
			value-key="value"
			:filter-fields="['country', 'value']"
			class="w-24 shrink-0"
			:search-input="{
				placeholder: 'Search...',
				icon: 'i-lucide-search',
			}"
			@update:model-value="(v: string | undefined) => emit('update:dialCode', v ?? '')"
		>
			<template #default="{ modelValue }">
				<span class="text-sm">{{ dialCodeOptions.find((d) => d.value === modelValue)?.flag ?? '' }}</span>
				<span v-if="modelValue" class="text-sm">+{{ modelValue }}</span>
			</template>

			<template #item="{ item }">
				<div class="flex items-center gap-2">
					<span class="text-sm">{{ item.flag }}</span>
					<span class="text-sm">{{ item.country }} (+{{ item.value }})</span>
				</div>
			</template>
		</USelectMenu>
		<UInput :model-value="phoneNo" :placeholder="placeholder" class="min-w-0 flex-1" @update:model-value="(v: string) => emit('update:phoneNo', v)" />
	</div>
</template>

<script lang="ts" setup>
import { DIAL_CODES } from '~/utils/data/dial-codes';

defineProps<{
	dialCode?: string | undefined;
	phoneNo?: string | undefined;
	placeholder?: string;
}>();

const emit = defineEmits<{
	'update:dialCode': [value: string];
	'update:phoneNo': [value: string];
}>();

const dialCodeOptions = DIAL_CODES;
</script>
