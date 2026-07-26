<template>
	<div>
		<UFormField v-slot="{ error }" :label="t('common.code')" name="code" :required="!isUpdate">
			<UInput
				v-model="code"
				:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
				:placeholder="t('components.zInput.codePlaceholder')"
				:disabled="isUpdate"
			/>
		</UFormField>

		<UFormField v-slot="{ error }" :label="t('common.description')" name="description" required class="mt-4">
			<UInput v-model="description" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.zInput.descriptionPlaceholder')" />
		</UFormField>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
const { t } = useI18n();
const props = defineProps({
	code: String,
	description: String,
	isUpdate: Boolean,
});

const emit = defineEmits(['update:code', 'update:description']);

const code = computed({
	get() {
		return props.code;
	},
	set(value) {
		emit('update:code', value?.toUpperCase());
	},
});

const description = computed({
	get() {
		return props.description;
	},
	set(value) {
		emit('update:description', value);
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
