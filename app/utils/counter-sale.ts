export function mobileDigits(value: string): string {
	return value.replace(/\D/g, '');
}

export function isCounterSaleMobile(value: string): boolean {
	const digits = mobileDigits(value);
	return digits.length >= 6 && digits.length <= 15;
}

export function counterSaleLineTotal(unit: number, qty: number): number {
	return Math.round(unit * qty * 100) / 100;
}

export function catalogUnitPrice(price: {
	orig_sell_price: number;
	sale_price?: number | null;
}): number {
	const orig = Number(price.orig_sell_price);
	const sale = price.sale_price == null ? null : Number(price.sale_price);
	return sale != null && sale > 0 && sale < orig ? sale : orig;
}

export function canContinueCounterSale(lineCount: number, mobile: string): boolean {
	return lineCount > 0 && isCounterSaleMobile(mobile);
}

export function counterSaleErrorMessage(error: unknown, fallback: string): string {
	if (typeof error !== 'object' || !error || !('data' in error)) return fallback;
	const message = (error as { data?: { message?: string | string[] } }).data?.message;
	if (Array.isArray(message)) return message.join(' ');
	if (typeof message === 'string' && message) return message;
	return fallback;
}
