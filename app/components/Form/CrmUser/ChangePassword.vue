<template>
	<UForm ref="formRef" :schema="schema" :state="state" class="space-y-4 max-w-md" @submit="onSubmit" @error="onError">
		<UFormField v-if="requireCurrentPassword" :label="t('components.changePassword.currentPassword')" name="old_password" required>
			<UInput
				id="old_password"
				v-model="state.old_password"
				:type="state.show_old ? 'text' : 'password'"
				:placeholder="t('components.changePassword.currentPassword')"
				:ui="{ trailing: 'pe-1' }"
			>
				<template v-if="state.old_password?.length" #trailing>
					<UButton
						color="neutral"
						variant="link"
						size="sm"
						:icon="state.show_old ? 'i-lucide-eye-off' : 'i-lucide-eye'"
						:aria-label="state.show_old ? t('common.hidePassword') : t('common.showPassword')"
						:aria-pressed="state.show_old"
						aria-controls="old_password"
						@click="state.show_old = !state.show_old"
					/>
				</template>
			</UInput>
		</UFormField>
		<div class="space-y-2">
			<UFormField :label="t('components.changePassword.newPassword')" name="new_password" required>
				<UInput
					id="new_password"
					v-model="state.new_password"
					:placeholder="t('components.changePassword.newPassword')"
					:color="passwordStrengthColor"
					:type="state.show_new ? 'text' : 'password'"
					:aria-invalid="passwordStrengthScore < 4"
					aria-describedby="new-password-strength"
					:ui="{ trailing: 'pe-1' }"
				>
					<template #trailing>
						<UButton
							color="neutral"
							variant="link"
							size="sm"
							:icon="state.show_new ? 'i-lucide-eye-off' : 'i-lucide-eye'"
							:aria-label="state.show_new ? t('common.hidePassword') : t('common.showPassword')"
							:aria-pressed="state.show_new"
							aria-controls="new_password"
							@click="state.show_new = !state.show_new"
						/>
					</template>
				</UInput>
			</UFormField>
			<UProgress :color="passwordStrengthColor" :indicator="passwordStrengthText" :model-value="passwordStrengthScore" :max="4" size="sm" />
			<p id="new-password-strength" class="text-sm font-medium">{{ passwordStrengthText }}. {{ t('auth.mustContain') }}</p>
			<ul class="space-y-1" :aria-label="t('components.changePassword.passwordRequirementsAria')">
				<li v-for="(req, index) in passwordStrength" :key="index" class="flex items-center gap-0.5" :class="req.met ? 'text-success' : 'text-muted'">
					<UIcon :name="req.met ? 'i-lucide-circle-check' : 'i-lucide-circle-x'" class="size-4 shrink-0" />
					<span class="text-xs font-light">
						{{ req.text }}
						<span class="sr-only">{{ req.met ? t('components.changePassword.requirementMet') : t('components.changePassword.requirementNotMet') }}</span>
					</span>
				</li>
			</ul>
		</div>
		<UFormField :label="t('components.changePassword.confirmNewPassword')" name="confirm_password" required>
			<UInput
				id="confirm_password"
				v-model="state.confirm_password"
				:type="state.show_confirm ? 'text' : 'password'"
				:placeholder="t('components.changePassword.confirmNewPassword')"
				:ui="{ trailing: 'pe-1' }"
			>
				<template v-if="state.confirm_password?.length" #trailing>
					<UButton
						color="neutral"
						variant="link"
						size="sm"
						:icon="state.show_confirm ? 'i-lucide-eye-off' : 'i-lucide-eye'"
						:aria-label="state.show_confirm ? t('common.hidePassword') : t('common.showPassword')"
						:aria-pressed="state.show_confirm"
						aria-controls="confirm_password"
						@click="state.show_confirm = !state.show_confirm"
					/>
				</template>
			</UInput>
		</UFormField>
		<UButton color="primary" type="submit" :loading="loading" :disabled="!canSubmit">{{ t('components.changePassword.updatePassword') }}</UButton>
	</UForm>
</template>

<script lang="ts" setup>
import { ChangePasswordValidation, AdminResetPasswordValidation } from '~/utils/schema/CRMUser/ChangePassword/ChangePasswordValidation';
import type { FormSubmitEvent, FormErrorEvent } from '#ui/types';
import type { z } from 'zod';

export interface ChangePasswordPayload {
	old_password: string;
	new_password: string;
	confirm_password: string;
}

export type ChangePasswordField = 'current' | 'new' | 'confirm';

export interface ChangePasswordServerError {
	field: ChangePasswordField | null;
	message: string;
}

const props = withDefaults(
	defineProps<{
		loading?: boolean;
		/** When false, hide current password field (admin reset other user). */
		requireCurrentPassword?: boolean;
	}>(),
	{ loading: false, requireCurrentPassword: true },
);

const requireCurrentPassword = computed(() => props.requireCurrentPassword);

const emit = defineEmits<{
	submit: [payload: ChangePasswordPayload];
	clearError: [];
}>();

const { t } = useI18n();

const schema = computed(() => (props.requireCurrentPassword ? ChangePasswordValidation(t) : AdminResetPasswordValidation(t)));
type Schema = z.infer<ReturnType<typeof ChangePasswordValidation>>;

const formRef = useTemplateRef('formRef');

const state = reactive({
	old_password: '',
	show_old: false,
	new_password: '',
	show_new: false,
	confirm_password: '',
	show_confirm: false,
});

const reset = () => {
	state.old_password = '';
	state.show_old = false;
	state.new_password = '';
	state.show_new = false;
	state.confirm_password = '';
	state.show_confirm = false;
	formRef.value?.clear();
};

defineExpose({ reset });

const passwordRequirements = computed(() => [
	{ regex: /.{8,}/, textKey: 'common.atLeast8Characters' },
	{ regex: /\d/, textKey: 'common.atLeast1Number' },
	{ regex: /[a-z]/, textKey: 'common.atLeast1Lowercase' },
	{ regex: /[A-Z]/, textKey: 'common.atLeast1Uppercase' },
]);

const checkPasswordStrength = (str: string) => {
	return passwordRequirements.value.map((req) => ({ met: req.regex.test(str), text: t(req.textKey) }));
};

const passwordStrength = computed(() => checkPasswordStrength(state.new_password));
const passwordStrengthScore = computed(() => passwordStrength.value.filter((r) => r.met).length);
const passwordStrengthColor = computed(() => {
	const score = passwordStrengthScore.value;
	if (score === 0) return 'neutral';
	if (score <= 1) return 'error';
	if (score <= 2) return 'warning';
	if (score === 3) return 'warning';
	return 'success';
});
const passwordStrengthText = computed(() => {
	const score = passwordStrengthScore.value;
	if (score === 0) return t('common.enterPassword');
	if (score <= 2) return t('common.weakPassword');
	if (score === 3) return t('common.mediumPassword');
	return t('common.strongPassword');
});

const canSubmit = computed(() => {
	const hasNew = Boolean(state.new_password?.trim()) && Boolean(state.confirm_password?.trim()) && passwordStrengthScore.value === 4;
	return props.requireCurrentPassword ? Boolean(state.old_password?.trim()) && hasNew : hasNew;
});

const onSubmit = (event: FormSubmitEvent<Schema>) => {
	emit('clearError');
	emit('submit', {
		old_password: event.data.old_password ?? '',
		new_password: event.data.new_password,
		confirm_password: event.data.confirm_password,
	});
};

const onError = (event: FormErrorEvent) => {
	const firstError = event.errors[0];
	if (firstError?.id) {
		const el = document.getElementById(firstError.id);
		el?.focus();
		el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
};
</script>

<style scoped>
::-ms-reveal {
	display: none;
}
</style>
