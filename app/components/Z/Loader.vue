<template>
	<div
		v-motion
		:initial="{ opacity: 0 }"
		:enter="{
			opacity: 1,
			transition: {
				repeat: Infinity,
				repeatType: 'mirror',
			},
		}"
		:duration="1000"
	>
		<NuxtImg :src="logoSrc" :alt="logoAlt" class="w-100" />
	</div>
</template>

<script lang="ts" setup>
const { logoSrc, logoAlt } = usePlatformShell();
</script>

<style scoped></style>
