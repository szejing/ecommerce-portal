import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('order detail items section', () => {
	it('uses the shareable order items section on the order detail page', () => {
		const page = readFileSync(resolve(process.cwd(), 'app/pages/orders/[order_no].vue'), 'utf8');
		const items = readFileSync(resolve(process.cwd(), 'app/components/Z/Section/Order/Detail/Items.vue'), 'utf8');

		expect(page).toContain('<ZSectionOrderDetailItems v-if="orderForModal" :order="orderForModal" @refresh="onItemsRefresh" />');
		expect(page).not.toContain('order-items-bill-summary');
		expect(items).toContain('order-items-bill-summary');
		expect(items).toContain('refresh: []');
		expect(items).toContain('getOrderDetailItemColumns');
		expect(items).toContain('ZModalOrderDetailItem');
		expect(items).toContain('#item-cell="{ row }"');
		expect(items).toContain('productLineText');
		expect(items).toContain('variantLineText');
		expect(items).toContain('data-testid="order-item-variant-line"');
		expect(items).toContain('class="order-item-variant-line"');
		expect(items).toContain('color: var(--ui-text-highlighted)');
		expect(items).toMatch(/\.order-item-variant-line\s*\{[\s\S]*?font-size:\s*1rem/);
		expect(items).not.toMatch(/variantLineText\(item\)[\s\S]*?text-sm font-semibold leading-5 text-highlighted/);
		expect(items).toContain('formatProductLineIdentity');
		expect(items).toContain('formatVariantLineIdentity');
		expect(items).toContain('wrap-anywhere');
		expect(items).toContain('itemThumbnailUrl');
		expect(items).toContain('product-holder.svg');
		expect(items).toContain('getOrderItemStatusColor');
		expect(items).toContain('whitespace-normal');
		expect(items).not.toContain('prod_name.substring(0, 10)');
		expect(items).not.toContain('column="item"');
	});

	it('lets the item identity wrap and keeps money columns nowrap', () => {
		const columns = readFileSync(resolve(process.cwd(), 'app/utils/table-columns/order/order-detail-item.ts'), 'utf8');

		expect(columns).toContain('whitespace-normal');
		expect(columns).toContain('whitespace-nowrap');
		expect(columns).toContain('TABLE_ALIGN_RIGHT');
		expect(columns).toContain('min-w-0');
	});

	it('loops visible header discounts in the bill summary like taxes', () => {
		const items = readFileSync(resolve(process.cwd(), 'app/components/Z/Section/Order/Detail/Items.vue'), 'utf8');
		const history = readFileSync(resolve(process.cwd(), 'app/utils/types/order-history.ts'), 'utf8');

		expect(history).toMatch(/discounts:\s*OrderDiscountModel\[\]/);
		expect(items).toContain('visibleOrderHeaderDiscounts');
		expect(items).toContain('v-for="discount in header_discounts"');
		expect(items).toContain('discount.disc_desc');
		expect(items).toContain('v-if="discount.disc_code"');
		expect(items).toContain('font-bold not-italic');
		expect(items).toContain('({{ discount.disc_code }})');
		expect(items).toContain('({{ shipping_fee_method_hint }})');
		expect(items).toContain('formatCurrency(discount.disc_amt, currency_code)');
	});
});
