<template>
	<ZPagePanel id="crm-user-detail" :title="pageTitle" back-to="/operation/staff">
		<div v-if="loading || !current_crm_user" class="w-full animate-in fade-in duration-200 space-y-6 max-w-3xl">
			<FormCrmUserUpdateLoading />
		</div>

		<div v-else class="space-y-6 max-w-3xl">
			<!-- User info card: view / edit -->
			<UCard>
				<template #header>
					<div class="flex items-center justify-between">
						<h2 class="flex items-center text-lg font-semibold text-neutral-900 dark:text-neutral-100">
							<UIcon name="i-heroicons-user" class="w-5 h-5 inline-block mr-2" />
							{{ t('pages.crmUserDetailUserInformation') }}
						</h2>
						<div class="flex items-center gap-2">
							<UButton v-if="canEditCurrentUser" color="success" :loading="updating" :disabled="!hasChanges" @click="editFormRef?.submit()">
								<UIcon :name="ICONS.SAVE" class="w-4 h-4" />
								{{ t('common.save') }}
							</UButton>
							<UButton
								v-if="canDeleteCurrentUser"
								size="sm"
								color="error"
								variant="ghost"
								class="flex-1 opacity-50 hover:opacity-100"
								:icon="ICONS.TRASH"
								:disabled="updating"
								@click="deleteUser"
							>
								{{ t('common.delete') }}
							</UButton>
						</div>
					</div>
				</template>

				<div v-if="current_crm_user" class="space-y-4">
					<FormCrmUserUpdate
						v-if="canEditCurrentUser"
						ref="editFormRef"
						:model-value="current_crm_user"
						:can-edit-staff-department="isAdmin"
						@update:model-value="
							(v: CrmUserUpdate) => {
								crmUserStore.new_crm_user = v;
								formTouched = true;
							}
						"
						@submit="onEditFormSubmit"
					/>
					<div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
						<div>
							<span class="text-neutral-500 dark:text-neutral-400">{{ t('components.crmUserForm.name') }}</span>
							<p class="font-medium text-neutral-900 dark:text-neutral-100">
								{{ current_crm_user.name || '—' }}
							</p>
						</div>
						<div>
							<span class="text-neutral-500 dark:text-neutral-400">{{ t('components.crmUserForm.role') }}</span>
							<p class="font-medium text-neutral-900 dark:text-neutral-100">
								{{ current_crm_user.role ? roleLabel(current_crm_user.role, t) : '—' }}
							</p>
						</div>
						<div class="sm:col-span-2">
							<span class="text-neutral-500 dark:text-neutral-400">{{ t('components.crmUserForm.email') }}</span>
							<p class="font-medium text-neutral-900 dark:text-neutral-100">
								{{ current_crm_user.email_address || '—' }}
							</p>
						</div>
						<div>
							<span class="text-neutral-500 dark:text-neutral-400">{{ t('components.crmUserForm.staffDepartment') }}</span>
							<p class="font-medium text-neutral-900 dark:text-neutral-100">
								{{ currentStaffDepartmentName }}
							</p>
						</div>
						<div>
							<span class="text-neutral-500 dark:text-neutral-400">{{ t('components.crmUserForm.phone') }}</span>
							<p class="font-medium text-neutral-900 dark:text-neutral-100">
								{{ current_crm_user.dial_code && current_crm_user.phone_no ? `${current_crm_user.dial_code} ${current_crm_user.phone_no}` : '—' }}
							</p>
						</div>
						<div>
							<span class="text-neutral-500 dark:text-neutral-400">{{ t('components.crmUserForm.status') }}</span>
							<div class="mt-1">
								<UBadge :color="current_crm_user.is_active ? 'success' : 'error'" variant="subtle">
									{{ current_crm_user.is_active ? t('components.crmUserForm.statusActive') : t('components.crmUserForm.statusDisabled') }}
								</UBadge>
							</div>
						</div>
					</div>
				</div>
			</UCard>

			<!-- Change / reset password: only for self or admin viewing another user -->
			<UCard v-if="showPasswordSection">
				<template #header>
					<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
						<UIcon name="i-heroicons-key" class="w-5 h-5 inline-block mr-2" />
						{{ isViewingSelf ? t('pages.crmUserDetailChangePasswordTitle') : t('pages.crmUserDetailResetPasswordTitle') }}
					</h2>
				</template>

				<p class="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
					{{ isViewingSelf ? t('pages.crmUserDetailChangePasswordDesc') : t('pages.crmUserDetailResetPasswordDesc') }}
				</p>
				<FormCrmUserChangePassword ref="formRef" :loading="updating" :require-current-password="isViewingSelf" @submit="submitPassword" />
			</UCard>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { UserRoles } from 'yeppi-common';
import { type CrmUserUpdate } from '~/utils/types/crm-user';
import { useCRMUserStore } from '~/stores/CRMUser/CRMUser';
import { useStaffDepartmentStore } from '~/stores/StaffDepartment/StaffDepartment';
import { roleLabel } from '~/utils/options/user-roles';
import { ZModalConfirmation, ZModalLoading } from '#components';
import { useAuthStore } from '~/stores';
import { ICONS } from '~/utils/icons';

const route = useRoute();
const id = computed(() => String(route.params.id ?? ''));
const crmUserStore = useCRMUserStore();
const staffDepartmentStore = useStaffDepartmentStore();
const authStore = useAuthStore();
const overlay = useOverlay();
const loadingModal = overlay.create(ZModalLoading, {
	props: { key: 'loading' },
});
const { updating, loading, current_crm_user } = storeToRefs(crmUserStore);
const { user: authUser } = storeToRefs(authStore);

const isViewingSelf = computed(() => current_crm_user.value?.id === authUser.value?.id);
const isAdmin = computed(() => {
	const role = authUser.value?.role;
	return role === UserRoles.MERCHANT_ADMIN || role === UserRoles.SUPER_ADMIN;
});
const isCurrentUserStaff = computed(() => {
	const role = current_crm_user.value?.role;
	return role === UserRoles.MERCHANT_STAFF || role === UserRoles.SUPER_STAFF;
});
const canEditCurrentUser = computed(() => isViewingSelf.value || (isAdmin.value && isCurrentUserStaff.value));
const canDeleteCurrentUser = computed(() => isAdmin.value && isCurrentUserStaff.value);
/** Only admin can reset another staff's password; own password change is allowed for everyone. */
const canResetOtherStaffPassword = computed(() => !isViewingSelf.value && isAdmin.value);
const showPasswordSection = computed(() => isViewingSelf.value || canResetOtherStaffPassword.value);
const currentStaffDepartmentName = computed(() => {
	const position =
		current_crm_user.value?.staff_department ?? staffDepartmentStore.departments.find((item) => item.id === current_crm_user.value?.staff_department_id);
	return position?.name ?? '—';
});

const { t } = useI18n();
const pageTitle = computed(() => {
	if (!current_crm_user.value) return t('pages.crmUser');
	const u = current_crm_user.value;
	return u.name || u.email_address || t('pages.crmUser');
});

watch(
	() => updating.value,
	(value: boolean) => {
		if (value) {
			loadingModal.open();
		} else {
			loadingModal.close();
		}
	},
);

onBeforeMount(async () => {
	if (!current_crm_user.value) {
		const crmUser = await crmUserStore.getCrmUser(id.value);
		if (crmUser) {
			crmUserStore.current_crm_user = crmUser;
		} else {
			await navigateTo('/operation/staff');
		}
	}
});

const editFormRef = ref<{ submit: () => void } | null>(null);
const formRef = useTemplateRef<{ reset: () => void }>('formRef');

const formTouched = ref(false);
const hasChanges = computed(() => {
	if (!formTouched.value || !current_crm_user.value) return false;
	const original = current_crm_user.value;
	const edited = crmUserStore.new_crm_user;
	return (
		edited.name !== original.name ||
		edited.email_address !== original.email_address ||
		edited.dial_code !== original.dial_code ||
		edited.phone_no !== original.phone_no ||
		edited.role !== original.role ||
		edited.staff_department_id !== (original.staff_department_id ?? null)
	);
});

useLeavePageGuard(hasChanges, {
	onLeave: () => {
		formTouched.value = false;
		current_crm_user.value = undefined;
	},
});

const onEditFormSubmit = async (payload: {
	name: string;
	email_address: string;
	dial_code: string;
	phone_no: string;
	role: CrmUserUpdate['role'];
	staff_department_id?: number | null;
}) => {
	await crmUserStore.updateCrmUser(id.value, {
		name: payload.name || undefined,
		email_address: payload.email_address || undefined,
		dial_code: payload.dial_code || undefined,
		phone_no: payload.phone_no || undefined,
		role: payload.role || undefined,
		staff_department_id: payload.staff_department_id ?? null,
	});
	const refreshed = await crmUserStore.getCrmUser(id.value);
	if (refreshed) {
		current_crm_user.value = refreshed;
		formTouched.value = false;
	}
};

const submitPassword = async (payload: { old_password: string; new_password: string; confirm_password: string }) => {
	// Reset other staff password is allowed only for admin; enforce role check even if UI is bypassed
	const isResetOther = !isViewingSelf.value && !payload.old_password;
	if (isResetOther && !isAdmin.value) {
		return;
	}

	const result = isViewingSelf.value
		? await crmUserStore.updateCrmUserPassword(id.value, {
				old_password: payload.old_password,
				new_password: payload.new_password,
				confirm_password: payload.confirm_password,
			})
		: await crmUserStore.resetCrmUserPassword(authUser.value!.id, {
				staff_id: current_crm_user.value!.id,
				new_password: payload.new_password,
				confirm_password: payload.confirm_password,
			});

	if (result === true) {
		formRef.value?.reset();
	}
};

const deleteUser = async () => {
	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: t('pages.confirmDeleteCrmUser'),
			action: 'delete',
			onConfirm: async () => {
				await crmUserStore.deleteCrmUser(current_crm_user.value!);
				confirmModal.close();
				navigateTo(`/operation/staff`);
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};

onMounted(async () => {
	const [user] = await Promise.all([crmUserStore.getCrmUser(id.value), isAdmin.value ? staffDepartmentStore.getStaffDepartments() : Promise.resolve()]);
	if (user) {
		current_crm_user.value = user;
	}
});
</script>

<style scoped></style>
