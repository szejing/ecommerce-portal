<template>
	<ZPagePanel id="crm-user-create" :title="pageTitle" back-to="/operation/staff">
		<div class="mx-auto max-w-3xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
			<div class="mobile-form-controls bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-3 sm:p-8">
				<FormCrmUserCreation />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { useCRMUserStore } from '~/stores/CRMUser/CRMUser';

const { t } = useI18n();
const pageTitle = computed(() => t('pages.crmUserCreate'));

const crmUserStore = useCRMUserStore();
const { new_crm_user } = storeToRefs(crmUserStore);

const isDirty = computed(() => {
	const u = new_crm_user.value;
	return !!(u.name || u.email_address || u.phone_no || u.staff_department_id);
});

useLeavePageGuard(isDirty);
</script>

<style scoped></style>
