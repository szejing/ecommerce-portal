<template>
	<div class="w-full">
		<UForm ref="formRef" :schema="schema" :state="new_department" class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6" @submit="submitForm">
			<div class="lg:col-span-9 space-y-6">
				<UCard id="section-staff-department-details" class="shadow-md scroll-mt-4">
					<template #header>
						<div class="flex items-center gap-3">
							<UIcon :name="ICONS.USER_GROUP_ROUNDED" class="text-primary-600 w-8 h-8" />
							<div>
								<h2 class="text-xl font-semibold">{{ t('pages.staffDepartmentDetails') }}</h2>
								<p class="text-sm text-muted">{{ t('components.staffDepartmentForm.detailsSectionSubtitle') }}</p>
							</div>
						</div>
					</template>

					<div class="space-y-6 py-2 px-4">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<UFormField :label="t('common.name')" name="name" required class="sm:col-span-2">
								<UInput v-model="new_department.name" :placeholder="t('components.crmUserForm.staffDepartment')" />
							</UFormField>
							<UFormField :label="t('components.crmUserForm.defaultCommissionRate')" name="default_commission_rate" required>
								<UInput
									:model-value="String(new_department.default_commission_rate)"
									type="number"
									min="0"
									max="100"
									step="0.01"
									@update:model-value="(value: string | number) => (new_department.default_commission_rate = Number(value || 0))"
								/>
							</UFormField>
							<UFormField :label="t('common.status')" name="is_active">
								<div class="flex items-center gap-2 pt-2">
									<USwitch v-model="new_department.is_active" />
									<span class="text-sm text-muted">{{ new_department.is_active ? t('common.active') : t('common.inactive') }}</span>
								</div>
							</UFormField>
						</div>
					</div>
				</UCard>
			</div>

			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-4">
					<FormStaffDepartmentReviewSummary :summary="reviewSummary" subtitle-key="components.staffDepartmentForm.reviewSubtitleCreate" />
				</div>
			</div>
		</UForm>
	</div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { CreateStaffDepartmentValidation } from '~/utils/schema';
import { ICONS } from '~/utils/icons';
import { useStaffDepartmentStore } from '~/stores/StaffDepartment/StaffDepartment';

const emit = defineEmits<{
	saved: [];
}>();

const { t } = useI18n();
const staffDepartmentStore = useStaffDepartmentStore();
const { new_department } = storeToRefs(staffDepartmentStore);

const schema = computed(() => CreateStaffDepartmentValidation(t));
type Schema = z.infer<ReturnType<typeof CreateStaffDepartmentValidation>>;

const reviewSummary = computed(() => ({
	name: new_department.value.name.trim(),
	commissionRateLabel: `${Number(new_department.value.default_commission_rate ?? 0)}%`,
	statusLabel: t(new_department.value.is_active ? 'common.active' : 'common.inactive'),
}));

const formRef = ref<{ submit: () => void } | null>(null);

onMounted(() => {
	staffDepartmentStore.resetNewStaffDepartment();
});

const submitForm = async (event: FormSubmitEvent<Schema>) => {
	const { name, default_commission_rate, is_active } = event.data;
	const success = await staffDepartmentStore.createDepartment({
		name,
		default_commission_rate,
		is_active,
	});

	if (success) {
		emit('saved');
	}
};

const submit = () => {
	formRef.value?.submit();
};

defineExpose({ submit });
</script>
