<template>
	<div class="h-screen flex justify-center items-center">
		<div class="platform-shell-hero hidden sm:flex w-full h-full flex-col items-center justify-center">
			<img class="my-2 text-center mx-auto w-100" :src="logoSrc" :alt="logoAlt" @click="navigateTo('/')" />
		</div>
		<div class="w-full sm:w-[60%] px-10">
			<div v-if="token" class="max-w-md mx-auto">
				<FormResetPassword :token="token" />
			</div>
			<div v-else class="max-w-md mx-auto">
				<UCard variant="outline">
					<template #header>
						<h1 class="text-center">Invalid or expired link</h1>
					</template>
					<p class="text-muted text-sm text-center">This reset link is invalid or has expired. Please request a new one.</p>
					<template #footer>
						<div class="flex flex-col gap-2">
							<UButton block variant="outline" color="primary" @click="navigateTo('/forgot-password')"> Request new link </UButton>
							<NuxtLink to="/login" class="text-center text-sm text-muted hover:underline">Back to login</NuxtLink>
						</div>
					</template>
				</UCard>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
definePageMeta({ layout: 'auth', middleware: 'validate-password-reset-token' });

const { appName, logoSrc, logoAlt } = usePlatformShell();

useHead({
	title: computed(() => `${appName.value} - Reset Password`),
});

const route = useRoute();
const token = computed(() => {
	const t = route.query.token;
	return typeof t === 'string' && t.length > 0 ? t : null;
});
</script>
