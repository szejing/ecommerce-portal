<template>
	<USelect v-model="role" :items="roleItems" value-attribute="value" :placeholder="t('components.crmUserForm.role')" />
</template>

<script lang="ts" setup>
import type { UserRoles } from 'yeppi-common';
import { roleOptions } from '~/utils/options/user-roles';

const props = defineProps<{ role?: UserRoles }>();

const emit = defineEmits<{
	'update:role': [value: UserRoles];
}>();

const { t } = useI18n();

const roleItems = computed(() => roleOptions(t));

const role = computed({
	get() {
		return props.role;
	},
	set(value: UserRoles) {
		emit('update:role', value);
	},
});
</script>
