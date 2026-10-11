<template>
	<UModal
		:title="t('components.zModal.catalogStatusPeek.title')"
		:close="{ onClick: () => emit('close') }"
		scrollable
		:ui="{ content: 'w-full sm:max-w-xl', body: 'space-y-5' }"
	>
		<template #body>
			<div v-if="loading" class="flex items-center justify-center gap-2 py-10" data-testid="catalog-status-peek-loading">
				<UIcon :name="ICONS.REFRESH" class="size-6 animate-spin text-muted" aria-hidden="true" />
				<span class="sr-only">{{ t('common.loading') }}</span>
			</div>

			<template v-else-if="model">
				<div class="flex items-start gap-3" data-testid="catalog-status-peek-header">
					<img
						:src="resolvedThumbnail"
						:alt="model.name || t('table.productThumbnail')"
						width="56"
						height="56"
						class="size-14 shrink-0 rounded-lg object-cover bg-elevated"
						@error="thumbBroken = true"
					/>
					<div class="min-w-0 flex-1 space-y-1.5">
						<p class="text-sm font-semibold text-highlighted wrap-break-word">{{ model.name }}</p>
						<p class="font-mono text-xs text-muted wrap-break-word">{{ model.code }}</p>
						<div v-if="model.found" class="flex flex-wrap items-center gap-1.5">
							<UBadge :color="sellabilityColor" variant="subtle" size="sm">{{ sellabilityLabel }}</UBadge>
							<UBadge color="neutral" variant="subtle" size="sm">{{ kindLabel }}</UBadge>
						</div>
					</div>
				</div>

				<section class="space-y-2" data-testid="catalog-status-peek-ordered-as">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-muted">
						{{ t('components.zModal.catalogStatusPeek.orderedAs') }}
					</h3>
					<dl class="overflow-hidden rounded-md border border-default divide-y divide-default">
						<div class="flex items-start justify-between gap-4 px-3 py-2">
							<dt class="text-sm text-muted">{{ t('components.zModal.catalogStatusPeek.orderedQty') }}</dt>
							<dd class="text-sm font-medium tabular-nums text-highlighted">×{{ model.orderedAs.qty }}</dd>
						</div>
						<div class="flex items-start justify-between gap-4 px-3 py-2">
							<dt class="text-sm text-muted">{{ t('components.zModal.catalogStatusPeek.unitPriceCharged') }}</dt>
							<dd class="text-sm font-medium tabular-nums text-highlighted">
								{{ formatCurrency(model.orderedAs.unitSellPrice, model.orderedAs.currencyCode) }}
							</dd>
						</div>
						<div v-if="model.orderedAs.isPreorder" class="flex items-start justify-between gap-4 px-3 py-2">
							<dt class="text-sm text-muted">{{ t('components.orderDetail.preorder') }}</dt>
							<dd>
								<UBadge color="warning" variant="subtle" size="sm">{{ t('components.orderDetail.preorder') }}</UBadge>
							</dd>
						</div>
					</dl>
				</section>

				<section v-if="!model.found" data-testid="catalog-status-peek-not-found">
					<UAlert
						color="warning"
						variant="subtle"
						:title="t('components.zModal.catalogStatusPeek.notFoundTitle')"
						:description="t('components.zModal.catalogStatusPeek.notFoundDescription')"
					/>
				</section>

				<section v-else class="space-y-2" data-testid="catalog-status-peek-status">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-muted">
						{{ t('components.zModal.catalogStatusPeek.liveStatus') }}
					</h3>
					<div class="overflow-x-auto rounded-md border border-default">
						<table class="w-full min-w-72 table-fixed text-sm">
							<tbody class="divide-y divide-default">
								<tr v-for="row in model.statusRows" :key="row.id" data-testid="catalog-status-peek-row">
									<th scope="row" class="w-1/2 px-3 py-2 text-left font-normal text-muted">
										{{ t(`components.zModal.catalogStatusPeek.rows.${row.labelKey}`) }}
									</th>
									<td class="px-3 py-2 text-right tabular-nums text-highlighted wrap-break-word">
										{{ formatRowDisplay(row.display) }}
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</section>

				<section v-if="model.found && model.components.length" class="space-y-2" data-testid="catalog-status-peek-components">
					<h3 class="text-xs font-semibold uppercase tracking-wide text-muted">
						{{ t('components.zModal.catalogStatusPeek.components') }}
					</h3>
					<ul class="divide-y divide-default overflow-hidden rounded-md border border-default">
						<li
							v-for="(component, index) in model.components"
							:key="`${component.product_code}-${index}`"
							class="flex items-start justify-between gap-3 px-3 py-2"
						>
							<div class="min-w-0">
								<p class="text-sm text-highlighted wrap-break-word">
									{{ component.product_name }}
									<template v-if="component.variant_name"> ({{ component.variant_name }})</template>
								</p>
								<p class="font-mono text-xs text-muted">{{ component.product_code }}</p>
							</div>
							<span class="shrink-0 text-sm tabular-nums text-muted">×{{ component.quantity }}</span>
						</li>
					</ul>
				</section>
			</template>
		</template>

		<template #footer>
			<div class="flex w-full flex-wrap items-center justify-end gap-2">
				<UButton color="neutral" variant="soft" :label="t('common.close')" @click="emit('close')" />
				<UButton
					v-if="model?.found && model.catalogPath"
					color="primary"
					variant="solid"
					:label="openCatalogLabel"
					:to="model.catalogPath"
					data-testid="catalog-status-peek-open-catalog"
					@click="emit('close')"
				/>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import { formatCurrency } from 'yeppi-common';
import { ICONS } from '~/utils/icons';
import type { ItemModel } from '~/utils/models/item.model';
import type { Product } from '~/utils/types/product';
import {
	buildCatalogStatusPeekModel,
	type CatalogStatusPeekModel,
	type CatalogStatusSellability,
} from '~/utils/catalog-status-peek';

const PRODUCT_THUMBNAIL_FALLBACK = '/svg/product-holder.svg';

const props = defineProps<{
	item: ItemModel;
	orderCurrency?: string;
}>();

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const { $api } = useNuxtApp();

const loading = ref(true);
const product = ref<Product | null>(null);
const thumbBroken = ref(false);

const model = computed<CatalogStatusPeekModel | null>(() => {
	if (loading.value) return null;
	return buildCatalogStatusPeekModel({
		product: product.value,
		item: props.item,
		orderCurrency: props.orderCurrency,
	});
});

const resolvedThumbnail = computed(() => {
	if (thumbBroken.value) return PRODUCT_THUMBNAIL_FALLBACK;
	return model.value?.thumbnailUrl?.trim() || PRODUCT_THUMBNAIL_FALLBACK;
});

const sellabilityColor = computed(() => {
	const map: Record<CatalogStatusSellability, 'success' | 'warning' | 'neutral' | 'error'> = {
		sellable: 'success',
		draft: 'warning',
		hidden: 'neutral',
		archived: 'neutral',
		unknown: 'neutral',
	};
	return map[model.value?.sellability ?? 'unknown'];
});

const sellabilityLabel = computed(() => {
	const key = model.value?.sellability ?? 'unknown';
	return t(`components.zModal.catalogStatusPeek.sellability.${key}`);
});

const kindLabel = computed(() => {
	const key = model.value?.kind ?? 'product';
	return t(`components.zModal.catalogStatusPeek.kind.${key}`);
});

const openCatalogLabel = computed(() => {
	if (model.value?.kind === 'fixed_combo') return t('components.zModal.catalogStatusPeek.openCombo');
	return t('components.zModal.catalogStatusPeek.openProduct');
});

const formatRowDisplay = (display: string) => {
	if (display === 'yes') return t('components.zModal.catalogStatusPeek.values.yes');
	if (display === 'no') return t('components.zModal.catalogStatusPeek.values.no');
	if (display === 'na') return t('components.zModal.catalogStatusPeek.values.na');
	if (display === 'unlimited') return t('components.zModal.catalogStatusPeek.values.unlimited');
	return display;
};

onMounted(async () => {
	const code = props.item.prod_code?.trim();
	if (!code) {
		product.value = null;
		loading.value = false;
		return;
	}

	try {
		const data = await $api.product.getSingle(code);
		product.value = data.product ?? null;
	} catch {
		product.value = null;
	} finally {
		loading.value = false;
	}
});
</script>
