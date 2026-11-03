<template>
	<UModal
		:title="t('platformMerchants.edit')"
		:ui="{
			content: 'w-full sm:max-w-[90%] md:max-w-[50%] lg:max-w-[40%]',
		}"
	>
		<template #body>
			<form class="space-y-3" @submit.prevent="onSubmit">
				<p class="text-sm font-medium">
					{{ merchant.merchant_id }} · {{ merchant.name }}
				</p>
				<div class="grid gap-3 sm:grid-cols-2">
					<UFormField :label="t('platformMerchants.package')">
						<USelect v-model="form.package" :items="packageOptions" />
					</UFormField>
					<UFormField :label="t('platformMerchants.account')">
						<USelect v-model="form.account" :items="accountOptions" />
					</UFormField>
					<UFormField :label="t('platformMerchants.expiryDate')">
						<UInput v-model="form.expiry_date" type="date" />
					</UFormField>
					<UFormField :label="t('platformMerchants.extendBy')">
						<USelect v-model="form.extend_duration" :items="extendOptions" value-key="value" />
					</UFormField>
					<UFormField :label="t('platformMerchants.hiddenStore')" class="sm:col-span-2">
						<UCheckbox v-model="form.hide_store" :label="t('platformMerchants.hideStoreLabel')" />
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
import type { PlatformMerchantRow } from '~/repository/modules/platform-merchant/models/response/platform-merchant.resp';
import type { PlatformMerchantEditForm } from '~/utils/platform-merchant-update';

const { t } = useI18n();

const props = defineProps<{
	merchant: PlatformMerchantRow;
}>();

const emit = defineEmits<{
	update: [payload: PlatformMerchantEditForm];
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
const extendOptions = computed(() => [
	{ label: t('platformMerchants.extendNone'), value: '' },
	...durationOptions.value,
]);

const loading = ref(false);
const expiry = props.merchant.expiry_date ? new Date(props.merchant.expiry_date) : null;

const form = reactive<PlatformMerchantEditForm>({
	package: props.merchant.package,
	account: props.merchant.account,
	hide_store: props.merchant.hide_store,
	extend_duration: '',
	expiry_date: expiry && !Number.isNaN(expiry.getTime()) ? expiry.toISOString().slice(0, 10) : '',
});

const onSubmit = async () => {
	if (loading.value) return;
	loading.value = true;
	try {
		emit('update', { ...form });
	} finally {
		loading.value = false;
	}
};

const onCancel = () => {
	emit('cancel');
};
</script>
