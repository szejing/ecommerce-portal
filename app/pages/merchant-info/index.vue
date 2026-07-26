<template>
	<div>
		<UBreadcrumb :links="links" />
		<h1>Merchant Info</h1>
	</div>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
const links = [
	{
		label: 'Overview',
		icon: ICONS.DASHBOARD_ROUNDED,
		to: '/',
	},
];

useHead({ title: 'Wemotoo CRM - Merchant Info' });
</script>

<style scoped></style>
