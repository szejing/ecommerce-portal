<template>
	<ZPagePanel id="product-create" :title="t('pages.addNewProduct')" back-to="/products" grow>
		<div class="container w-full mx-auto">
			<FormProductCreation ref="formRef" />
		</div>

		<template #footer>
			<div class="w-full backdrop-blur-sm border-t border-neutral-200 shadow-md z-50">
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
								{{ t('pages.createProductButton') }}
							</UButton>
						</div>
					</div>

					<!-- Mobile Layout -->
					<div class="md:hidden flex flex-col gap-2">
						<UButton color="success" size="md" class="w-full" :loading="adding" @click="() => onSubmit()">
							<UIcon :name="ICONS.CHECK_ROUNDED" class="w-4 h-4" />
							<span class="text-sm">{{ t('pages.createProductButton') }}</span>
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

const productStore = useProductStore();
const { adding, new_product } = storeToRefs(productStore);
const formRef = ref<{ submit: () => void } | null>(null);

const { t } = useI18n();
useHead({ title: () => t('pages.createProductTitle') });

const isDirty = computed(() => {
	const p = new_product.value;
	return !!(p.name || p.code || p.short_desc);
});

useLeavePageGuard(isDirty, {
	onLeave: () => productStore.resetNewProduct(),
});

const saveDraft = async () => {
	new_product.value.is_active = false;
	await productStore.createProduct();
};

const onSubmit = () => {
	formRef.value?.submit();
};

const goBack = () => {
	useRouter().back();
};
</script>

<style scoped></style>
