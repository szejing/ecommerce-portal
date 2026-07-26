<template>
	<div class="w-full">
		<UForm ref="formRef" :schema="schema" :state="formState" class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6" @submit="submitForm">
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
								<UInput v-model="formState.name" :placeholder="t('components.crmUserForm.staffDepartment')" />
							</UFormField>
							<UFormField :label="t('components.crmUserForm.defaultCommissionRate')" name="default_commission_rate" required>
								<UInput
									:model-value="String(formState.default_commission_rate)"
									type="number"
									min="0"
									max="100"
									step="0.01"
									@update:model-value="(value: string | number) => (formState.default_commission_rate = Number(value || 0))"
								/>
							</UFormField>
							<UFormField :label="t('common.status')" name="is_active">
								<div class="flex items-center gap-2 pt-2">
									<USwitch v-model="formState.is_active" />
									<span class="text-sm text-muted">{{ formState.is_active ? t('common.active') : t('common.inactive') }}</span>
								</div>
							</UFormField>
						</div>
					</div>
				</UCard>
			</div>

			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-4">
					<FormStaffDepartmentReviewSummary :summary="reviewSummary" subtitle-key="components.staffDepartmentForm.reviewSubtitleEdit" />
				</div>
			</div>
		</UForm>
	</div>
</template>

<script setup lang="ts">
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { UpdateStaffDepartmentValidation } from '~/utils/schema';
import { ICONS } from '~/utils/icons';
import type { StaffDepartment } from '~/utils/types/staff-department';
import { useStaffDepartmentStore } from '~/stores/StaffDepartment/StaffDepartment';

const props = defineProps<{
	departmentId: number;
	initialDepartment: StaffDepartment;
}>();

const emit = defineEmits<{
	saved: [position: StaffDepartment | undefined];
}>();

const { t } = useI18n();
const staffDepartmentStore = useStaffDepartmentStore();

const schema = computed(() => UpdateStaffDepartmentValidation(t));
type Schema = z.infer<ReturnType<typeof UpdateStaffDepartmentValidation>>;

const formState = reactive({
	name: '',
	default_commission_rate: 0,
	is_active: true,
});

const reviewSummary = computed(() => ({
	name: formState.name.trim(),
	commissionRateLabel: `${Number(formState.default_commission_rate ?? 0)}%`,
	statusLabel: t(formState.is_active ? 'common.active' : 'common.inactive'),
}));

const formRef = ref<{ submit: () => void } | null>(null);

const applyFromDepartment = (position: StaffDepartment) => {
	formState.name = position.name;
	formState.default_commission_rate = Number(position.default_commission_rate ?? 0);
	formState.is_active = position.is_active;
};

watch(
	() => props.initialDepartment,
	(position) => {
		if (position) {
			applyFromDepartment(position);
		}
	},
	{ immediate: true },
);

const submitForm = async (event: FormSubmitEvent<Schema>) => {
	const { name, default_commission_rate, is_active } = event.data;
	const position = await staffDepartmentStore.updateDepartment(props.departmentId, {
		name,
		default_commission_rate,
		is_active,
	});

	if (position) {
		emit('saved', position);
	}
};

const submit = () => {
	formRef.value?.submit();
};

defineExpose({ submit });
</script>
