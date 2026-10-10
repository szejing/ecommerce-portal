<template>
	<ZPagePanel id="combo-create" :title="t('combo.create')" back-to="/products/combos" grow>
		<div class="container w-full mx-auto">
			<FormComboCreation ref="formRef" return-to="/products/combos" />
		</div>

		<template #footer>
			<div class="w-full backdrop-blur-sm border-t border-neutral-200 shadow-md z-50">
				<div class="mx-auto px-4 sm:px-6 py-4">
					<div class="hidden md:flex justify-between items-center gap-3">
						<UButton color="neutral" variant="ghost" size="lg" :loading="adding" @click="() => saveDraft()">
							<UIcon :name="ICONS.SAVE" />
							{{ t('pages.saveDraft') }}
						</UButton>

						<div class="flex gap-3">
							<UButton color="neutral" variant="outline" size="lg" @click="goBack">{{ t('common.cancel') }}</UButton>

							<UButton color="success" variant="solid" size="lg" :loading="adding" @click="() => onSubmit()">
								<UIcon :name="ICONS.CHECK_ROUNDED" />
								{{ t('combo.create') }}
							</UButton>
						</div>
					</div>

					<div class="md:hidden flex flex-col gap-2">
						<UButton color="success" size="md" class="w-full" :loading="adding" @click="() => onSubmit()">
							<UIcon :name="ICONS.CHECK_ROUNDED" class="w-4 h-4" />
							<span class="text-sm">{{ t('combo.create') }}</span>
						</UButton>
						<div class="flex gap-2">
							<UButton color="neutral" variant="soft" size="sm" class="flex-1" :loading="adding" @click="() => saveDraft()">
								<UIcon :name="ICONS.SAVE" class="w-4 h-4" />
								<span class="text-xs">{{ t('pages.saveDraft') }}</span>
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
import { ProductType } from 'yeppi-common';
import { ICONS } from '~/utils/icons';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';

const productStore = useProductStore();
const { adding, new_product } = storeToRefs(productStore);
const typeStore = useProductTypeStore();
productStore.startNewCombo(typeStore.prod_types.find(type => type.value === ProductType.ITEM)?.id ?? 1);
watch(() => typeStore.prod_types.find(type => type.value === ProductType.ITEM)?.id, (id) => {
	if (id !== undefined) new_product.value.type_id = id;
});
const formRef = ref<{ submit: () => void } | null>(null);

const { t } = useI18n();
useHead({ title: () => t('combo.create') });

const isDirty = computed(() => {
	const p = new_product.value;
	return !!(p.name || p.code || p.short_desc);
});

useLeavePageGuard(isDirty, {
	onLeave: () => productStore.resetNewProduct(),
});

const saveDraft = async () => {
	const outcome = await productStore.saveNewDraft();
	if (outcome.status === 'completed') {
		successNotification(t('product.notifications.draftSaved', { code: outcome.product.code }));
		return;
	}
	failedNotification(outcome.failure.message);
};

const onSubmit = () => {
	formRef.value?.submit();
};

const goBack = () => {
	navigateTo('/products/combos');
};
</script>
