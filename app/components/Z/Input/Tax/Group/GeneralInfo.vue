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

		<UFormField :label="t('components.zInput.taxes')" name="taxes">
			<ZSelectMenuTaxes v-model:taxes="taxes" />
		</UFormField>
	</div>
</template>

<script lang="ts" setup>
import type { Tax, TaxInput } from '~/utils/types/tax';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const props = defineProps({
	code: String,
	description: String,
	taxes: Array as PropType<Tax[] | TaxInput[] | undefined>,
	isUpdate: Boolean,
});

const emit = defineEmits(['update:code', 'update:description', 'update:taxes']);

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

const taxes = computed({
	get() {
		return props.taxes ?? [];
	},
	set(value) {
		emit('update:taxes', value);
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
