<template>
	<div class="w-full">
		<!-- Auto-save indicator -->
		<div v-if="lastSaved" class="text-sm text-neutral-600 text-right mb-4 px-2">
			<UIcon :name="ICONS.CHECK_ROUNDED" class="inline-block w-4 h-4 text-green-500" />
			{{ t('components.productForm.draftSavedAt', { time: lastSaved }) }}
		</div>

		<!-- Three Column Layout: Sidebar + Form + Sticky Review (laptop) -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
			<!-- Left Sidebar Navigation (Sticky) -->
			<div class="hidden lg:block lg:col-span-2">
				<div class="sticky top-4">
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
				<UForm ref="formRef" :schema="CreateProductValidation" :state="new_product" class="space-y-6 mb-6" @submit="onSubmit" @error="onError">
					<!-- Section 1: Basic Information -->
					<ZInputProductBasicInfoSection
						:state="new_product"
						:code-disabled="false"
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
							:product="new_product"
							@update:variations="updateProductVariations"
							@update:variants="updateProductVariants"
							@update:metadata="updateProductMetadata"
						/>
					</UCard>
				</UForm>
			</div>

			<!-- Right: Review Summary (Sticky on laptop) -->
			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-4">
					<FormProductReviewSummary :summary="reviewSummary" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { CategoryInput, Category } from '~/utils/types/category';
import type { PriceInput } from '~/utils/types/price';
import type { ProductVariantInput } from '~/utils/types/product';
import type { TagInput, Tag } from '~/utils/types/tag';
import type { BrandInput, Brand } from '~/utils/types/brand';
import type { Image } from '~/utils/types/image';
import { CreateProductValidation } from '~/utils/schema';
import { ICONS } from '~/utils/icons';
import { ZModalConfirmation, ZModalLoading } from '#components';
import type { FormErrorEvent } from '#ui/types';
import type { ProductVariationInput } from '~/utils/types/product-variation';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';

const overlay = useOverlay();
const formRef = ref();

// Store
const productStore = useProductStore();
const { new_product, adding } = storeToRefs(productStore);
const toast = useToast();

// State
const saving = ref(false);
const lastSaved = ref<string | null>(null);
const autoSaveTimer = ref<NodeJS.Timeout | null>(null);
const activeSection = ref('section-basic-info');

// Categories, tags, brands state (for UI binding)
const categories = ref<Category[]>([]);
const tags = ref<Tag[]>([]);
const brands = ref<Brand[]>([]);

const { t } = useI18n();

const loadingModal = overlay.create(ZModalLoading, {
	props: { key: 'loading' },
});

watch(adding, (newVal) => {
	if (newVal) {
		loadingModal.open();
	} else {
		loadingModal.close();
	}
});

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
	{ id: 'section-additional-info', number: 4, name: t('pages.additionalInfo'), description: t('pages.additionalInfoDesc'), required: false },
]);

// Scroll to section
const scrollToSection = (sectionId: string) => {
	const element = document.getElementById(sectionId);
	if (element) {
		element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		activeSection.value = sectionId;
	}
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
		return new_product.value.price_types?.[0]?.currency_code ?? 'MYR';
	},
	set(value) {
		if (new_product.value.price_types?.[0]) {
			new_product.value.price_types[0].currency_code = value;
		} else {
			new_product.value.price_types = [{ id: undefined, orig_sell_price: 0, cost_price: undefined, sale_price: undefined, currency_code: value }];
		}
	},
});

const orig_sell_price = computed({
	get() {
		return new_product.value.price_types?.[0]?.orig_sell_price;
	},
	set(value) {
		if (new_product.value.price_types?.[0]) {
			new_product.value.price_types[0].orig_sell_price = value ?? 0;
		} else {
			new_product.value.price_types = [
				{ id: undefined, orig_sell_price: value ?? 0, cost_price: undefined, sale_price: undefined, currency_code: currency_code.value },
			];
		}
	},
});

const cost_price = computed({
	get() {
		return new_product.value.price_types?.[0]?.cost_price;
	},
	set(value) {
		if (new_product.value.price_types?.[0]) {
			new_product.value.price_types[0].cost_price = value;
		} else {
			new_product.value.price_types = [{ id: undefined, cost_price: value, orig_sell_price: 0, sale_price: undefined, currency_code: currency_code.value }];
		}
	},
});

const sale_price = computed({
	get() {
		return new_product.value.price_types?.[0]?.sale_price;
	},
	set(value) {
		if (new_product.value.price_types?.[0]) {
			new_product.value.price_types[0].sale_price = value;
		} else {
			new_product.value.price_types = [{ id: undefined, sale_price: value, orig_sell_price: 0, cost_price: undefined, currency_code: currency_code.value }];
		}
	},
});

// Computed: Review summary for shared ReviewSummary component
const reviewSummary = computed(() => ({
	name: new_product.value.name ?? '',
	code: new_product.value.code,
	isActive: new_product.value.is_active ?? true,
	currencyCode: currency_code.value,
	origSellPrice: orig_sell_price.value,
	salePrice: sale_price.value,
	costPrice: cost_price.value,
	categoryLabels: categories.value?.map((c) => c.description ?? c.code).filter(Boolean) ?? [],
	tagLabels: tags.value?.map((t) => t.value).filter(Boolean) ?? [],
	brandLabels: brands.value?.map((b) => b.description ?? b.code).filter(Boolean) ?? [],
	variationDescriptions:
		new_product.value.variations
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
	variantsCount: new_product.value.variants?.length ?? 0,
	hasThumbnail: !!new_product.value.thumbnail,
	imagesCount: new_product.value.images?.length ?? 0,
	thumbnail: new_product.value.thumbnail,
	images: new_product.value.images ?? [],
}));

// Methods: Auto-save
const triggerAutoSave = async () => {
	if (autoSaveTimer.value) {
		clearTimeout(autoSaveTimer.value);
	}

	autoSaveTimer.value = setTimeout(async () => {
		await saveDraft(true);
	}, 3000);
};

const saveDraft = async (silent = false) => {
	saving.value = true;
	try {
		// Simulate API call - replace with actual draft save logic
		await new Promise((resolve) => setTimeout(resolve, 500));

		const now = new Date();
		lastSaved.value = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

		if (!silent) {
			toast.add({
				title: t('components.productForm.draftSaved'),
				description: t('components.productForm.draftSavedDescription', { time: lastSaved.value }),
				icon: ICONS.CHECK_ROUNDED,
				color: 'success',
			});
		}
	} catch (error) {
		console.error('Error saving draft:', error);
		if (!silent) {
			toast.add({
				title: t('components.productForm.errorTitle'),
				description: t('components.productForm.errorSavingDraft'),
				color: 'error',
			});
		}
	} finally {
		saving.value = false;
	}
};

// Methods: Images
const updateImages = (files: File[]) => {
	new_product.value.images = files;
};

const updateThumbnail = (files: File[]) => {
	new_product.value.thumbnail = files[0];
};

const deleteThumbnail = () => {
	new_product.value.thumbnail = undefined;
};

const deleteImage = (_image: Image) => {
	if (!new_product.value.images) return;
	new_product.value.images = new_product.value.images.filter((img) => img !== _image) as File[] | Image[];
};

// Methods: Currency
const updateCurrency = (currency: any) => {
	currency_code.value = currency.code;
};

// Methods: Product Variations & Variants
const updateProductVariations = (value: ProductVariationInput[]) => {
	new_product.value.variations = value;
	triggerAutoSave();
};

const updateProductVariants = (value: ProductVariantInput[]) => {
	new_product.value.variants = value;
	triggerAutoSave();
};

const updateProductMetadata = (value: any) => {
	new_product.value.metadata = value;
	triggerAutoSave();
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
	const productPrices = new_product.value.price_types ?? [];
	if (productPrices.some((p) => Number(p.orig_sell_price) === 0)) return true;
	const variants = new_product.value.variants ?? [];
	return variants.some((v) => v.price_types?.some((p) => Number(p.orig_sell_price) === 0));
};

const doCreateProduct = async () => {
	// Process the data
	const prodPrice: PriceInput[] = [];
	new_product.value.price_types?.forEach((price) => {
		prodPrice.push({
			id: undefined,
			orig_sell_price: price.orig_sell_price,
			cost_price: price.cost_price,
			sale_price: price.sale_price,
			currency_code: price.currency_code,
		});
	});

	const prodCategories: CategoryInput[] = [];
	categories.value?.forEach((category: Category) => {
		prodCategories.push({
			code: category.code!,
		});
	});

	const prodTags: TagInput[] = [];
	tags.value?.forEach((tag: Tag) => {
		prodTags.push({
			id: tag.id!,
		});
	});

	const prodVariations: ProductVariationInput[] = [];
	new_product.value.variations?.forEach((variation) => {
		prodVariations.push({
			id: variation.id!,
			name: variation.name!,
			options: variation.options?.map((option) => {
				return {
					id: option.id!,
					value: option.value!,
				};
			}),
		});
	});

	const prodVariants: ProductVariantInput[] = [];
	new_product.value.variants?.forEach((variant) => {
		prodVariants.push({
			variant_code: variant.variant_code!,
			product_code: variant.product_code!,
			name: variant.name!,
			price_types: variant.price_types?.map((price) => {
				return {
					id: undefined,
					orig_sell_price: price.orig_sell_price,
					cost_price: price.cost_price,
					sale_price: price.sale_price,
					currency_code: price.currency_code,
				};
			}),
			options: variant.options?.map((option) => {
				return {
					id: option.id!,
					variation_id: option.variation_id!,
					value: option.value!,
				};
			}),
		});
	});

	const prodBrands: BrandInput[] = [];
	brands.value?.forEach((brand: Brand) => {
		prodBrands.push({ code: brand.code! });
	});

	new_product.value.price_types = prodPrice;
	new_product.value.category_codes = prodCategories.map((c) => c.code!);
	new_product.value.tag_ids = prodTags.map((t) => t.id!);
	new_product.value.brand_codes = prodBrands.map((b) => b.code!);
	new_product.value.variations = prodVariations;
	new_product.value.variants = prodVariants;
	new_product.value.metadata = new_product.value.metadata ? JSON.parse(JSON.stringify(new_product.value.metadata)) : undefined;

	const outcome = await productStore.publishNewProduct();
	if (outcome.status === 'completed') {
		successNotification(t('product.notifications.created', { code: outcome.product.code }));
		useRouter().back();
		return;
	}
	failedNotification(outcome.failure.message);
};

const onSubmit = async () => {
	if (hasZeroOrigSellPrice()) {
		const confirmModal = overlay.create(ZModalConfirmation, {
			props: {
				title: t('modal.confirmOrigSellPriceZeroTitle'),
				message: t('modal.confirmOrigSellPriceZeroMessage'),
				titleVariant: 'danger',
				action: 'confirm',
				onConfirm: async () => {
					await doCreateProduct();
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
	await doCreateProduct();
};

// Lifecycle: Auto-save on product changes
watch(
	() => new_product.value,
	() => {
		if (autoSaveTimer.value) {
			clearTimeout(autoSaveTimer.value);
		}
		autoSaveTimer.value = setTimeout(() => {
			saveDraft(true);
		}, 3000);
	},
	{ deep: true },
);

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
	if (autoSaveTimer.value) {
		clearTimeout(autoSaveTimer.value);
	}
	if (scrollContainer.value) {
		scrollContainer.value.removeEventListener('scroll', handleScroll);
	}
});
</script>

<style scoped>
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
