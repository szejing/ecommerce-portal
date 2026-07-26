<template>
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
		<UFormField v-slot="{ error }" :label="t('common.code')" name="code" required>
			<UInput v-model="code" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.zInput.brandCodePlaceholder')" />
		</UFormField>

		<UFormField v-slot="{ error }" :label="t('common.description')" name="description" required>
			<UInput
				v-model="description"
				:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
				:placeholder="t('components.zInput.brandDescriptionPlaceholder')"
			/>
		</UFormField>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
const { t } = useI18n();
const props = defineProps({
	code: String,
	description: String,
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

<style scoped></style>
