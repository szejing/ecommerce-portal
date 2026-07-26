<template>
	<ZPagePanel id="staff-department-edit" :title="panelTitle" back-to="/operation/staff-departments" grow>
		<div class="container w-full mx-auto space-y-8">
			<FormStaffDepartmentUpdateLoading v-if="isLoading" />
			<template v-else-if="current_department">
				<FormStaffDepartmentUpdate
					:key="current_department.id"
					ref="formRef"
					:department-id="current_department.id"
					:initial-department="current_department"
					@saved="onSaved"
				/>

				<UCard>
					<template #header>
						<div class="flex items-center justify-between gap-3">
							<div>
								<h3 class="text-lg font-semibold text-default">{{ t('pages.staffDepartmentAssignedUsers') }}</h3>
								<p class="text-sm text-muted">{{ t('pages.staffDepartmentAssignedUsersDesc') }}</p>
							</div>
							<UBadge color="neutral" variant="subtle">{{ department_users_total }}</UBadge>
						</div>
					</template>

					<UTable
						:data="department_users"
						:columns="assignedUserColumns"
						:loading="department_users_loading"
						:ui="{ tr: 'cursor-pointer' }"
						@select="selectCrmUser"
					>
						<template #empty>
							<div class="flex flex-col items-center justify-center py-10 gap-2">
								<UIcon name="i-heroicons-user-group" class="w-10 h-10 text-gray-400" />
								<p class="text-sm text-muted">{{ t('pages.noStaffInDepartment') }}</p>
							</div>
						</template>
					</UTable>

					<div v-if="department_users.length > 0" class="section-pagination pt-4">
						<UPagination
							v-model="department_users_filter.current_page"
							:items-per-page="department_users_filter.page_size"
							:total="department_users_total"
							@update:page="updateDepartmentUsersPage"
						/>
					</div>
				</UCard>
			</template>
		</div>

		<template #footer>
			<div v-if="current_department" class="w-full backdrop-blur-sm border-t border-neutral-200 dark:border-neutral-800 shadow-md z-50">
				<div class="mx-auto px-4 sm:px-6 py-4">
					<div class="hidden md:flex justify-between items-center gap-3">
						<UButton color="error" variant="ghost" size="lg" :loading="removing" @click="confirmDelete">
							<UIcon :name="ICONS.TRASH" />
							{{ t('common.delete') }}
						</UButton>
						<div class="flex gap-3">
							<UButton color="neutral" variant="outline" size="lg" @click="goBack">{{ t('common.cancel') }}</UButton>
							<UButton color="success" variant="solid" size="lg" :loading="updating" @click="onSubmit">
								<UIcon :name="ICONS.CHECK_ROUNDED" />
								{{ t('common.save') }}
							</UButton>
						</div>
					</div>
					<div class="md:hidden flex flex-col gap-2">
						<UButton color="success" size="md" class="w-full" :loading="updating" @click="onSubmit">
							<UIcon :name="ICONS.CHECK_ROUNDED" class="w-4 h-4" />
							<span class="text-sm">{{ t('common.save') }}</span>
						</UButton>
						<div class="flex gap-2">
							<UButton color="error" variant="ghost" size="sm" class="flex-1" :loading="removing" @click="confirmDelete">
								<UIcon :name="ICONS.TRASH" class="w-4 h-4" />
								<span class="text-xs">{{ t('common.delete') }}</span>
							</UButton>
							<UButton color="neutral" variant="outline" size="sm" class="flex-1" @click="goBack">
								<span class="text-xs">{{ t('common.cancel') }}</span>
							</UButton>
						</div>
					</div>
				</div>
			</div>
		</template>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalConfirmation } from '#components';
import type { TableRow } from '@nuxt/ui';
import { ICONS } from '~/utils/icons';
import { getCrmUserColumns } from '~/utils/table-columns';
import type { CRMUser } from '~/utils/types/crm-user';
import type { StaffDepartment } from '~/utils/types/staff-department';
import { useStaffDepartmentStore } from '~/stores/StaffDepartment/StaffDepartment';
import { useCRMUserStore } from '~/stores/CRMUser/CRMUser';

const route = useRoute();
const departmentId = computed(() => Number(route.params.id));

const overlay = useOverlay();
const { t } = useI18n();
const staffDepartmentStore = useStaffDepartmentStore();
const crmUserStore = useCRMUserStore();
const { updating, removing, current_department } = storeToRefs(staffDepartmentStore);
const { department_users, department_users_total, department_users_loading, department_users_filter } = storeToRefs(crmUserStore);

const formRef = ref<{ submit: () => void } | null>(null);
const isLoading = ref(true);

const assignedUserColumns = computed(() => getCrmUserColumns(t, { hideStaffDepartment: true }));

const panelTitle = computed(() => {
	const label = current_department.value?.name;
	if (label) {
		return `${t('pages.editStaffDepartmentTitle')}: ${label}`;
	}
	return t('pages.editStaffDepartmentTitle');
});

useHead({
	title: () =>
		current_department.value ? `${t('pages.editStaffDepartmentPageTitle')} — ${current_department.value.name}` : t('pages.editStaffDepartmentPageTitle'),
});

const loadPageData = async () => {
	if (!Number.isFinite(departmentId.value) || departmentId.value <= 0) {
		await navigateTo('/operation/staff-departments');
		return;
	}

	const position = await staffDepartmentStore.getStaffDepartment(departmentId.value);
	if (!position) {
		await navigateTo('/operation/staff-departments');
		return;
	}

	await crmUserStore.fetchUsersByStaffDepartment(departmentId.value);
};

onMounted(async () => {
	isLoading.value = true;
	try {
		await loadPageData();
	} finally {
		isLoading.value = false;
	}
});

onUnmounted(() => {
	crmUserStore.resetDepartmentUsers();
});

const onSubmit = () => {
	formRef.value?.submit();
};

const goBack = () => {
	useRouter().back();
};

const onSaved = (position: StaffDepartment | undefined) => {
	if (position) {
		staffDepartmentStore.current_department = position;
	}
};

const selectCrmUser = (_e: Event, row: TableRow<CRMUser>) => {
	const user = row.original;
	if (!user?.id) return;
	navigateTo(`/operation/staff/${encodeURIComponent(user.id)}`);
};

const updateDepartmentUsersPage = async (page: number) => {
	await crmUserStore.updateDepartmentUsersPage(departmentId.value, page);
};

const confirmDelete = () => {
	if (!current_department.value) {
		return;
	}

	const id = current_department.value.id;

	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: t('components.staffDepartmentForm.confirmDelete'),
			action: 'delete',
			onConfirm: async () => {
				const success = await staffDepartmentStore.deleteDepartment(id);
				confirmModal.close();
				if (success) {
					await navigateTo('/operation/staff-departments');
				}
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};
</script>

<style scoped></style>
