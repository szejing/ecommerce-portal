<template>
	<div class="h-screen flex justify-center items-center">
		<div class="platform-shell-hero hidden sm:flex w-full h-full flex-col items-center justify-center">
			<img class="my-2 text-center mx-auto w-100" :src="logoSrc" :alt="logoAlt" @click="navigateTo('/')" />
		</div>
		<div class="w-full sm:w-[60%] px-10">
			<FormForgotPassword />
		</div>
	</div>
</template>

<script lang="ts" setup>
definePageMeta({ layout: 'auth' });

const { appName, logoSrc, logoAlt } = usePlatformShell();

useHead({
	title: computed(() => `${appName.value} - Forgot Password`),
});
</script>
