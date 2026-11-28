<template>
	<ZPagePanel id="settings-configuration" inline-mobile-actions :title="t('nav.configuration')" back-to="/settings/system">
		<template #navbar-right>
			<UButton color="success" class="max-lg:min-h-11" :loading="updating" :disabled="!isDirty" @click="onSave">
				<UIcon :name="ICONS.SAVE" class="w-4 h-4" />
				{{ t('common.save') }}
			</UButton>
		</template>

		<div class="mobile-form-controls min-w-0 space-y-3 lg:space-y-6 lg:pb-12">
			<div class="space-y-2">
				<h2 class="sr-only font-bold lg:not-sr-only lg:text-3xl text-gray-900 dark:text-white">{{ t('nav.configuration') }}</h2>
				<p class="text-sm text-muted lg:text-base">{{ t('pages.configurationPageDesc') }}</p>
			</div>

			<div v-if="tabItems.length && !updating && !desktopViewport" class="space-y-3 lg:hidden">
				<USelect
					v-model="activeTab"
					:items="tabItems"
					:aria-label="t('nav.configuration')"
					class="min-h-11 w-full"
				/>
				<UCard v-if="activeSegment" :ui="{ body: 'p-3' }">
					<ZSettingSegment :segment="activeSegment" />
				</UCard>
			</div>

			<UTabs v-if="tabItems.length && !updating && desktopViewport" v-model="activeTab" :items="tabItems" class="hidden w-full pb-12 lg:flex" :ui="tabsUi">
				<template v-for="segment in segments" :key="segment.segment_code" #[segment.segment_code]>
					<UCard>
						<ZSettingSegment :segment="segment" />
					</UCard>
				</template>
			</UTabs>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalLoading } from '#components';
import { ICONS } from '~/utils/icons';
import { useMediaQuery } from '@vueuse/core';
import type { TabsItem } from '@nuxt/ui';

const { t } = useI18n();
useHead({ title: () => t('pages.configurationTitle') });

const overlay = useOverlay();
const settingsStore = useSettingStore();
const merchantInfoStore = useMerchantInfoStore();
const loadingModal = overlay.create(ZModalLoading, { props: { key: 'loading' } });

const { segments, updating, updatedSettings } = storeToRefs(settingsStore);
await settingsStore.getSettings();

const isDirty = computed(() => updatedSettings.value.length > 0);

useLeavePageGuard(isDirty, {
	onLeave: () => settingsStore.clearUpdatedSettings(),
});

onMounted(() => {
	if (merchantInfoStore.merchant.length === 0) {
		void merchantInfoStore.getMerchantInfos();
	}
});

watch(
	() => updating.value,
	(value: boolean) => {
		if (value) {
			loadingModal.open();
		} else {
			loadingModal.close();
		}
	},
);

const onSave = async () => {
	await settingsStore.updateSettings();
};

const desktopViewport = useMediaQuery('(min-width: 1024px)', { ssrWidth: 1024 });
const activeTab = ref(segments.value[0]?.segment_code ?? '');
const activeSegment = computed(() => segments.value.find((segment) => segment.segment_code === activeTab.value));
watch(segments, (available) => {
	if (!activeSegment.value) activeTab.value = available[0]?.segment_code ?? '';
});

const tabsUi = {
	list: 'overflow-x-auto flex-nowrap w-full max-w-full',
	trigger: 'grow-0! shrink-0 whitespace-nowrap',
	label: 'whitespace-nowrap',
};

const tabItems = computed<(TabsItem & { value: string })[]>(() =>
	segments.value.map((segment) => ({
		label: segment.segment_desc,
		icon: ICONS.SETTINGS_ROUNDED,
		slot: segment.segment_code,
		value: segment.segment_code,
	})),
);
</script>

<style scoped></style>
