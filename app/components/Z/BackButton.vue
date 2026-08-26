<template>
	<UButton
		variant="ghost"
		color="neutral"
		:icon="ICONS.ARROW_LEFT"
		:label="labeled ? t('components.backButton.backToPreviousPage') : undefined"
		:aria-label="t('components.backButton.backToPreviousPage')"
		@click="goBack"
		class="px-2"
	/>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
const router = useRouter();

const props = withDefaults(
	defineProps<{
		/** When there is no history (e.g. direct load), navigate here instead of leaving the app. */
		fallbackTo?: string;
		/** When true, shows a text label next to the icon. */
		labeled?: boolean;
	}>(),
	{ fallbackTo: '/', labeled: false },
);

function goBack() {
	if (import.meta.client && window.history.length <= 1) {
		navigateTo(props.fallbackTo);
	} else {
		router.back();
	}
}
</script>
