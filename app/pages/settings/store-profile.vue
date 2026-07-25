<template>
	<ZPagePanel id="settings-store-profile" :title="$t('nav.storeProfile')" back-to="/settings">
		<template v-if="isPageContentReady" #navbar-right>
			<UButton color="neutral" variant="ghost" @click="onCancel">{{ $t('common.cancel') }}</UButton>
			<UButton color="success" :loading="merchantInfoStore.loading" @click="onSave" :disabled="!isDirty">
				<UIcon :name="ICONS.SAVE" class="w-4 h-4" />
				{{ $t('common.save') }}
			</UButton>
		</template>

		<div v-if="!isPageContentReady" class="space-y-6 p-6">
			<div class="space-y-2">
				<USkeleton class="h-9 w-64 max-w-full" />
				<USkeleton class="h-4 w-full max-w-lg" />
			</div>
			<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<div v-for="i in 4" :key="i" class="flex min-w-0 flex-col gap-2.5 rounded-xl border border-default p-4">
					<USkeleton class="h-3 w-20" />
					<USkeleton class="h-6 w-full" />
				</div>
			</div>
			<UCard :ui="{ body: 'p-6' }">
				<div class="space-y-6">
					<USkeleton class="h-6 w-48" />
					<div class="max-w-full sm:max-w-[200px]">
						<USkeleton class="h-4 w-24 mb-2" />
						<USkeleton class="aspect-square w-full rounded-lg" />
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<div v-for="j in 6" :key="j" class="space-y-2">
							<USkeleton class="h-4 w-24" />
							<USkeleton class="h-10 w-full" />
						</div>
					</div>
					<div class="space-y-4">
						<USkeleton class="h-4 w-20" />
						<div class="grid gap-4 sm:grid-cols-2">
							<div v-for="k in 7" :key="k" class="space-y-2">
								<USkeleton class="h-4 w-28" />
								<USkeleton class="h-10 w-full" />
							</div>
						</div>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<div v-for="n in 2" :key="n" class="space-y-2">
							<USkeleton class="h-4 w-20" />
							<USkeleton class="h-10 w-full" />
						</div>
					</div>
				</div>
			</UCard>
		</div>
		<div v-else class="p-6 space-y-6">
			<div
				class="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
				:class="
					hideStore
						? 'border-red-200/60 bg-red-50/80 dark:border-red-800/50 dark:bg-red-950/40'
						: 'border-gray-200/60 bg-gray-50/80 dark:border-gray-700/50 dark:bg-gray-800/60'
				"
			>
				<div class="min-w-0 space-y-1">
					<p class="text-sm font-semibold text-gray-900 dark:text-white">
						{{ $t('pages.storeProfilePage.hideStoreLabel') }}
					</p>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						{{ $t('pages.storeProfilePage.hideStoreDesc') }}
					</p>
				</div>
				<USwitch
					:model-value="hideStore"
					:loading="merchantInfoStore.updating"
					:disabled="merchantInfoStore.updating"
					color="error"
					size="lg"
					@update:model-value="onHideStoreChange"
				/>
			</div>

			<div class="space-y-2">
				<h2 class="text-3xl font-bold text-gray-900 dark:text-white">{{ $t('nav.storeProfile') }}</h2>
				<p class="text-gray-600 dark:text-gray-400">{{ $t('pages.storeProfileDesc') }}</p>
			</div>

			<!-- Merchant ID | Account Type | Expired Date | Account Status – card based, tinted backgrounds -->
			<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<div
					class="flex min-w-0 flex-col gap-2.5 rounded-xl border border-primary-200/50 bg-primary-50/80 p-4 dark:border-primary-800/50 dark:bg-primary-950/40"
				>
					<span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 wrap-break-word leading-tight">
						{{ $t('pages.storeProfilePage.merchantId') }}
					</span>
					<span class="text-lg font-semibold font-mono text-primary-700 dark:text-primary-300">{{ merchantId }}</span>
				</div>
				<div class="flex min-w-0 flex-col gap-2.5 rounded-xl border p-4" :class="accountStatusCardBg">
					<span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 wrap-break-word leading-tight">
						{{ $t('pages.storeProfilePage.accountStatus') }}
					</span>
					<span class="text-lg font-semibold capitalize" :class="accountStatusTextClass">{{ accountStatusLabel }}</span>
				</div>
				<div class="flex min-w-0 flex-col gap-2.5 rounded-xl border p-4" :class="accountTypeCardBg">
					<span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 wrap-break-word leading-tight">
						{{ $t('pages.storeProfilePage.accountType') }}
					</span>
					<span class="text-lg font-semibold capitalize" :class="accountTypeTextClass">{{ accountType }}</span>
				</div>
				<div class="flex min-w-0 flex-col gap-2.5 rounded-xl border p-4" :class="expiredDateCardBg">
					<span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 wrap-break-word leading-tight">
						{{ $t('pages.storeProfilePage.expiredDate') }}
					</span>
					<span class="text-lg font-semibold" :class="isExpiringSoon ? 'text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'">
						{{ merchantExpiredDate }}
					</span>
				</div>
			</div>

			<UCard>
				<div class="space-y-6">
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ $t('pages.storeProfilePage.merchantInformation') }}</h3>

					<!-- Thumbnail -->
					<UFormField :label="$t('pages.storeProfilePage.thumbnail')">
						<ZDropzone
							class="max-w-full sm:max-w-50"
							:key="thumbnailDropzoneKey"
							:existing-images="thumbnailExistingImages"
							:multiple="false"
							:disabled="merchantInfoStore.loading || merchantInfoStore.updating"
							@files-selected="onThumbnailFilesSelected"
							@delete-image="onThumbnailDelete"
						/>
					</UFormField>

					<!-- Name, Company email, website, phone no -->
					<div class="grid gap-4 sm:grid-cols-2">
						<UFormField :label="$t('common.name')">
							<UInput
								:model-value="getMerchantValue(GROUP_CODE.INFO, MERCHANT.NAME)"
								@update:model-value="(v) => setMerchantValue(GROUP_CODE.INFO, MERCHANT.NAME, v)"
							/>
						</UFormField>
						<UFormField :label="$t('pages.storeProfilePage.companyEmail')">
							<UInput
								type="email"
								:model-value="getMerchantValue(GROUP_CODE.INFO, MERCHANT.COMPANY_EMAIL_ADDRESS)"
								@update:model-value="(v) => setMerchantValue(GROUP_CODE.INFO, MERCHANT.COMPANY_EMAIL_ADDRESS, v)"
							/>
						</UFormField>
						<UFormField :label="$t('pages.storeProfilePage.companyWebsite')" class="sm:col-span-2">
							<UInput
								:model-value="getMerchantValue(GROUP_CODE.INFO, MERCHANT.COMPANY_WEBSITE)"
								@update:model-value="(v) => setMerchantValue(GROUP_CODE.INFO, MERCHANT.COMPANY_WEBSITE, v)"
							/>
						</UFormField>
						<UFormField :label="$t('pages.storeProfilePage.contactPerson')">
							<UInput
								:model-value="getMerchantValue(GROUP_CODE.CONTACT, MERCHANT.CONTACT_PERSON)"
								@update:model-value="(v) => setMerchantValue(GROUP_CODE.CONTACT, MERCHANT.CONTACT_PERSON, v)"
							/>
						</UFormField>
						<UFormField :label="$t('pages.storeProfilePage.contactNo')">
							<ZPhoneInput
								:dial-code="getMerchantValue(GROUP_CODE.CONTACT, MERCHANT.DIAL_CODE)"
								:phone-no="getMerchantValue(GROUP_CODE.CONTACT, MERCHANT.PHONE_NO)"
								@update:dial-code="(v: string) => setMerchantValue(GROUP_CODE.CONTACT, MERCHANT.DIAL_CODE, v)"
								@update:phone-no="(v: string) => setMerchantValue(GROUP_CODE.CONTACT, MERCHANT.PHONE_NO, v)"
							/>
						</UFormField>
					</div>

					<!-- Address -->
					<div class="space-y-4">
						<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300">{{ $t('common.address') }}</h4>
						<div class="grid gap-4 sm:grid-cols-2">
							<UFormField :label="$t('pages.storeProfilePage.addressLine1')">
								<UInput
									:model-value="getMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS1)"
									@update:model-value="(v) => setMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS1, v)"
								/>
							</UFormField>
							<UFormField :label="$t('pages.storeProfilePage.addressLine2')">
								<UInput
									:model-value="getMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS2)"
									@update:model-value="(v) => setMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS2, v)"
								/>
							</UFormField>
							<UFormField :label="$t('pages.storeProfilePage.addressLine3')">
								<UInput
									:model-value="getMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS3)"
									@update:model-value="(v) => setMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS3, v)"
								/>
							</UFormField>
							<UFormField :label="$t('pages.storeProfilePage.city')">
								<UInput
									:model-value="getMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS_CITY)"
									@update:model-value="(v) => setMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS_CITY, v)"
								/>
							</UFormField>
							<div class="col-span-full grid grid-cols-1 gap-4 md:grid-cols-3">
								<UFormField :label="$t('pages.storeProfilePage.postalCode')">
									<UInput
										:model-value="getMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS_POSTAL_CODE)"
										@update:model-value="(v) => setMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS_POSTAL_CODE, v)"
									/>
								</UFormField>
								<UFormField :label="$t('pages.storeProfilePage.state')">
									<ZSelectMenuState
										:state-name="getMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS_STATE)"
										@update:state-name="(v: string) => setMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS_STATE, v)"
									/>
								</UFormField>
								<UFormField :label="$t('pages.storeProfilePage.country')">
									<ZSelectMenuCountry :country="addressCountry" @update:country="onAddressCountry" />
								</UFormField>
							</div>
						</div>
					</div>

					<ZFormStoreOperatingHours
						:off-days="operationOffDaysArray"
						:start-time="getMerchantValue(GROUP_CODE.INFO, MERCHANT.OPERATION_START_TIME) || null"
						:end-time="getMerchantValue(GROUP_CODE.INFO, MERCHANT.OPERATION_END_TIME) || null"
						:time-select-title="$t('components.zInput.selectTime')"
						@update:off-days="onOperationOffDaysUpdate"
						@update:start-time="(v: string) => setMerchantValue(GROUP_CODE.INFO, MERCHANT.OPERATION_START_TIME, v)"
						@update:end-time="(v: string) => setMerchantValue(GROUP_CODE.INFO, MERCHANT.OPERATION_END_TIME, v)"
					/>
				</div>
			</UCard>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalLoading } from '#components';
import { getFormattedDate, GROUP_CODE, MERCHANT, Package } from 'yeppi-common';
import { useDataStore } from '~/stores/Data/Data';
import type { Country } from '~/utils/types/country';
import { ICONS } from '~/utils/icons';
import { accountTypeLabel } from '~/utils/options/account-type';

definePageMeta({ ssr: false });

const { t } = useI18n();
useHead({ title: () => `${t('common.appName')} - ${t('nav.storeProfile')}` });

const overlay = useOverlay();
const merchantInfoStore = useMerchantInfoStore();
const dataStore = useDataStore();
const loadingModal = overlay.create(ZModalLoading, { props: { key: 'loading' } });

const { updatedInfo, updating, merchant } = storeToRefs(merchantInfoStore);

/** Shown until the merchant info request has finished (same as `merchantInfoStore.loading` after `getMerchantInfos`). */
const isPageContentReady = ref(false);

onMounted(() => {
	watch(
		() => merchantInfoStore.loading,
		(loading) => {
			if (!loading) isPageContentReady.value = true;
		},
		{ immediate: true },
	);
	if (dataStore.countries.length === 0) {
		void dataStore.getCountries();
	}
});

const isDirty = computed(() => updatedInfo.value.length > 0);

const hideStore = computed(() => merchantInfoStore.isStoreHidden);

const onHideStoreChange = async (value: boolean) => {
	try {
		await merchantInfoStore.setHideStore(value);
	} catch {
		// notification handled in store
	}
};

const thumbnailDropzoneKey = ref(0);

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

useLeavePageGuard(isDirty, {
	onLeave: () => merchantInfoStore.clearUpdatedInfo(),
});

const onCancel = () => {
	merchantInfoStore.clearUpdatedInfo();
};

const onSave = async () => {
	await merchantInfoStore.updateMerchantInfo();
};

const getMerchantValue = (groupCode: string, setCode: string): string => {
	const updated = updatedInfo.value.find((s) => s.group_code === groupCode && s.set_code === setCode);
	if (updated) return updated.set_value ?? '';
	return merchantInfoStore.getMerchantInfo(groupCode, setCode)?.getString() ?? '';
};

const setMerchantValue = (groupCode: string, setCode: string, value: string) => {
	merchantInfoStore.addToUpdatedInfo({
		group_code: groupCode,
		set_code: setCode,
		set_value: value ?? '',
	});
};

const addressCountry = computed((): Country | undefined => {
	const iso2 = getMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS_COUNTRY)?.trim();
	if (!iso2) return undefined;
	return dataStore.countries.find((c) => c.iso2 === iso2);
});

const onAddressCountry = (c: Country | undefined) => {
	const prevIso2 = getMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS_COUNTRY);
	const nextIso2 = c?.iso2 ?? '';
	setMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS_COUNTRY, nextIso2);
	if (nextIso2 !== prevIso2) {
		setMerchantValue(GROUP_CODE.ADDRESS, MERCHANT.ADDRESS_STATE, '');
	}
};

/** Off days from merchant info (OPERATION_OFF_DAYS) as comma-separated "Mon, Tue, Wed". */
const operationOffDaysArray = computed(() => {
	const raw = getMerchantValue(GROUP_CODE.INFO, MERCHANT.OPERATION_OFF_DAYS);
	if (!raw?.trim()) return [];
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
});

const onOperationOffDaysUpdate = (days: string[]) => {
	setMerchantValue(GROUP_CODE.INFO, MERCHANT.OPERATION_OFF_DAYS, days.length ? days.join(', ') : '');
};

const thumbnailExistingImages = computed(() => {
	const url = merchant.value.find((m) => m.group_code === GROUP_CODE.INFO && m.set_code === MERCHANT.THUMBNAIL)?.getString();
	return url ? [url] : [];
});

const onThumbnailFilesSelected = async (selectedFiles: File[]) => {
	const file = selectedFiles[0];
	if (!file) return;

	await merchantInfoStore.updateMerchantThumbnail(file);
	thumbnailDropzoneKey.value += 1;
};

const onThumbnailDelete = () => {
	setMerchantValue(GROUP_CODE.INFO, MERCHANT.THUMBNAIL, '');
};

const merchantId = computed(() => merchantInfoStore.getMerchantInfo(GROUP_CODE.INFO, MERCHANT.ID)?.getString() ?? '—');
const accountTypeRaw = computed(() => merchantInfoStore.getMerchantInfo(GROUP_CODE.INFO, MERCHANT.PACKAGE)?.getString()?.toLowerCase() ?? '');
const accountType = computed<string>(() => accountTypeLabel(accountTypeRaw.value as Package, t) ?? '—');

const accountTypeBadgeColor = computed(() => {
	const v = accountTypeRaw.value;
	if (v === Package.SELLER) return 'neutral';
	if (v === Package.ORGANIZER) return 'primary';
	if (v === Package.VIP) return 'success';
	return 'neutral';
});
const accountTypeCardBg = computed(() => {
	const c = accountTypeBadgeColor.value;
	if (c === 'primary') return 'border-primary-200/50 bg-primary-50/80 dark:border-primary-800/50 dark:bg-primary-950/40';
	if (c === 'success') return 'border-green-200/50 bg-green-50/80 dark:border-green-800/50 dark:bg-green-950/40';
	return 'border-gray-200/60 bg-gray-50/80 dark:border-gray-700/50 dark:bg-gray-800/60';
});
const accountTypeTextClass = computed(() => {
	const c = accountTypeBadgeColor.value;
	if (c === 'primary') return 'text-primary-700 dark:text-primary-300';
	if (c === 'success') return 'text-green-700 dark:text-green-300';
	return 'text-gray-700 dark:text-gray-300';
});

const merchantExpiredDateRaw = computed(() => merchantInfoStore.getMerchantInfo(GROUP_CODE.INFO, MERCHANT.EXPIRED_DATE)?.getString() ?? '');
const merchantExpiredDate = computed(() => {
	const date = merchantExpiredDateRaw.value;
	return date ? getFormattedDate(new Date(date), 'MMM dd, yyyy') : '—';
});
const isExpiringSoon = computed(() => {
	const dateStr = merchantExpiredDateRaw.value;
	if (!dateStr) return false;
	const expired = new Date(dateStr);
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	expired.setHours(0, 0, 0, 0);
	const msPerDay = 24 * 60 * 60 * 1000;
	const daysUntil = Math.round((expired.getTime() - today.getTime()) / msPerDay);
	return daysUntil <= 30;
});
const expiredDateCardBg = computed(() =>
	isExpiringSoon.value
		? 'border-red-200/50 bg-red-50/80 dark:border-red-800/50 dark:bg-red-950/40'
		: 'border-gray-200/60 bg-gray-50/80 dark:border-gray-700/50 dark:bg-gray-800/60',
);

const accountStatusRaw = computed(() => merchantInfoStore.getMerchantInfo(GROUP_CODE.INFO, MERCHANT.ACCOUNT_STATUS)?.getString()?.toLowerCase() ?? '');
const accountStatusLabel = computed(() => {
	const v = accountStatusRaw.value;
	if (!v) return '—';
	return v.charAt(0).toUpperCase() + v.slice(1);
});
const accountStatusBadgeColor = computed(() => {
	const v = accountStatusRaw.value;
	if (v === 'new') return 'info';
	if (v === 'active') return 'success';
	if (v === 'inactive') return 'neutral';
	if (v === 'expired') return 'error';
	return 'neutral';
});
const accountStatusCardBg = computed(() => {
	const c = accountStatusBadgeColor.value;
	if (c === 'info') return 'border-blue-200/50 bg-blue-50/80 dark:border-blue-800/50 dark:bg-blue-950/40';
	if (c === 'success') return 'border-green-200/50 bg-green-50/80 dark:border-green-800/50 dark:bg-green-950/40';
	if (c === 'error') return 'border-red-200/50 bg-red-50/80 dark:border-red-800/50 dark:bg-red-950/40';
	return 'border-gray-200/60 bg-gray-50/80 dark:border-gray-700/50 dark:bg-gray-800/60';
});
const accountStatusTextClass = computed(() => {
	const c = accountStatusBadgeColor.value;
	if (c === 'info') return 'text-blue-700 dark:text-blue-300';
	if (c === 'success') return 'text-green-700 dark:text-green-300';
	if (c === 'error') return 'text-red-700 dark:text-red-300';
	return 'text-gray-700 dark:text-gray-300';
});
</script>

<style scoped></style>
