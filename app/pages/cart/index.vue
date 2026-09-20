<template>
	<div>
		<UBreadcrumb :links="links" />
		<h1>Cart</h1>
	</div>
</template>

<script lang="ts" setup>
const links = [
	{
		label: 'Overview',
		icon: ICONS.DASHBOARD_ROUNDED,
		to: '/',
	},
];
</script>

<style scoped></style>
