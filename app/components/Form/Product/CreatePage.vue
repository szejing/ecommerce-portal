<template>
	<ZPagePanel id="product-create" :title="pageTitle" back-to="/products/listing" grow>
		<div class="container w-full mx-auto">
			<FormProductCreation ref="formRef" :surface="surface" />
		</div>

		<template #footer>
			<div class="w-full backdrop-blur-sm border-t border-default shadow-md z-50">
				<div class="mx-auto px-4 sm:px-6 py-4">
					<!-- Desktop Layout -->
					<div class="hidden md:flex justify-between items-center gap-3">
						<UButton color="neutral" variant="ghost" size="lg" :loading="adding" @click="() => saveDraft()">
							<UIcon :name="ICONS.SAVE" />
							{{ t('pages.saveDraft') }}
						</UButton>

						<div class="flex gap-3">
							<UButton color="neutral" variant="outline" size="lg" @click="goBack">{{ t('common.cancel') }}</UButton>

							<UButton color="success" variant="solid" size="lg" :loading="adding" @click="() => onSubmit()">
								<UIcon :name="ICONS.CHECK_ROUNDED" />
								{{ t(isService ? 'pages.createServiceButton' : 'pages.createProductButton') }}
							</UButton>
						</div>
					</div>

					<!-- Mobile Layout -->
					<div class="md:hidden flex flex-col gap-2">
						<UButton color="success" size="md" class="w-full" :loading="adding" @click="() => onSubmit()">
							<UIcon :name="ICONS.CHECK_ROUNDED" class="w-4 h-4" />
							<span class="text-sm">{{ t(isService ? 'pages.createServiceButton' : 'pages.createProductButton') }}</span>
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
import { ICONS } from '~/utils/icons';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';
import { type CatalogCreateSurface, typeIdForSurface } from '~/utils/catalog-form';

const props = defineProps<{ surface: CatalogCreateSurface }>();

const productStore = useProductStore();
const productTypeStore = useProductTypeStore();
productStore.resetNewProduct();
const { adding, new_product } = storeToRefs(productStore);
const formRef = ref<{ submit: () => void } | null>(null);

const { t } = useI18n();
const isService = computed(() => props.surface === 'service');
const pageTitle = computed(() => t(isService.value ? 'pages.addNewService' : 'pages.addNewProduct'));
useHead({ title: () => t(isService.value ? 'pages.createServiceTitle' : 'pages.createProductTitle') });

const isDirty = computed(() => {
	const p = new_product.value;
	return !!(p.name || p.code || p.short_desc);
});

useLeavePageGuard(isDirty, {
	onLeave: () => productStore.resetNewProduct(),
});

const saveDraft = async () => {
	const stampedTypeId = typeIdForSurface(props.surface, productTypeStore.prod_types, new_product.value.type_id);
	if (stampedTypeId == null) {
		failedNotification(t('pages.productTypeNotReady'));
		return;
	}
	new_product.value.type_id = stampedTypeId;
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
	useRouter().back();
};
</script>
