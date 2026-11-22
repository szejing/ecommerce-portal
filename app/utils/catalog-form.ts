import { ProductType } from 'yeppi-common';
import type { MerchantProductTypeLike } from '~/utils/product-type-resolve';

export type CatalogCreateSurface = 'product' | 'service';

const PRODUCT_PAGE_KINDS = [ProductType.ITEM, ProductType.EVENT];

export function typesForSurface(
	surface: CatalogCreateSurface,
	types: MerchantProductTypeLike[],
): MerchantProductTypeLike[] {
	const allowed = surface === 'service' ? [ProductType.SERVICE] : PRODUCT_PAGE_KINDS;
	return types.filter((type) => allowed.includes(type.value as ProductType));
}

/**
 * Keeps the current type when it belongs on this page.
 * Otherwise stamps the page default: service, or a physical product.
 */
export function typeIdForSurface(
	surface: CatalogCreateSurface,
	types: MerchantProductTypeLike[],
	selectedId?: number,
): number | undefined {
	const allowed = typesForSurface(surface, types);
	if (allowed.length === 0) return undefined;
	if (selectedId != null && allowed.some((type) => type.id === selectedId)) return selectedId;
	const preferred = surface === 'service' ? ProductType.SERVICE : ProductType.ITEM;
	return allowed.find((type) => type.value === preferred)?.id ?? allowed[0]?.id;
}

export function catalogSectionsForKind(kind: string | undefined) {
	const isService = kind === ProductType.SERVICE;
	return {
		showBooking: isService,
		showVariations: true,
		showInventory: !isService,
		fieldNoun: isService ? ('service' as const) : ('product' as const),
	};
}

/** Staff-facing variation copy. A service uses the same Variant; the examples differ. */
export function variationCopyKeys(kind: 'service' | 'product') {
	const service = kind === 'service';
	return {
		titleKey: service ? 'components.productUpdate.serviceVariants' : 'components.productUpdate.productVariants',
		descriptionKey: service ? 'components.productUpdate.addServiceOptions' : 'components.productUpdate.addOptionsVariations',
		tooltipKey: service ? 'components.productUpdate.serviceVariantsTooltip' : 'components.productUpdate.variantsTooltip',
		namePlaceholderKey: service ? 'components.variations.serviceVariationNamePlaceholder' : 'components.variations.variationNamePlaceholder',
	};
}
