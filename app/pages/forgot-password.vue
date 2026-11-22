<template>
	<div class="min-h-dvh flex justify-center items-center">
		<div class="platform-shell-hero hidden lg:flex w-full self-stretch flex-col items-center justify-center">
			<img class="my-2 text-center mx-auto w-full max-w-100 px-6" :src="logoSrc" :alt="logoAlt" @click="navigateTo('/')" />
		</div>
		<div class="w-full lg:w-[60%] px-4 py-5 sm:px-10 lg:py-0">
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
