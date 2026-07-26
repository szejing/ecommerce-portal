<template>
	<ZPagePanel id="courier-edit" :title="panelTitle" back-to="/settings/shipping/couriers" grow>
		<div class="container w-full mx-auto">
			<FormCourierUpdateLoading v-if="isLoading" />
			<FormCourierUpdate
				v-else-if="detailCourier"
				:key="detailCourier.id"
				ref="formRef"
				:courier-id="detailCourier.id"
				:initial-courier="detailCourier"
				@saved="onSaved"
			/>
		</div>

		<template #footer>
			<div v-if="detailCourier" class="w-full backdrop-blur-sm border-t border-neutral-200 dark:border-neutral-800 shadow-md z-50">
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
import type { Courier } from '~/utils/types/courier';

const route = useRoute();
const id = computed(() => route.params.id as string);

const overlay = useOverlay();
const { t } = useI18n();
const courierStore = useCourierStore();
const { updating, removing } = storeToRefs(courierStore);
const formRef = ref<{ submit: () => void } | null>(null);

const detailCourier = ref<Courier | undefined>();
const isLoading = ref(true);

const panelTitle = computed(() => {
	const label = detailCourier.value?.name;
	if (label) {
		return `${t('pages.editCourierTitle')}: ${label}`;
	}
	return t('pages.editCourierTitle');
});

useHead({
	title: () => (detailCourier.value ? `${t('pages.editCourierPageTitle')} - ${detailCourier.value.name}` : t('pages.editCourierPageTitle')),
});

onMounted(async () => {
	isLoading.value = true;
	try {
		const courier = await courierStore.getCourier(id.value);

		if (courier) {
			detailCourier.value = courier;
		} else {
			await navigateTo('/settings/shipping/couriers');
		}
	} catch {
		await navigateTo('/settings/shipping/couriers');
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

const onSaved = (courier: Courier | undefined) => {
	if (courier) {
		detailCourier.value = courier;
	}
};

const confirmDelete = () => {
	if (!detailCourier.value) {
		return;
	}

	const courierId = detailCourier.value.id;

	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: t('components.courierForm.confirmDelete'),
			action: 'delete',
			onConfirm: async () => {
				await courierStore.deleteCourier(courierId);
				confirmModal.close();
				await navigateTo('/settings/shipping/couriers');
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};
</script>
