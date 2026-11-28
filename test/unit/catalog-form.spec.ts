import { describe, expect, it } from 'vitest';
import { ProductType } from 'yeppi-common';
import {
	catalogSectionsForKind,
	typeIdForSurface,
	typesForSurface,
	variationCopyKeys,
} from '../../app/utils/catalog-form';

const types = [
	{ id: 1, value: ProductType.ITEM },
	{ id: 2, value: ProductType.SERVICE },
	{ id: 3, value: ProductType.EVENT },
];

describe('catalog create surfaces', () => {
	it('keeps event on the product page and leaves service off that list', () => {
		expect(typesForSurface('product', types).map((type) => type.value)).toEqual([ProductType.ITEM, ProductType.EVENT]);
		expect(typesForSurface('service', types).map((type) => type.value)).toEqual([ProductType.SERVICE]);
	});

	it('stamps the page default and keeps an allowed selection', () => {
		expect(typeIdForSurface('service', types, 1)).toBe(2);
		expect(typeIdForSurface('product', types, 2)).toBe(1);
		expect(typeIdForSurface('product', types, 3)).toBe(3);
		expect(typeIdForSurface('service', [])).toBeUndefined();
	});

	it('shows booking, variations, and no inventory on a service', () => {
		expect(catalogSectionsForKind(ProductType.SERVICE)).toMatchObject({
			showBooking: true,
			showVariations: true,
			showInventory: false,
			fieldNoun: 'service',
		});
		expect(catalogSectionsForKind(ProductType.ITEM)).toMatchObject({ showVariations: true, showInventory: true, showBooking: false });
		expect(catalogSectionsForKind(ProductType.EVENT).fieldNoun).toBe('product');
	});

	it('uses service variation examples on a service and size or color on a product', () => {
		expect(variationCopyKeys('service')).toEqual({
			titleKey: 'components.productUpdate.serviceVariants',
			descriptionKey: 'components.productUpdate.addServiceOptions',
			tooltipKey: 'components.productUpdate.serviceVariantsTooltip',
			namePlaceholderKey: 'components.variations.serviceVariationNamePlaceholder',
		});
		expect(variationCopyKeys('product').titleKey).toBe('components.productUpdate.productVariants');
		expect(variationCopyKeys('product').namePlaceholderKey).toBe('components.variations.variationNamePlaceholder');
	});
});
