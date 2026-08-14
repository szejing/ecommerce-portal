<template>
	<NuxtLayout name="auth">
		<div class="min-h-screen flex flex-col bg-elevated/30">
			<header class="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6 border-b border-default">
				<button
					type="button"
					class="flex items-center gap-2 text-default hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-main-500 focus-visible:ring-offset-2 rounded-md"
					aria-label="Home"
					@click="goHome"
				>
					<img class="h-8 w-auto sm:h-9" :src="logoSrc" :alt="logoAlt" />
				</button>
				<USelect :model-value="locale" :items="localeItems" size="sm" class="w-36" @update:model-value="switchLocale" />
			</header>

			<main class="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
				<UCard class="w-full max-w-md text-center" :ui="{ root: 'shadow-sm', body: 'space-y-6 py-8 sm:py-10 px-6 sm:px-8' }">
					<div class="flex justify-center">
						<div
							class="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full"
							:class="
								isNotFound
									? 'bg-main-100 dark:bg-main-900/40 text-main-600 dark:text-main-400'
									: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
							"
							aria-hidden="true"
						>
							<UIcon :name="isNotFound ? 'i-lucide-file-question' : 'i-lucide-alert-circle'" class="size-8 sm:size-10" />
						</div>
					</div>

					<div class="space-y-1">
						<p class="text-xs font-medium text-muted uppercase tracking-wider">{{ t('error.pageTitle') }} · {{ statusCode }}</p>
						<h1 class="text-xl sm:text-2xl font-semibold text-default">
							{{ title }}
						</h1>
						<p class="text-muted text-sm sm:text-base">
							{{ message }}
						</p>
					</div>

					<div class="flex flex-col-reverse sm:flex-row gap-3 justify-center pt-2">
						<UButton v-if="!isNotFound" color="neutral" variant="soft" size="lg" class="min-w-32" @click="tryAgain">
							{{ t('error.tryAgain') }}
						</UButton>
						<UButton color="primary" size="lg" class="min-w-32 button button-primary-solid" @click="goHome">
							{{ t('error.goBackHome') }}
						</UButton>
					</div>
				</UCard>
			</main>
		</div>
	</NuxtLayout>
</template>

<script lang="ts" setup>
import type { NuxtError } from '#app';
import { LOCALE_STORAGE_KEY } from '~/utils/constants/i18n';

const props = defineProps<{ error: NuxtError }>();
const { t, locale, setLocale } = useI18n();
const { logoSrc, logoAlt } = usePlatformShell();

const statusCode = computed(() => props.error.status ?? 500);
const isNotFound = computed(() => statusCode.value === 404);

const title = computed(() => {
	if (isNotFound.value) return t('error.notFoundTitle');
	if (statusCode.value >= 500) return t('error.serverErrorTitle');
	return props.error.message || t('error.pageTitle');
});

const message = computed(() => {
	if (isNotFound.value) return t('error.notFoundMessage');
	if (statusCode.value >= 500) return t('error.serverErrorMessage');
	return t('error.genericMessage');
});

const localeItems = computed(() => [
	{ label: t('common.english'), value: 'en' },
	{ label: t('common.bahasaMelayu'), value: 'ms' },
]);

const switchLocale = (newLocale: string) => {
	if (import.meta.client) {
		try {
			localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
		} catch {
			// ignore
		}
		setLocale(newLocale as 'en' | 'ms');
	}
};

const goHome = () => {
	clearError({ redirect: '/' });
};

const tryAgain = () => {
	clearError();
};
</script>
