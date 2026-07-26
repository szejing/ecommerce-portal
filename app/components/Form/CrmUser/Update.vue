<template>
	<UForm ref="formRef" :schema="crmUserSchema" :state="state" class="space-y-6" @submit="onSubmit">
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<UFormField name="name" :label="t('components.crmUserForm.name')">
				<UInput :model-value="state.name" :placeholder="t('components.crmUserForm.name')" @update:model-value="(v: string) => set('name', v)" />
			</UFormField>

			<UFormField name="role" :label="t('components.crmUserForm.role')">
				<ZSelectMenuCrmUserRole :role="state.role" @update:role="(v) => set('role', v)" />
			</UFormField>

			<UFormField name="staff_department_id" :label="t('components.crmUserForm.staffDepartment')">
				<ZSelectMenuStaffDepartment
					:staff-department-id="state.staff_department_id"
					:disabled="!canEditStaffDepartment"
					:load-departments="canEditStaffDepartment"
					@update:staff-department-id="(v) => set('staff_department_id', v)"
				/>
			</UFormField>

			<UFormField name="email_address" :label="t('components.crmUserForm.email')" class="sm:col-span-2">
				<UInput
					:model-value="state.email_address"
					type="email"
					:placeholder="t('components.crmUserForm.email')"
					@update:model-value="(v: string) => set('email_address', v)"
				/>
			</UFormField>

			<UFormField name="dial_code" :label="t('components.crmUserForm.phone')">
				<ZPhoneInput
					:dial-code="state.dial_code"
					:phone-no="state.phone_no"
					:placeholder="t('components.crmUserForm.phone')"
					@update:dial-code="(v: string) => set('dial_code', v)"
					@update:phone-no="(v: string) => set('phone_no', v)"
				/>
			</UFormField>

			<UFormField :label="t('components.crmUserForm.status')" name="is_active">
				<USwitch
					v-model="state.is_active"
					class="mt-2"
					:label="
						t('components.crmUserForm.currentStatusLabel', {
							status: state.is_active ? t('components.crmUserForm.statusActive') : t('components.crmUserForm.statusDisabled'),
						})
					"
				/>
			</UFormField>
		</div>
	</UForm>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '@nuxt/ui';
import type { z } from 'zod';
import { type CrmUserUpdate } from '~/utils/types/crm-user';
import { CreateCRMUserValidation } from '~/utils/schema';

const { t } = useI18n();
const crmUserSchema = computed(() => CreateCRMUserValidation(t));
type Schema = z.infer<ReturnType<typeof CreateCRMUserValidation>>;

const formRef = ref<{ submit: () => void } | null>(null);

const props = withDefaults(
	defineProps<{
		modelValue?: CrmUserUpdate | null;
		canEditStaffDepartment?: boolean;
	}>(),
	{
		canEditStaffDepartment: false,
		modelValue: () => ({
			name: '',
			email_address: '',
			dial_code: '',
			phone_no: '',
			role: undefined,
			is_active: true,
			staff_department_id: null,
		}),
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: CrmUserUpdate];
	submit: [payload: Schema];
}>();

const onSubmit = (event: FormSubmitEvent<Schema>) => {
	emit('submit', event.data);
};

const submit = () => {
	formRef.value?.submit();
};

defineExpose({ submit });

const state = reactive<CrmUserUpdate>({
	name: props.modelValue?.name ?? '',
	email_address: props.modelValue?.email_address ?? '',
	dial_code: props.modelValue?.dial_code ?? '',
	phone_no: props.modelValue?.phone_no ?? '',
	role: props.modelValue?.role ?? undefined,
	is_active: props.modelValue?.is_active ?? true,
	staff_department_id: props.modelValue?.staff_department_id ?? null,
});

const canEditStaffDepartment = computed(() => props.canEditStaffDepartment);

watch(
	() => props.modelValue,
	(v) => {
		if (v) Object.assign(state, v);
	},
	{ immediate: true, deep: true },
);

const set = <K extends keyof CrmUserUpdate>(key: K, value: CrmUserUpdate[K]) => {
	state[key] = value;
	emit('update:modelValue', { ...state });
};
</script>
