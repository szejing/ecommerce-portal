<template>
	<ZPagePanel id="vouchers-product-create" :title="t('pages.createProductVoucher')" back-to="/marketing/vouchers/product" grow>
		<div class="container w-full mx-auto">
			<FormVoucherCreation ref="formRef" :allocation="AllocationType.ITEM" post-create-list-path="/marketing/vouchers/product" />
		</div>

		<template #footer>
			<div class="w-full backdrop-blur-sm border-t border-neutral-200 dark:border-neutral-800 shadow-md z-50">
				<div class="mx-auto px-4 sm:px-6 py-4">
					<div class="hidden md:flex justify-end items-center gap-3">
						<UButton color="neutral" variant="outline" size="lg" @click="goBack">{{ t('common.cancel') }}</UButton>
						<UButton color="success" variant="solid" size="lg" :loading="adding" @click="onSubmit">
							<UIcon :name="ICONS.CHECK_ROUNDED" />
							{{ t('components.voucherForm.createVoucher') }}
						</UButton>
					</div>
					<div class="md:hidden flex flex-col gap-2">
						<UButton color="success" size="md" class="w-full" :loading="adding" @click="onSubmit">
							<UIcon :name="ICONS.CHECK_ROUNDED" class="w-4 h-4" />
							<span class="text-sm">{{ t('components.voucherForm.createVoucher') }}</span>
						</UButton>
						<UButton color="neutral" variant="outline" size="sm" class="w-full" @click="goBack">
							<span class="text-xs">{{ t('common.cancel') }}</span>
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

const { t } = useI18n();

useHead({ title: () => t('pages.createProductVoucher') });
const router = useRouter();

const voucherStore = useVoucherStore();
const discountStore = useDiscountStore();
const { adding, new_voucher } = storeToRefs(voucherStore);
const { new_discount } = storeToRefs(discountStore);
const formRef = ref<{ submit: () => void } | null>(null);

const isDirty = computed(() => {
	const v = new_voucher.value;
	const vDirty = !!(v.code?.trim() || v.description?.trim() || v.discount_code?.trim());
	const d = new_discount.value;
	const dDirty = !!(d.description?.trim() || (d.conditions?.length ?? 0) > 0 || d.usage_limit != null);
	return vDirty || dDirty;
});

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
