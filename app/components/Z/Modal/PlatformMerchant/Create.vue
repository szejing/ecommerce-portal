<template>
	<UModal
		:title="t('platformMerchants.create')"
		:description="t('platformMerchants.createDescription')"
		:content="{ onCloseAutoFocus: preventCloseAutoFocus }"
		:close="{ onClick: () => emit('close') }"
		:ui="{
			content: 'w-full sm:max-w-[92%] md:max-w-[720px] lg:max-w-[780px]',
			body: 'max-h-[min(70vh,640px)] overflow-y-auto',
			footer: 'justify-end gap-2',
		}"
	>
		<template #body>
			<form class="space-y-1" @submit.prevent="onSubmit">
				<ZInputBasicPlatformMerchantInfo :state="form" mode="create" />
			</form>
		</template>

		<template #footer>
			<UButton color="neutral" variant="soft" :disabled="loading" @click="onCancel">
				{{ t('common.cancel') }}
			</UButton>
			<UButton color="primary" :icon="ICONS.SAVE" :loading="loading" @click="onSubmit">
				{{ t('common.save') }}
			</UButton>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import { AccountStatus, Package, SubsDuration } from 'yeppi-common';
import type { CreatePlatformMerchantReq } from '~/repository/modules/platform-merchant/models/request/create-platform-merchant.req';
import type { BasicPlatformMerchantInfoState } from '~/components/Z/Input/BasicPlatformMerchantInfo.vue';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const emit = defineEmits<{
	create: [payload: CreatePlatformMerchantReq];
	cancel: [];
	close: [];
}>();

const loading = ref(false);

const form = reactive<BasicPlatformMerchantInfoState>({
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

const preventCloseAutoFocus = (event: Event) => {
	event.preventDefault();
};

const onSubmit = async () => {
	if (loading.value) return;
	loading.value = true;
	try {
		emit('create', { ...form } as CreatePlatformMerchantReq);
	} finally {
		loading.value = false;
	}
};

const onCancel = () => {
	emit('cancel');
};
</script>
