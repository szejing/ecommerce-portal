<template>
	<UCard id="section-review" class="shadow-lg border border-primary-200/60 rounded-xl overflow-hidden scroll-mt-4">
		<template #header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-3">
						<UIcon :name="ICONS.CHECK_ROUNDED" class="text-primary-600 w-10 h-10" />

						<div>
							<h2 class="text-lg font-semibold text-default">{{ t('components.productUpdate.reviewYourProduct') }}</h2>
							<p class="text-sm text-muted mt-0.5">{{ t('components.productUpdate.reviewBeforeCreate') }}</p>
						</div>
					</div>
				</div>
			</div>
		</template>

		<div class="space-y-5">
			<!-- Thumbnail & Images -->
			<section v-if="summary.hasThumbnail || (summary.images && summary.images.length > 0)" class="rounded-xl bg-elevated/60 p-4 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
					<UIcon :name="ICONS.IMAGE" class="w-4 h-4 text-primary-500" />
					{{ t('components.productUpdate.imagesSummaryTitle') }}
				</h4>
				<div class="space-y-3">
					<div v-if="thumbnailUrl" class="space-y-1.5">
						<p class="text-xs text-muted">{{ t('components.productUpdate.thumbnailLabel') }}</p>
						<img
							:src="thumbnailUrl"
							:alt="t('components.productUpdate.thumbnailLabel')"
							class="rounded-lg border border-default/20 object-cover w-20 h-20 shadow-sm"
						/>
					</div>
					<div v-if="imageUrls.length > 0" class="space-y-1.5">
						<p class="text-xs text-muted">{{ t('components.productUpdate.galleryLabel') }} ({{ imageUrls.length }})</p>
						<div class="flex flex-wrap gap-2">
							<img
								v-for="(url, i) in imageUrls"
								:key="i"
								:src="url"
								:alt="`${t('components.productUpdate.galleryLabel')} ${i + 1}`"
								class="rounded-lg border border-default/20 object-cover w-14 h-14 shadow-sm"
							/>
						</div>
					</div>
					<p v-if="!thumbnailUrl && imageUrls.length === 0" class="text-sm text-muted">
						{{ t('common.notSet') }}
					</p>
				</div>
			</section>

			<!-- Basic Info -->
			<section class="rounded-xl bg-elevated/60 p-4 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
					<UIcon :name="ICONS.INFO" class="w-4 h-4 text-primary-500" />
					{{ t('pages.basicInfo') }}
				</h4>
				<dl class="space-y-2.5 text-sm">
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('common.name') }}</dt>
						<dd class="font-medium text-default truncate text-right">{{ summary.name || t('common.notSet') }}</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('common.code') }}</dt>
						<dd class="font-medium text-default truncate text-right">{{ summary.code || t('common.auto') }}</dd>
					</div>
					<div class="flex justify-between items-center gap-2">
						<dt class="text-muted shrink-0">{{ t('common.status') }}</dt>
						<dd>
							<UBadge :color="summary.isActive ? 'success' : 'error'" variant="soft" size="xs">
								{{ summary.isActive ? t('common.active') : t('common.inactive') }}
							</UBadge>
						</dd>
					</div>
				</dl>
			</section>

			<!-- Pricing -->
			<section class="rounded-xl bg-elevated/60 p-4 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
					<UIcon :name="ICONS.CURRENCY" class="w-4 h-4 text-primary-500" />
					{{ t('components.productUpdate.pricing') }}
				</h4>
				<dl class="space-y-2.5 text-sm">
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('components.productUpdate.priceLabel') }}</dt>
						<dd class="font-semibold text-default">{{ summary.currencyCode }} {{ (summary.origSellPrice ?? 0).toFixed(2) }}</dd>
					</div>
					<div v-if="summary.costPrice != null" class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('components.productUpdate.cost') }}</dt>
						<dd class="font-medium text-default">{{ summary.currencyCode }} {{ summary.costPrice.toFixed(2) }}</dd>
					</div>
				</dl>
			</section>

			<!-- Classification: categories, tags, brands as labels -->
			<section class="rounded-xl bg-elevated/60 p-4 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
					<UIcon :name="ICONS.TAG" class="w-4 h-4 text-primary-500" />
					{{ t('components.productUpdate.classification') }}
				</h4>
				<dl class="space-y-2.5 text-sm">
					<div class="space-y-1">
						<dt class="text-muted">{{ t('components.productUpdate.categoriesLabel') }}</dt>
						<dd class="font-medium text-default">
							<span v-if="categoryDisplay" class="inline-flex flex-wrap gap-1">
								<UBadge v-for="(label, i) in categoryLabels" :key="i" color="neutral" variant="soft" size="xs">
									{{ label }}
								</UBadge>
							</span>
							<span v-else class="text-muted">—</span>
						</dd>
					</div>
					<div class="space-y-1">
						<dt class="text-muted">{{ t('components.productUpdate.tagsLabel') }}</dt>
						<dd class="font-medium text-default">
							<span v-if="tagDisplay" class="inline-flex flex-wrap gap-1">
								<UBadge v-for="(label, i) in tagLabels" :key="i" color="neutral" variant="soft" size="xs">
									{{ label }}
								</UBadge>
							</span>
							<span v-else class="text-muted">—</span>
						</dd>
					</div>
					<div class="space-y-1">
						<dt class="text-muted">{{ t('components.productUpdate.brandsLabel') }}</dt>
						<dd class="font-medium text-default">
							<span v-if="brandDisplay" class="inline-flex flex-wrap gap-1">
								<UBadge v-for="(label, i) in brandLabels" :key="i" color="neutral" variant="soft" size="xs">
									{{ label }}
								</UBadge>
							</span>
							<span v-else class="text-muted">—</span>
						</dd>
					</div>
				</dl>
			</section>

			<!-- Variants: show variation names and option values (e.g. Color: red_blue) -->
			<section class="rounded-xl bg-elevated/60 p-4 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
					<UIcon :name="ICONS.LAYERS" class="w-4 h-4 text-primary-500" />
					{{ t('components.productUpdate.variantsSummaryTitle') }}
				</h4>
				<div v-if="variationDisplay" class="space-y-2.5 text-sm">
					<div v-for="(line, i) in variationDescriptions" :key="i" class="flex justify-between gap-2 items-baseline">
						<span class="text-muted shrink-0">{{ line.name }}</span>
						<span class="font-medium text-default text-right break-all">{{ line.values }}</span>
					</div>
					<p v-if="summary.variantsCount != null && summary.variantsCount > 0" class="text-xs text-muted pt-1">
						{{ t('components.productUpdate.total') }}: {{ summary.variantsCount }}
					</p>
				</div>
				<div v-else class="text-sm">
					<p class="text-muted">—</p>
				</div>
			</section>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
const { t } = useI18n();
export interface ProductReviewSummary {
	name: string;
	code?: string;
	isActive: boolean;
	currencyCode: string;
	origSellPrice?: number;
	salePrice?: number;
	costPrice?: number;
	/** Category labels to display (e.g. ["Electronics", "Gadgets"]). */
	categoryLabels?: string[];
	/** Tag labels to display (e.g. ["sale", "new"]). */
	tagLabels?: string[];
	/** Brand labels to display (e.g. ["Acme", "BrandX"]). */
	brandLabels?: string[];
	/** Variation name + option values (e.g. [{ name: "Color", values: "red_blue" }]). */
	variationDescriptions?: { name: string; values: string }[];
	variantsCount?: number;
	hasThumbnail: boolean;
	imagesCount?: number;
	/** Thumbnail file or image for preview. */
	thumbnail?: File | { url: string };
	/** Gallery images for preview. */
	images?: (File | { url: string })[];
}

const props = defineProps<{
	summary: ProductReviewSummary;
}>();

const categoryLabels = computed(() => props.summary.categoryLabels ?? []);
const tagLabels = computed(() => props.summary.tagLabels ?? []);
const brandLabels = computed(() => props.summary.brandLabels ?? []);
const variationDescriptions = computed(() => props.summary.variationDescriptions ?? []);
const categoryDisplay = computed(() => categoryLabels.value.length > 0);
const tagDisplay = computed(() => tagLabels.value.length > 0);
const brandDisplay = computed(() => brandLabels.value.length > 0);
const variationDisplay = computed(() => variationDescriptions.value.length > 0);

function isImageLike(item: File | { url: string }): item is { url: string } {
	return !!item && typeof item === 'object' && 'url' in item && typeof (item as { url: string }).url === 'string';
}

function getUrl(item: File | { url: string }): string {
	return isImageLike(item) ? item.url : URL.createObjectURL(item);
}

const thumbnailUrl = ref<string | null>(null);
const imageUrls = ref<string[]>([]);
const objectUrlsToRevoke = ref<string[]>([]);

watch(
	() => [props.summary.thumbnail, props.summary.images],
	() => {
		objectUrlsToRevoke.value.forEach((u) => URL.revokeObjectURL(u));
		objectUrlsToRevoke.value = [];

		const t = props.summary.thumbnail;
		thumbnailUrl.value = t ? getUrl(t) : null;
		if (t && !isImageLike(t) && thumbnailUrl.value) objectUrlsToRevoke.value.push(thumbnailUrl.value);

		const list = props.summary.images ?? [];
		imageUrls.value = list.map((item) => getUrl(item));
		list.forEach((item, i) => {
			if (!isImageLike(item) && imageUrls.value[i]) objectUrlsToRevoke.value.push(imageUrls.value[i]);
		});
	},
	{ immediate: true, deep: true },
);

onUnmounted(() => {
	objectUrlsToRevoke.value.forEach((u) => URL.revokeObjectURL(u));
	objectUrlsToRevoke.value = [];
});

const ICONS = {
	CHECK_ROUNDED: 'i-heroicons-check-circle-20-solid',
	INFO: 'i-heroicons-information-circle',
	TAG: 'i-heroicons-tag',
	CURRENCY: 'i-heroicons-currency-dollar',
	LAYERS: 'i-heroicons-squares-2x2',
	IMAGE: 'i-heroicons-photo',
};
</script>
