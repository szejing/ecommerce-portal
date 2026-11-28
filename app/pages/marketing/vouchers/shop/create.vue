<template>
	<ZPagePanel id="vouchers-shop-create" :title="t('pages.createShopVoucher')" back-to="/marketing/vouchers/shop" grow>
		<div class="container w-full mx-auto">
			<FormVoucherCreation ref="formRef" :allocation="AllocationType.BILL" post-create-list-path="/marketing/vouchers/shop" />
		</div>

		<template #footer>
			<div class="w-full backdrop-blur-sm border-t border-neutral-200 dark:border-neutral-800 shadow-md z-50">
				<div class="mx-auto px-3 py-2 sm:px-6 md:py-4">
					<div class="hidden md:flex justify-end items-center gap-3">
						<UButton color="neutral" variant="outline" size="lg" @click="goBack">{{ t('common.cancel') }}</UButton>
						<UButton color="success" variant="solid" size="lg" :loading="adding" @click="onSubmit">
							<UIcon :name="ICONS.CHECK_ROUNDED" />
							{{ t('components.voucherForm.createVoucher') }}
						</UButton>
					</div>
					<div class="grid grid-cols-[1fr_2fr] gap-2 md:hidden">
						<UButton color="neutral" variant="outline" class="min-w-0 justify-center" @click="goBack">
							{{ t('common.cancel') }}
						</UButton>
						<UButton color="success" class="min-w-0 justify-center" :loading="adding" @click="onSubmit">
							{{ t('components.voucherForm.createVoucher') }}
						</UButton>
					</div>
				</div>
			</div>
		</template>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { AllocationType } from 'yeppi-common';
import { ICONS } from '~/utils/icons';
import { isVoucherCreateDraftDirty } from '~/utils/voucher/form-dirty';

const { t } = useI18n();
useHead({ title: () => t('pages.createShopVoucher') });
const router = useRouter();

const voucherStore = useVoucherStore();
const discountStore = useDiscountStore();
const { adding, new_voucher } = storeToRefs(voucherStore);
const { new_discount } = storeToRefs(discountStore);
const formRef = ref<{ submit: () => void } | null>(null);

const isDirty = computed(() => isVoucherCreateDraftDirty(new_voucher.value, new_discount.value));

useLeavePageGuard(isDirty, {
	onLeave: () => {
		voucherStore.resetNewVoucher();
		discountStore.resetNewDiscount();
	},
});

const onSubmit = () => {
	formRef.value?.submit();
};

const goBack = () => {
	router.back();
};
</script>

<style scoped></style>
