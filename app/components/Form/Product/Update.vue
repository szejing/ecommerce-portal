<template>
	<div class="w-full">
		<!-- Three Column Layout: Sidebar + Form + Sticky Review (laptop) -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
			<!-- Left Sidebar Navigation (Sticky) -->
			<div class="hidden lg:block lg:col-span-2">
				<div class="sticky top-2">
					<nav class="space-y-2">
						<div
							v-for="section in sections"
							:key="section.id"
							class="cursor-pointer rounded-lg px-4 py-3 transition-all duration-200"
							:class="[activeSection === section.id ? 'bg-primary-500 text-white shadow-md' : 'hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900']"
							@click="scrollToSection(section.id)"
						>
							<div class="flex items-center gap-3">
								<div
									class="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold"
									:class="[activeSection === section.id ? 'bg-white text-primary-500' : 'bg-neutral-200 text-neutral-600']"
								>
									{{ section.number }}
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<span class="text-sm font-medium truncate">{{ section.name }}</span>
										<span v-if="section.required" class="text-red-500 text-xs">*</span>
									</div>

									<p class="text-xs opacity-80 truncate" :class="[activeSection === section.id ? 'text-main-100' : 'text-neutral-700']">
										{{ section.description }}
									</p>
								</div>
							</div>
						</div>
					</nav>
				</div>
			</div>

			<!-- Center: Form Content (Scrollable) -->
			<div class="lg:col-span-7">
				<!-- Single Form with all sections -->
				<UForm ref="formRef" :schema="updateProductSchema" :state="formState" class="space-y-6 mb-6" @submit="onSubmit" @error="onError">
					<!-- Section 1: Basic Information -->
					<ZInputProductBasicInfoSection
						:state="formState"
						:code-disabled="true"
						:show-long-description="showLongDescription"
						@update:thumbnail="updateThumbnail"
						@update:images="updateImages"
						@delete:thumbnail="deleteThumbnail"
						@delete:image="deleteImage"
					/>

					<!-- Section 2: Classification -->
					<ZInputProductClassificationSection v-model:categories="categories" v-model:tags="tags" v-model:brands="brands" />

					<!-- Section 3: Pricing -->
					<ZInputProductPricingSection
						:currency-code="currency_code"
						:orig-sell-price="orig_sell_price"
						:cost-price="cost_price"
						:sale-price="sale_price"
						@update:currency="updateCurrency"
						@update:orig-sell-price="orig_sell_price = $event ?? 0"
						@update:cost-price="cost_price = $event"
						@update:sale-price="sale_price = $event"
					/>

					<!-- Section 4: Additional Info (only show for physical items) -->
					<UCard id="section-additional-info" class="shadow-md scroll-mt-4">
						<template #header>
							<ZInputProductAdditionalInfoSectionHeader />
						</template>
						<ZInputProductAdditionalInfo
							:product="productForAdditionalInfo"
							@update:variations="updateProductVariations"
							@update:variants="updateProductVariants"
							@update:metadata="updateProductMetadata"
						/>
					</UCard>
				</UForm>
			</div>

			<!-- Right: Review Summary (Sticky on laptop) -->
			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-2">
					<FormProductReviewSummary :summary="reviewSummary" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { Category } from '~/utils/types/category';
import type { Product, ProductVariantInput } from '~/utils/types/product';
import type { Tag } from '~/utils/types/tag';
import type { Brand } from '~/utils/types/brand';
import type { ProductCreate, ProductUpdate } from '~/utils/types/form/product-creation';
import { createUpdateProductValidation } from '~/utils/schema';
import { ZModalConfirmation, ZModalLoading } from '#components';
import type { Image } from '~/utils/types/image';
import type { FormErrorEvent } from '#ui/types';
import type { ProductVariationInput } from '~/utils/types/product-variation';
import { transformProductToUpdate as buildProductUpdate } from '~/utils/product-transform';
import { GROUP_CODE, PRODUCT } from 'yeppi-common';

const { t } = useI18n();
const updateProductSchema = computed(() => createUpdateProductValidation(t));
const formRef = ref();

const props = defineProps({
	product: {
		type: Object as PropType<Product>,
		required: true,
	},
});

const productTypeStore = useProductTypeStore();
const settingsStore = useSettingStore();
const showLongDescription = computed(
	() => !settingsStore.getSetting(GROUP_CODE.PRODUCT, PRODUCT.HIDE_LONG_DESC)?.getBoolean(),
);
const transformProductToUpdate = (product: Product): ProductUpdate => buildProductUpdate(product, productTypeStore.prod_types);

// Categories, tags, brands state (for UI binding) - declared before watch
const categories = ref<Category[]>(props.product.categories ?? []);
const tags = ref<Tag[]>(props.product.tags ?? []);
const brands = ref<Brand[]>(props.product.brands ?? []);

// Local form state typed as ProductUpdate
const formState = ref<ProductUpdate>(transformProductToUpdate(props.product));

// Watch for prop changes and update form state
watch(
	() => props.product,
	(newProduct) => {
		if (!newProduct) {
			return;
		}
		formState.value = transformProductToUpdate(newProduct);
		// Also update categories, tags, brands refs for UI
		categories.value = newProduct.categories ?? [];
		tags.value = newProduct.tags ?? [];
		brands.value = newProduct.brands ?? [];
	},
	{ deep: true, immediate: true },
);

// Computed property for ZInputProductAdditionalInfo compatibility
// Pass shape compatible with ProductCreate | Product (category_codes present; type for child)
const productForAdditionalInfo = computed(() => {
	const state = formState.value;
	return {
		...state,
		type: state.type_id,
		category_codes: state.category_codes,
		type_id: state.type_id ?? 0,
	} as ProductCreate | Product;
});

// Icons
const ICONS = {
	CHECK_ROUNDED: 'i-heroicons-check-circle-20-solid',
	HELP: 'i-heroicons-question-mark-circle',
	INFO: 'i-heroicons-information-circle',
	ARROW_RIGHT: 'i-heroicons-arrow-right',
	ARROW_LEFT: 'i-heroicons-arrow-left',
	TAG: 'i-heroicons-tag',
	CURRENCY: 'i-heroicons-currency-dollar',
	LAYERS: 'i-heroicons-squares-2x2',
	IMAGE: 'i-heroicons-photo',
	SAVE: 'i-heroicons-document-arrow-down',
};

// State
const activeSection = ref('section-basic-info');

// Section Navigation
const sections = computed(() => [
	{
		id: 'section-basic-info',
		number: 1,
		name: t('pages.basicInfo'),
		description: t('pages.basicInfoDesc'),
		required: true,
	},
	{
		id: 'section-classification',
		number: 2,
		name: t('pages.classification'),
		description: t('pages.classificationDesc'),
		required: false,
	},
	{
		id: 'section-pricing',
		number: 3,
		name: t('pages.pricing'),
		description: t('pages.pricingDesc'),
		required: true,
	},
	...[{ id: 'section-additional-info', number: 4, name: t('pages.additionalInfo'), description: t('pages.additionalInfoDesc'), required: false }],
]);

// Scroll to section
const scrollToSection = (sectionId: string) => {
	const element = document.getElementById(sectionId);
	if (element) {
		element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		activeSection.value = sectionId;
	}
};

// Ref to store the scroll container
const scrollContainer = ref<HTMLElement | null>(null);

// Function to find the scrollable parent
const findScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
	if (!element) return null;

	let parent = element.parentElement;
	while (parent) {
		const overflow = window.getComputedStyle(parent).overflow;
		const overflowY = window.getComputedStyle(parent).overflowY;

		if (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll') {
			return parent;
		}
		parent = parent.parentElement;
	}
	return null;
};

// Scroll spy - track which section is visible
const handleScroll = () => {
	const threshold = 200; // Distance from top of viewport/container
	let closestSection = sections.value[0]?.id; // Default to first section
	let closestDistance = Infinity;

	// Get the viewport/container height
	const containerHeight =
		scrollContainer.value === (window as any)
			? (window as any).innerHeight
			: (scrollContainer.value as HTMLElement)?.clientHeight || (window as any).innerHeight;

	// Find the section that's closest to the threshold
	for (const section of sections.value) {
		const element = document.getElementById(section.id);
		if (element) {
			const rect = element.getBoundingClientRect();
			const distance = Math.abs(rect.top - threshold);

			// If this section's top is above the bottom of viewport and closer to threshold
			if (rect.top < containerHeight && rect.bottom > 0 && distance < closestDistance) {
				closestDistance = distance;
				closestSection = section.id;
			}
		}
	}

	if (closestSection && activeSection.value !== closestSection) {
		activeSection.value = closestSection;
	}
};

// Computed: Pricing
const currency_code = computed({
	get() {
		return formState.value.price_types?.[0]?.currency_code ?? 'MYR';
	},
	set(value) {
		if (formState.value.price_types?.[0]) {
			formState.value.price_types[0].currency_code = value;
		} else {
			formState.value.price_types = [{ id: undefined, orig_sell_price: 0, cost_price: undefined, sale_price: undefined, currency_code: value }];
		}
	},
});

const orig_sell_price = computed({
	get() {
		return formState.value.price_types?.[0]?.orig_sell_price;
	},
	set(value) {
		if (formState.value.price_types?.[0]) {
			formState.value.price_types[0].orig_sell_price = value ?? 0;
		} else {
			formState.value.price_types = [
				{ id: undefined, orig_sell_price: value ?? 0, cost_price: undefined, sale_price: undefined, currency_code: currency_code.value },
			];
		}
	},
});

const cost_price = computed({
	get() {
		return formState.value.price_types?.[0]?.cost_price;
	},
	set(value) {
		if (formState.value.price_types?.[0]) {
			formState.value.price_types[0].cost_price = value;
		} else {
			formState.value.price_types = [{ id: undefined, cost_price: value, orig_sell_price: 0, sale_price: undefined, currency_code: currency_code.value }];
		}
	},
});

const sale_price = computed({
	get() {
		return formState.value.price_types?.[0]?.sale_price;
	},
	set(value) {
		if (formState.value.price_types?.[0]) {
			formState.value.price_types[0].sale_price = value;
		} else {
			formState.value.price_types = [{ id: undefined, sale_price: value, orig_sell_price: 0, cost_price: undefined, currency_code: currency_code.value }];
		}
	},
});

// Computed: Review summary for shared ReviewSummary component
const reviewSummary = computed(() => ({
	name: formState.value.name ?? '',
	code: formState.value.code,
	isActive: formState.value.is_active ?? true,
	currencyCode: currency_code.value,
	origSellPrice: orig_sell_price.value,
	salePrice: sale_price.value,
	costPrice: cost_price.value,
	categoryLabels: categories.value?.map((c) => c.description ?? c.code).filter(Boolean) ?? [],
	tagLabels: tags.value?.map((t) => t.value).filter(Boolean) ?? [],
	brandLabels: brands.value?.map((b) => b.description ?? b.code).filter(Boolean) ?? [],
	variationDescriptions:
		formState.value.variations
			?.filter((v) => v.name?.trim())
			.map((v) => ({
				name: v.name,
				values:
					v.options
						.map((o) => o.value)
						.filter((val) => val?.trim())
						.join('_') || '—',
			}))
			.filter((d) => d.values !== '—') ?? [],
	variantsCount: formState.value.variants?.length ?? 0,
	hasThumbnail: !!formState.value.thumbnail,
	imagesCount: formState.value.images?.length ?? 0,
	thumbnail: formState.value.thumbnail,
	images: formState.value.images ?? [],
}));

// Methods: Images
const updateImages = (files: File[]) => {
	formState.value.images = files;
};

const deleteImage = (image: Image) => {
	if (!formState.value.images) return;

	const index = formState.value.images.findIndex((img) => (img as Image).id === image.id);
	if (index !== -1) {
		formState.value.images.splice(index, 1);
	}
};

const updateThumbnail = (files: File[]) => {
	formState.value.thumbnail = files[0];
};

const deleteThumbnail = () => {
	formState.value.thumbnail = undefined;
};
// Methods: Currency
const updateCurrency = (currency: any) => {
	currency_code.value = currency.code;
};

// Methods: Product Variations & Variants
const updateProductVariations = (value: ProductVariationInput[]) => {
	formState.value.variations = value;
};

const updateProductVariants = (value: ProductVariantInput[]) => {
	formState.value.variants = value;
};

const updateProductMetadata = (value: any) => {
	formState.value.metadata = value;
};

// Field-to-section mapping for scroll-to-error
const fieldSectionMap: Record<string, string> = {
	code: 'section-basic-info',
	name: 'section-basic-info',
	short_desc: 'section-basic-info',
	long_desc: 'section-basic-info',
	status: 'section-basic-info',
	is_active: 'section-basic-info',
	type_id: 'section-basic-info',
	categories: 'section-classification',
	tags: 'section-classification',
	price_types: 'section-pricing',
};

const onError = (event: FormErrorEvent) => {
	const firstError = event.errors[0];
	const errorName = firstError?.name;
	if (!errorName) return;

	const fieldName = errorName.split('.')[0] ?? errorName;
	const sectionId = fieldSectionMap[fieldName];

	if (sectionId) {
		const sectionEl = document.getElementById(sectionId);
		if (sectionEl) {
			sectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
			activeSection.value = sectionId;
		}
	}

	nextTick(() => {
		const errorEl = document.getElementById(errorName);
		errorEl?.focus();
	});
};

// Methods: Form Submission
const hasZeroOrigSellPrice = () => {
	const productPrices = formState.value.price_types ?? [];
	if (productPrices.some((p) => Number(p.orig_sell_price) === 0)) return true;
	const variants = formState.value.variants ?? [];
	return variants.some((v) => v.price_types?.some((p) => Number(p.orig_sell_price) === 0));
};

const doUpdateProduct = async () => {
	const overlay = useOverlay();
	const loadingModal = overlay.create(ZModalLoading, {
		props: { key: 'loading' },
	});

	loadingModal.open();

	try {
		const productStore = useProductStore();
		const success = await productStore.updateProduct({
			code: formState.value.code!,
			...formState.value,
		});
		if (success) {
			// const product = await productStore.getProduct(formState.value.code!);
			// productStore.current_product = product;

			navigateTo(`/products/listing`);
		}
	} catch (error) {
		console.error(error);
	} finally {
		loadingModal.close();
	}
};

const onSubmit = async () => {
	// Update category_codes, tag_ids, brand_codes from UI state
	formState.value.category_codes = categories.value?.map((cat) => cat.code!).filter(Boolean) ?? [];
	formState.value.tag_ids = tags.value?.map((tag) => tag.id!).filter(Boolean);
	formState.value.brand_codes = brands.value?.map((brand) => brand.code!).filter(Boolean);
	// Deep clone metadata to avoid reference issues
	if (formState.value.metadata) {
		formState.value.metadata = JSON.parse(JSON.stringify(formState.value.metadata));
	}

	if (hasZeroOrigSellPrice()) {
		const overlay = useOverlay();
		const confirmModal = overlay.create(ZModalConfirmation, {
			props: {
				title: t('modal.confirmOrigSellPriceZeroTitle'),
				message: t('modal.confirmOrigSellPriceZeroMessage'),
				titleVariant: 'danger',
				action: 'confirm',
				onConfirm: async () => {
					await doUpdateProduct();
					confirmModal.close();
				},
				onCancel: () => {
					confirmModal.close();
				},
			},
		});
		confirmModal.open();
		return;
	}

	await doUpdateProduct();
};

// Lifecycle: Setup scroll spy
onMounted(() => {
	// Find the scrollable container - likely the UDashboardPanel body
	nextTick(() => {
		// Try to find scrollable parent from component root
		const root = document.getElementById('section-basic-info')?.parentElement?.parentElement;

		const foundScrollable = findScrollableParent(root as HTMLElement);

		scrollContainer.value = foundScrollable || (window as any);

		if (scrollContainer.value) {
			scrollContainer.value.addEventListener('scroll', handleScroll, { passive: true });

			handleScroll(); // Initial check
		}
	});
});

// Expose submit method that triggers UForm validation
const submit = () => {
	formRef.value?.submit();
};
defineExpose({ submit });

// Lifecycle: Cleanup
onUnmounted(() => {
	if (scrollContainer.value) {
		scrollContainer.value.removeEventListener('scroll', handleScroll);
	}
});
</script>

<style scoped>
/* Smooth scroll behavior */
html {
	scroll-behavior: smooth;
}

/* Ensure proper spacing for mobile */
@media (max-width: 640px) {
	.space-y-6 > * + * {
		margin-top: 1.5rem;
	}
}
</style>
