<template>
	<ZPagePanel id="outlet-edit" :title="panelTitle" back-to="/operation/outlets" grow>
		<div class="container w-full mx-auto">
			<FormOutletUpdateLoading v-if="isLoading" />
			<FormOutletUpdate
				v-else-if="current_outlet"
				:key="current_outlet.code"
				ref="formRef"
				:outlet-code="outletCode"
				:initial-outlet="current_outlet"
				@saved="onSaved"
			/>
		</div>

		<template #footer>
			<div v-if="current_outlet" class="w-full backdrop-blur-sm border-t border-neutral-200 dark:border-neutral-800 shadow-md z-50">
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

const route = useRoute();
const outletCode = computed(() => route.params.code as string);

const overlay = useOverlay();
const { t } = useI18n();
const outletStore = useOutletStore();
const { updating, removing, current_outlet } = storeToRefs(outletStore);
const formRef = ref<{ submit: () => void } | null>(null);

const isLoading = ref(true);

const panelTitle = computed(() => {
	const label = current_outlet.value?.description || current_outlet.value?.code;
	if (label) {
		return `${t('pages.editOutletTitle')}: ${label}`;
	}
	return t('pages.editOutletTitle');
});

useHead({
	title: () =>
		current_outlet.value
			? `${t('pages.editOutletPageTitle')} — ${current_outlet.value.description || current_outlet.value.code}`
			: t('pages.editOutletPageTitle'),
});

onMounted(async () => {
	isLoading.value = true;
	try {
		const outlet = await outletStore.getOutletByCode(String(outletCode.value));
		if (!outlet) {
			await navigateTo('/operation/outlets');
		}
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

const onSaved = async () => {
	await outletStore.getOutletByCode(String(outletCode.value));
};

const confirmDelete = () => {
	if (!current_outlet.value) {
		return;
	}

	const code = current_outlet.value.code;

	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: t('components.outletForm.confirmDelete'),
			action: 'delete',
			onConfirm: async () => {
				await outletStore.deleteOutlet(code);
				confirmModal.close();
				await navigateTo('/operation/outlets');
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};
</script>

<style scoped></style>
