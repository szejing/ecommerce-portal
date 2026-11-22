<template>
	<UInput
		v-model="query"
		inputmode="search"
		:aria-label="placeholder"
		:placeholder="placeholder"
		:icon="ICONS.SEARCH_ROUNDED"
		:ui="{ trailing: 'max-lg:pe-0', base: query ? 'max-lg:pe-11' : '' }"
		@keydown.enter="emit('search')"
		@update:model-value="emit('input')"
	>
		<template v-if="query" #trailing>
			<UButton
				color="neutral"
				variant="ghost"
				icon="i-lucide-x"
				:aria-label="t('components.filter.clear')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
				@click="emit('clear')"
			/>
		</template>
	</UInput>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';

defineProps<{ placeholder: string }>();
const query = defineModel<string>();
const emit = defineEmits<{ input: []; search: []; clear: [] }>();
const { t } = useI18n();
</script>
