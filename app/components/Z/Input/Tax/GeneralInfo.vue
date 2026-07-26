<template>
	<div class="section-grid-basic-details">
		<UFormField v-slot="{ error }" :label="t('common.code')" name="code" :required="!isUpdate">
			<UInput
				v-model="code"
				:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
				:placeholder="t('components.zInput.codePlaceholder')"
				:disabled="isUpdate"
			/>
		</UFormField>

		<UFormField v-slot="{ error }" :label="t('common.description')" name="description" required>
			<UInput v-model="description" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.zInput.descriptionPlaceholder')" />
		</UFormField>

		<div class="grid grid-cols-2 gap-4">
			<UFormField v-slot="{ error }" :label="t('components.zInput.inclusive')" name="isInclusive" required>
				<UCheckbox v-model="isInclusive" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" />
			</UFormField>

			<UFormField v-slot="{ error }" :label="t('common.active')" name="isActive" required>
				<USwitch v-model="isActive" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" />
			</UFormField>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
const { t } = useI18n();
const props = defineProps({
	code: String,
	description: String,
	isInclusive: Boolean,
	isActive: Boolean,
	isUpdate: Boolean,
});

const emit = defineEmits(['update:code', 'update:description', 'update:isInclusive', 'update:isActive']);

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

const isInclusive = computed({
	get() {
		return props.isInclusive;
	},
	set(value) {
		emit('update:isInclusive', value);
	},
});

const isActive = computed({
	get() {
		return props.isActive;
	},
	set(value) {
		emit('update:isActive', value);
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
