<template>
	<div class="section-grid-basic-details">
		<UFormField v-slot="{ error }" :label="t('table.value')" name="value" required>
			<UInput v-model="value" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.zInput.tagNamePlaceholder')" />
		</UFormField>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
const { t } = useI18n();
const props = defineProps({
	value: String,
});

const emit = defineEmits(['update:value']);

const value = computed({
	get() {
		return props.value;
	},
	set(value) {
		emit('update:value', value);
	},
});
</script>

<style scoped>
.section-grid-basic-details {
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	gap: 0.75rem;
}
</style>
