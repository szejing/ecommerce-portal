<template>
	<UModal
		:title="t('platformMerchants.edit')"
		:description="t('platformMerchants.editDescription')"
		:content="{ onCloseAutoFocus: preventCloseAutoFocus }"
		:close="{ onClick: () => emit('close') }"
		:ui="{
			content: 'w-full sm:max-w-[92%] md:max-w-[520px] lg:max-w-[560px]',
			body: 'max-h-[min(70vh,560px)] overflow-y-auto',
			footer: 'justify-end gap-2',
		}"
	>
		<template #body>
			<form class="space-y-1" @submit.prevent="onSubmit">
				<ZInputBasicPlatformMerchantInfo :state="form" mode="edit" :merchant-id="merchant.merchant_id" :merchant-name="merchant.name" />
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
import type { PlatformMerchantRow } from '~/repository/modules/platform-merchant/models/response/platform-merchant.resp';
import { EXTEND_DURATION_NONE, type PlatformMerchantEditForm } from '~/utils/platform-merchant-update';
import type { BasicPlatformMerchantInfoState } from '~/components/Z/Input/BasicPlatformMerchantInfo.vue';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const props = defineProps<{
	merchant: PlatformMerchantRow;
}>();

const emit = defineEmits<{
	update: [payload: PlatformMerchantEditForm];
	cancel: [];
	close: [];
}>();

const loading = ref(false);
const expiry = props.merchant.expiry_date ? new Date(props.merchant.expiry_date) : null;

const form = reactive<BasicPlatformMerchantInfoState>({
	package: props.merchant.package,
	account: props.merchant.account,
	hide_store: props.merchant.hide_store,
	extend_duration: EXTEND_DURATION_NONE,
	expiry_date: expiry && !Number.isNaN(expiry.getTime()) ? expiry.toISOString().slice(0, 10) : '',
});

/** Stop Dialog from restoring focus to the UTable row (tabindex=0) that opened us. */
const preventCloseAutoFocus = (event: Event) => {
	event.preventDefault();
};

const onSubmit = async () => {
	if (loading.value) return;
	loading.value = true;
	try {
		emit('update', {
			package: form.package,
			account: form.account,
			hide_store: form.hide_store ?? true,
			extend_duration: form.extend_duration ?? EXTEND_DURATION_NONE,
			expiry_date: form.expiry_date ?? '',
		});
	} finally {
		loading.value = false;
	}
};

const onCancel = () => {
	emit('cancel');
};
</script>
