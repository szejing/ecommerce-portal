/** Portal-local Fixed Combo reference comparison (not persisted). */

export type ComboPriceLine = {
	unitPrice: number | null;
	quantity: number;
	currencyCode?: string | null;
};

export type ComboPriceComparison = {
	referenceTotal: number | null;
	savings: number | null;
	showSavings: boolean;
	comboAtOrAboveReference: boolean;
};

/** Integer minor units to avoid float accumulation. */
export function toMinorUnits(amount: number): number {
	return Math.round(Number(amount) * 100);
}

export function fromMinorUnits(minor: number): number {
	return minor / 100;
}

/**
 * Selling price for comparison: sale_price when set and > 0, else orig_sell_price.
 * Returns null when no reliable price exists.
 */
export function resolveComponentUnitPrice(priceType?: {
	orig_sell_price?: number | null;
	sale_price?: number | null;
} | null): number | null {
	if (!priceType) return null;
	const sale = priceType.sale_price != null ? Number(priceType.sale_price) : null;
	if (sale != null && !Number.isNaN(sale) && sale > 0) return sale;
	const orig = priceType.orig_sell_price != null ? Number(priceType.orig_sell_price) : null;
	if (orig == null || Number.isNaN(orig) || orig < 0) return null;
	return orig;
}

export function computeComboPriceComparison(
	lines: ComboPriceLine[],
	comboSellingPrice: number | null | undefined,
	expectedCurrency?: string | null,
): ComboPriceComparison {
	const empty: ComboPriceComparison = {
		referenceTotal: null,
		savings: null,
		showSavings: false,
		comboAtOrAboveReference: false,
	};
	if (!lines.length) return empty;

	let minorTotal = 0;
	for (const line of lines) {
		if (line.unitPrice == null || Number.isNaN(line.unitPrice) || line.quantity < 1) return empty;
		if (expectedCurrency && line.currencyCode && line.currencyCode !== expectedCurrency) return empty;
		minorTotal += toMinorUnits(line.unitPrice) * line.quantity;
	}

	const referenceTotal = fromMinorUnits(minorTotal);
	const combo = comboSellingPrice != null ? Number(comboSellingPrice) : null;
	if (combo == null || Number.isNaN(combo)) {
		return { referenceTotal, savings: null, showSavings: false, comboAtOrAboveReference: false };
	}

	const savingsMinor = Math.max(0, minorTotal - toMinorUnits(combo));
	const savings = fromMinorUnits(savingsMinor);
	const comboAtOrAboveReference = toMinorUnits(combo) >= minorTotal;
	return {
		referenceTotal,
		savings,
		showSavings: savingsMinor > 0,
		comboAtOrAboveReference,
	};
}

export function totalComboComponentUnits(components: Array<{ quantity: number }> | null | undefined): number {
	return (components ?? []).reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
}
