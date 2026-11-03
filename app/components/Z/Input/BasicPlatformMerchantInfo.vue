<template>
	<div class="space-y-6">
		<!-- Edit: identity strip -->
		<div
			v-if="isEdit && (merchantId || merchantName)"
			class="flex flex-wrap items-center gap-2 rounded-lg border border-default bg-elevated/60 px-3 py-2.5"
		>
			<UBadge color="neutral" variant="subtle" class="font-mono text-xs">
				{{ merchantId }}
			</UBadge>
			<span class="text-sm font-semibold text-highlighted truncate">{{ merchantName }}</span>
		</div>

		<!-- Store -->
		<section v-if="isCreate" class="space-y-3">
			<div class="flex items-center gap-2">
				<UIcon :name="ICONS.OUTLET" class="size-5 text-primary shrink-0" aria-hidden="true" />
				<div class="min-w-0">
					<h3 class="text-sm font-semibold text-highlighted">{{ t('platformMerchants.sectionStore') }}</h3>
					<p class="text-xs text-muted">{{ t('platformMerchants.sectionStoreHint') }}</p>
				</div>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<UFormField :label="t('form.name')" required class="sm:col-span-2">
					<UInput v-model="state.name" :placeholder="t('platformMerchants.namePlaceholder')" icon="i-lucide-store" />
				</UFormField>
			</div>
		</section>

		<!-- Subscription -->
		<section class="space-y-3">
			<div class="flex items-center gap-2">
				<UIcon :name="ICONS.LAYERS" class="size-5 text-primary shrink-0" aria-hidden="true" />
				<div class="min-w-0">
					<h3 class="text-sm font-semibold text-highlighted">{{ t('platformMerchants.sectionSubscription') }}</h3>
					<p class="text-xs text-muted">{{ t('platformMerchants.sectionSubscriptionHint') }}</p>
				</div>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<UFormField :label="t('platformMerchants.package')" :required="isCreate">
					<USelect v-model="state.package" :items="packageOptions" />
				</UFormField>
				<UFormField :label="t('platformMerchants.account')" :required="isCreate">
					<USelect v-model="state.account" :items="accountOptions" />
				</UFormField>
				<template v-if="isCreate">
					<UFormField :label="t('platformMerchants.duration')" required>
						<USelect v-model="state.duration" :items="durationOptions" value-key="value" />
					</UFormField>
					<UFormField :label="t('platformMerchants.joinedDate')" required>
						<UInput v-model="state.joined_date" type="date" icon="i-lucide-calendar" />
					</UFormField>
				</template>
				<template v-else>
					<UFormField :label="t('platformMerchants.expiryDate')">
						<UInput v-model="state.expiry_date" type="date" icon="i-lucide-calendar" />
					</UFormField>
					<UFormField :label="t('platformMerchants.extendBy')">
						<p class="text-xs text-muted mb-1">{{ t('platformMerchants.extendByHint') }}</p>
						<USelect v-model="state.extend_duration" :items="extendOptions" value-key="value" />
					</UFormField>
				</template>
			</div>
		</section>

		<!-- Visibility (edit) -->
		<section v-if="isEdit" class="space-y-3">
			<div class="flex items-center gap-2">
				<UIcon :name="ICONS.EYE" class="size-5 text-primary shrink-0" aria-hidden="true" />
				<div class="min-w-0">
					<h3 class="text-sm font-semibold text-highlighted">{{ t('platformMerchants.sectionVisibility') }}</h3>
					<p class="text-xs text-muted">{{ t('platformMerchants.sectionVisibilityHint') }}</p>
				</div>
			</div>
			<div class="rounded-lg border border-default bg-slate-50 dark:bg-slate-900/40 px-3 py-3">
				<UCheckbox v-model="state.hide_store" :label="t('platformMerchants.hideStoreLabel')" />
			</div>
		</section>

		<!-- Company (create) -->
		<section v-if="isCreate" class="space-y-3">
			<div class="flex items-center gap-2">
				<UIcon :name="ICONS.DOCUMENT" class="size-5 text-primary shrink-0" aria-hidden="true" />
				<div class="min-w-0">
					<h3 class="text-sm font-semibold text-highlighted">{{ t('platformMerchants.sectionCompany') }}</h3>
					<p class="text-xs text-muted">{{ t('platformMerchants.sectionCompanyHint') }}</p>
				</div>
			</div>
			<div class="grid gap-3 sm:grid-cols-2">
				<UFormField :label="t('platformMerchants.companyName')" required>
					<UInput v-model="state.company_name" />
				</UFormField>
				<UFormField :label="t('platformMerchants.companySsm')" required>
					<UInput v-model="state.company_ssm" />
				</UFormField>
				<UFormField :label="t('platformMerchants.companyEmail')" required>
					<UInput v-model="state.company_email" type="email" icon="i-lucide-mail" />
				</UFormField>
				<UFormField :label="t('platformMerchants.contactPerson')" required>
					<UInput v-model="state.company_contact_person" icon="i-lucide-user" />
				</UFormField>
				<UFormField :label="t('platformMerchants.dialCode')" required>
					<UInput v-model="state.company_dial_code" />
				</UFormField>
				<UFormField :label="t('platformMerchants.phone')" required>
					<UInput v-model="state.company_phone_no" icon="i-lucide-phone" />
				</UFormField>
				<UFormField :label="t('platformMerchants.address1')" required class="sm:col-span-2">
					<UInput v-model="state.company_address1" icon="i-lucide-map-pin" />
				</UFormField>
				<UFormField :label="t('platformMerchants.city')" required>
					<UInput v-model="state.company_city" />
				</UFormField>
				<UFormField :label="t('platformMerchants.state')" required>
					<UInput v-model="state.company_state" />
				</UFormField>
				<UFormField :label="t('platformMerchants.country')" required>
					<UInput v-model="state.company_country" />
				</UFormField>
				<UFormField :label="t('platformMerchants.postalCode')" required>
					<UInput v-model="state.company_postal_code" />
				</UFormField>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import { AccountStatus, Package, SubsDuration } from 'yeppi-common';
import { ICONS } from '~/utils/icons';
import { EXTEND_DURATION_NONE, type PlatformMerchantExtendDuration } from '~/utils/platform-merchant-update';

export type BasicPlatformMerchantInfoState = {
	name?: string;
	package: Package;
	account: AccountStatus;
	duration?: SubsDuration;
	joined_date?: string;
	company_name?: string;
	company_ssm?: string;
	company_email?: string;
	company_contact_person?: string;
	company_phone_no?: string;
	company_dial_code?: string;
	company_address1?: string;
	company_city?: string;
	company_state?: string;
	company_country?: string;
	company_postal_code?: string;
	expiry_date?: string;
	extend_duration?: PlatformMerchantExtendDuration;
	hide_store?: boolean;
};

const props = withDefaults(
	defineProps<{
		state: BasicPlatformMerchantInfoState;
		mode?: 'create' | 'edit';
		merchantId?: string;
		merchantName?: string;
	}>(),
	{
		mode: 'create',
		merchantId: undefined,
		merchantName: undefined,
	},
);

const { t } = useI18n();
const state = toRef(props, 'state');

const isCreate = computed(() => props.mode === 'create');
const isEdit = computed(() => props.mode === 'edit');

const packageOptions = Object.values(Package).map((value) => ({ label: value, value }));
const accountOptions = Object.values(AccountStatus).map((value) => ({ label: value, value }));
const durationOptions = computed(() => [
	{ label: t('platformMerchants.durationOneMonth'), value: SubsDuration.ONE_MONTH },
	{ label: t('platformMerchants.durationThreeMonths'), value: SubsDuration.THREE_MONTHS },
	{ label: t('platformMerchants.durationSixMonths'), value: SubsDuration.SIX_MONTHS },
	{ label: t('platformMerchants.durationNineMonths'), value: SubsDuration.NINE_MONTHS },
	{ label: t('platformMerchants.durationOneYear'), value: SubsDuration.ONE_YEAR },
	{ label: t('platformMerchants.durationLifetime'), value: SubsDuration.LIFETIME },
]);
const extendOptions = computed(() => [
	{ label: t('platformMerchants.extendNone'), value: EXTEND_DURATION_NONE },
	...durationOptions.value,
]);
</script>
