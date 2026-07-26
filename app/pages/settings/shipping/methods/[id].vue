<template>
	<ZPagePanel id="shipping-method-edit" :title="panelTitle" back-to="/settings/shipping/methods" grow>
		<div class="container w-full mx-auto">
			<FormShippingMethodUpdateLoading v-if="isLoading" />
			<FormShippingMethodUpdate
				v-else-if="detailMethod"
				:key="detailMethod.id"
				ref="formRef"
				:method-id="detailMethod.id"
				:initial-method="detailMethod"
				@saved="onSaved"
			/>
		</div>

		<template #footer>
			<div v-if="detailMethod" class="w-full backdrop-blur-sm border-t border-neutral-200 dark:border-neutral-800 shadow-md z-50">
				<div class="mx-auto px-4 sm:px-6 py-4">
					<div class="hidden md:flex justify-between items-center gap-3">
						<UButton color="error" variant="ghost" size="lg" :loading="removing" @click="confirmDelete">
							<UIcon :name="ICONS.TRASH" />
							{{ t('common.delete') }}
						</UButton>
						<div class="flex gap-3">
							<UButton color="neutral" variant="outline" size="lg" @click="goBack">{{ t('common.cancel') }}</UButton>
							<UButton color="success" variant="solid" size="lg" :loading="updating" @click="onSubmit">
								<UIcon :name="ICONS.CHECK_ROUNDED" />
								{{ t('common.save') }}
							</UButton>
						</div>
					</div>
					<div class="md:hidden flex flex-col gap-2">
						<UButton color="success" size="md" class="w-full" :loading="updating" @click="onSubmit">
							<UIcon :name="ICONS.CHECK_ROUNDED" class="w-4 h-4" />
							<span class="text-sm">{{ t('common.save') }}</span>
						</UButton>
						<div class="flex gap-2">
							<UButton color="error" variant="ghost" size="sm" class="flex-1" :loading="removing" @click="confirmDelete">
								<UIcon :name="ICONS.TRASH" class="w-4 h-4" />
								<span class="text-xs">{{ t('common.delete') }}</span>
							</UButton>
							<UButton color="neutral" variant="outline" size="sm" class="flex-1" @click="goBack">
								<span class="text-xs">{{ t('common.cancel') }}</span>
							</UButton>
						</div>
					</div>
				</div>
			</div>
		</template>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalConfirmation } from '#components';
import { ICONS } from '~/utils/icons';
import type { ShippingMethodOption } from '~/utils/types/order-fulfillment-shipping';

const route = useRoute();
const id = computed(() => route.params.id as string);

const overlay = useOverlay();
const { t } = useI18n();
const shippingStore = useShippingMethodStore();
const { updating, removing } = storeToRefs(shippingStore);
const formRef = ref<{ submit: () => void } | null>(null);

const detailMethod = ref<ShippingMethodOption | undefined>();
const isLoading = ref(true);

const panelTitle = computed(() => {
	const label = detailMethod.value?.description;
	if (label) {
		return `${t('pages.editShippingMethodTitle')}: ${label}`;
	}
	return t('pages.editShippingMethodTitle');
});

useHead({
	title: () => (detailMethod.value ? `${t('pages.editShippingMethodPageTitle')} — ${detailMethod.value.description}` : t('pages.editShippingMethodPageTitle')),
});

onMounted(async () => {
	isLoading.value = true;
	try {
		const m = await shippingStore.getShippingMethod(id.value);

		if (m) {
			detailMethod.value = m;
		} else {
			await navigateTo('/settings/shipping/methods');
		}
	} catch {
		await navigateTo('/settings/shipping/methods');
	} finally {
		isLoading.value = false;
	}
});

const onSubmit = () => {
	formRef.value?.submit();
};

const goBack = () => {
	useRouter().back();
};

const onSaved = (method: ShippingMethodOption | undefined) => {
	if (method) {
		detailMethod.value = method;
	}
};

const confirmDelete = () => {
	if (!detailMethod.value) {
		return;
	}

	const methodId = detailMethod.value.id;

	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: t('components.shipment.confirmDeleteShippingMethod'),
			action: 'delete',
			onConfirm: async () => {
				await shippingStore.deleteShippingMethod(methodId);
				confirmModal.close();
				await navigateTo('/settings/shipping/methods');
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};
</script>
