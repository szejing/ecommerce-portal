<template>
	<UModal
		:title="t('platformMerchants.create')"
		:ui="{
			content: 'w-full sm:max-w-[90%] md:max-w-[70%] lg:max-w-[56%]',
		}"
	>
		<template #body>
			<form class="space-y-3" @submit.prevent="onSubmit">
				<div class="grid gap-3 sm:grid-cols-2">
					<UFormField :label="t('form.name')" required>
						<UInput v-model="form.name" />
					</UFormField>
					<UFormField :label="t('platformMerchants.package')" required>
						<USelect v-model="form.package" :items="packageOptions" />
					</UFormField>
					<UFormField :label="t('platformMerchants.duration')" required>
						<USelect v-model="form.duration" :items="durationOptions" value-key="value" />
					</UFormField>
					<UFormField :label="t('platformMerchants.account')" required>
						<USelect v-model="form.account" :items="accountOptions" />
					</UFormField>
					<UFormField :label="t('platformMerchants.joinedDate')" required>
						<UInput v-model="form.joined_date" type="date" />
					</UFormField>
					<UFormField :label="t('platformMerchants.companyName')" required>
						<UInput v-model="form.company_name" />
					</UFormField>
					<UFormField :label="t('platformMerchants.companySsm')" required>
						<UInput v-model="form.company_ssm" />
					</UFormField>
					<UFormField :label="t('platformMerchants.companyEmail')" required>
						<UInput v-model="form.company_email" type="email" />
					</UFormField>
					<UFormField :label="t('platformMerchants.contactPerson')" required>
						<UInput v-model="form.company_contact_person" />
					</UFormField>
					<UFormField :label="t('platformMerchants.dialCode')" required>
						<UInput v-model="form.company_dial_code" />
					</UFormField>
					<UFormField :label="t('platformMerchants.phone')" required>
						<UInput v-model="form.company_phone_no" />
					</UFormField>
					<UFormField :label="t('platformMerchants.address1')" required class="sm:col-span-2">
						<UInput v-model="form.company_address1" />
					</UFormField>
					<UFormField :label="t('platformMerchants.city')" required>
						<UInput v-model="form.company_city" />
					</UFormField>
					<UFormField :label="t('platformMerchants.state')" required>
						<UInput v-model="form.company_state" />
					</UFormField>
					<UFormField :label="t('platformMerchants.country')" required>
						<UInput v-model="form.company_country" />
					</UFormField>
					<UFormField :label="t('platformMerchants.postalCode')" required>
						<UInput v-model="form.company_postal_code" />
					</UFormField>
				</div>
			</form>
		</template>

		<template #footer>
			<div class="flex justify-end gap-2 w-full">
				<UButton color="neutral" variant="soft" :disabled="loading" @click="onCancel">
					{{ t('common.cancel') }}
				</UButton>
				<UButton color="primary" :loading="loading" @click="onSubmit">
					{{ t('common.save') }}
				</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import { AccountStatus, Package, SubsDuration } from 'yeppi-common';
import type { CreatePlatformMerchantReq } from '~/repository/modules/platform-merchant/models/request/create-platform-merchant.req';

const { t } = useI18n();

const emit = defineEmits<{
	create: [payload: CreatePlatformMerchantReq];
	cancel: [];
}>();

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

const loading = ref(false);

const form = reactive<CreatePlatformMerchantReq>({
	name: '',
	package: Package.ECOMMERCE,
	duration: SubsDuration.ONE_YEAR,
	joined_date: new Date().toISOString().slice(0, 10),
	account: AccountStatus.NEW,
	company_name: '',
	company_ssm: '',
	company_email: '',
	company_contact_person: '',
	company_phone_no: '',
	company_dial_code: '60',
	company_address1: '',
	company_city: '',
	company_state: '',
	company_country: 'MY',
	company_postal_code: '',
});

const onSubmit = async () => {
	if (loading.value) return;
	loading.value = true;
	try {
		emit('create', { ...form });
	} finally {
		loading.value = false;
	}
};

const onCancel = () => {
	emit('cancel');
};
</script>
