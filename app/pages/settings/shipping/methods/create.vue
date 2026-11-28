<template>
	<ZPagePanel id="shipping-method-create" :title="t('pages.createShippingMethodTitle')" back-to="/settings/shipping/methods" grow>
		<div class="mobile-form-controls container mx-auto w-full min-w-0">
			<FormShippingMethodCreation ref="formRef" @saved="onSaved" />
		</div>

		<template #footer>
			<div class="w-full backdrop-blur-sm border-t border-neutral-200 dark:border-neutral-800 shadow-md z-50">
				<div class="mx-auto px-3 py-2 sm:px-6 md:py-4">
					<div class="hidden md:flex justify-end items-center gap-3">
						<UButton color="neutral" variant="outline" size="lg" @click="goBack">{{ t('common.cancel') }}</UButton>
						<UButton color="success" variant="solid" size="lg" :loading="adding" @click="onSubmit">
							<UIcon :name="ICONS.CHECK_ROUNDED" />
							{{ t('pages.createShippingMethodButton') }}
						</UButton>
					</div>
					<div class="flex flex-wrap items-center gap-2 md:hidden">
						<UButton color="neutral" variant="outline" size="sm" class="flex-1 justify-center" @click="goBack">
							<span class="text-xs">{{ t('common.cancel') }}</span>
						</UButton>
						<UButton color="success" size="md" class="flex-1 justify-center" :loading="adding" @click="onSubmit">
							<UIcon :name="ICONS.CHECK_ROUNDED" class="w-4 h-4" />
							<span class="text-sm">{{ t('pages.createShippingMethodButton') }}</span>
						</UButton>
					</div>
				</div>
			</div>
		</template>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';
import type { ShippingMethodOption } from '~/utils/types/order-fulfillment-shipping';

const { t } = useI18n();
const shippingStore = useShippingMethodStore();
const { adding } = storeToRefs(shippingStore);
const formRef = ref<{ submit: () => void } | null>(null);

useHead({ title: () => t('pages.createShippingMethodPageTitle') });

const onSubmit = () => {
	formRef.value?.submit();
};

const goBack = () => {
	useRouter().back();
};

const onSaved = async (_method: ShippingMethodOption | undefined) => {
	await navigateTo('/settings/shipping/methods');
};
</script>

<style scoped></style>
