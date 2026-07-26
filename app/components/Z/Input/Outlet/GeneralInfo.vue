<template>
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
		<UFormField v-slot="{ error }" :label="t('common.code')" name="code" :required="!isUpdate">
			<p v-if="!isUpdate" class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.outletForm.generalCodeHintCreate') }}</p>
			<p v-else class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.outletForm.generalCodeHintUpdate') }}</p>
			<UInput
				v-model="code"
				:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
				:placeholder="t('components.zInput.codePlaceholder')"
				:disabled="isUpdate"
			/>
		</UFormField>

		<UFormField v-slot="{ error }" :label="t('common.description')" name="description" class="lg:col-span-2" required>
			<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.outletForm.generalDescriptionHint') }}</p>
			<UInput v-model="description" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.zInput.descriptionPlaceholder')" />
		</UFormField>

		<UFormField :label="t('common.phoneNo')" name="dial_code" :class="['col-span-2', isUpdate ? 'lg:col-span-3' : 'lg:col-span-2']" required>
			<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.outletForm.generalPhoneHint') }}</p>
			<UFormField name="phone_no" required>
				<div>
					<ZPhoneInput
						:dial-code="dialCode"
						:phone-no="phoneNo"
						@update:dial-code="(v: string) => emit('update:dialCode', v)"
						@update:phone-no="(v: string) => emit('update:phoneNo', v)"
					/>
				</div>
			</UFormField>
		</UFormField>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
const { t } = useI18n();
const props = defineProps({
	code: String,
	description: String,
	dialCode: String,
	phoneNo: String,
	isUpdate: Boolean,
});

const emit = defineEmits(['update:code', 'update:description', 'update:dialCode', 'update:phoneNo']);

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
