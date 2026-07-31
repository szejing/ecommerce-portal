<template>
	<ZPagePanel id="analytics-google-analytics" :title="t('pages.googleAnalytics.title')" back-to="/analytics">
		<div class="p-6 space-y-6">
			<div class="space-y-2">
				<h2 class="text-3xl font-bold text-gray-900 dark:text-white">{{ t('pages.googleAnalytics.title') }}</h2>
				<p class="text-gray-600 dark:text-gray-400">{{ t('pages.googleAnalytics.description') }}</p>
			</div>

			<UCard>
				<form class="space-y-4" @submit.prevent="onSave">
					<UFormField :label="t('pages.googleAnalytics.measurementId')" :hint="t('pages.googleAnalytics.measurementIdHint')">
						<UInput v-model="measurementId" placeholder="G-XXXXXXXXXX" :disabled="updating" />
					</UFormField>
					<p v-if="validationError" class="text-sm text-error">{{ validationError }}</p>
					<p v-if="statusMessage" class="text-sm text-success">{{ statusMessage }}</p>

					<div class="flex flex-wrap gap-3">
						<UButton type="submit" color="success" :disabled="updating">
							{{ t('pages.googleAnalytics.save') }}
						</UButton>
						<UButton type="button" color="error" variant="outline" :disabled="updating" @click="persistMeasurementId('')">
							{{ t('pages.googleAnalytics.remove') }}
						</UButton>
					</div>
				</form>
			</UCard>

			<UCard>
				<div class="space-y-4">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('pages.googleAnalytics.setupTitle') }}</h3>
					<ol class="list-decimal space-y-2 pl-5 text-gray-600 dark:text-gray-400">
						<li>{{ t('pages.googleAnalytics.setupStepOne') }}</li>
						<li>{{ t('pages.googleAnalytics.setupStepTwo') }}</li>
						<li>{{ t('pages.googleAnalytics.setupStepThree') }}</li>
					</ol>
					<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.googleAnalytics.platformAnalyticsNote') }}</p>
					<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.googleAnalytics.securityNote') }}</p>
				</div>
			</UCard>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ANALYTICS, GROUP_CODE } from 'yeppi-common';
import { failedNotification } from '~/stores/AppUi/AppUi';
import { useSettingStore } from '~/stores/Setting/Setting';
import { resolveGoogleAnalyticsSetting } from '~/utils/google-analytics-setting';

const { t } = useI18n();
useHead({ title: () => t('pages.googleAnalytics.title') });

const settingsStore = useSettingStore();
const updating = computed(() => settingsStore.updating);
const measurementId = ref('');
const validationError = ref('');
const statusMessage = ref('');

const getMeasurementSetting = () => settingsStore.getSetting(
	GROUP_CODE.ANALYTICS,
	ANALYTICS.GOOGLE_ANALYTICS_MEASUREMENT_ID,
);

await settingsStore.getSettings();
const initialSetting = getMeasurementSetting();
if (!initialSetting) {
	failedNotification(t('pages.googleAnalytics.settingMissing'));
} else {
	measurementId.value = initialSetting.getString() ?? '';
}

const persistMeasurementId = async (candidate: string) => {
	const result = resolveGoogleAnalyticsSetting(candidate);
	if (!result.ok) {
		validationError.value = t(result.errorKey);
		return;
	}

	const setting = getMeasurementSetting();
	if (!setting) {
		failedNotification(t('pages.googleAnalytics.settingMissing'));
		return;
	}

	validationError.value = '';
	statusMessage.value = '';
	measurementId.value = result.value;
	setting.set_value = result.value;
	settingsStore.addToUpdatedSettings(setting);
	await settingsStore.updateSettings();
	if (settingsStore.updatedSettings.length === 0) {
		statusMessage.value = t(result.value ? 'pages.googleAnalytics.saved' : 'pages.googleAnalytics.removed');
	}
};

const onSave = async () => {
	await persistMeasurementId(measurementId.value);
};
</script>
