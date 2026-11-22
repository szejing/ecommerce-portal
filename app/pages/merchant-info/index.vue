<template>
	<ZPagePanel id="merchant-info" title="Merchant Info" />
</template>

<script lang="ts" setup>
const { appName } = usePlatformShell();
useHead({ title: () => `${appName.value} - Merchant Info` });
</script>
