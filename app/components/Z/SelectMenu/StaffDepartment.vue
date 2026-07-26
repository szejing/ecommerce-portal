<template>
	<USelect
		v-model="staffDepartmentId"
		:items="staffDepartmentOptions"
		value-attribute="value"
		:disabled="disabled"
		:placeholder="t('components.crmUserForm.staffDepartment')"
	/>
</template>

<script lang="ts" setup>
import { useStaffDepartmentStore } from '~/stores/StaffDepartment/StaffDepartment';

const props = withDefaults(
	defineProps<{
		staffDepartmentId?: number | null;
		disabled?: boolean;
		loadDepartments?: boolean;
	}>(),
	{
		staffDepartmentId: null,
		disabled: false,
		loadDepartments: true,
	},
);

const emit = defineEmits<{
	'update:staffDepartmentId': [value: number | null];
}>();

const { t } = useI18n();
const staffDepartmentStore = useStaffDepartmentStore();

const staffDepartmentOptions = computed(() => [{ label: t('common.notSet'), value: null }, ...staffDepartmentStore.options]);

const staffDepartmentId = computed({
	get() {
		return props.staffDepartmentId;
	},
	set(value: number | null) {
		emit('update:staffDepartmentId', value);
	},
});

onMounted(async () => {
	if (props.loadDepartments) {
		await staffDepartmentStore.getStaffDepartments();
	}
});
</script>
