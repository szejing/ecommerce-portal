<template>
	<div class="section-grid-basic-details">
		<UFormField v-slot="{ error }" :label="t('common.name')" name="name" required>
			<UInput v-model="name" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('common.name')" />
		</UFormField>

		<UFormField :label="t('common.values')" name="values" required>
			<UInputTags v-model="values" :placeholder="t('components.zInput.enterValues')" class="w-full" color="primary" :duplicate="false" :add-on-blur="true" />
		</UFormField>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
const { t } = useI18n();
const props = defineProps({
	name: String,
	values: {
		type: Array as PropType<string[]>,
	},
});

const emit = defineEmits(['update:name', 'update:values']);

const name = computed({
	get() {
		return props.name;
	},
	set(value) {
		emit('update:name', value);
	},
});

const values = computed({
	get() {
		return props.values ?? [];
	},
	set(value) {
		emit('update:values', value);
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
