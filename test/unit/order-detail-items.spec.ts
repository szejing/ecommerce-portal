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
		expect(items).toContain('ZSectionOrderDetailItemIdentity');
		expect(items).toContain('formatProductLineIdentity');
		expect(items).toContain('formatVariantLineIdentity');
		expect(items).toContain('itemThumbnailUrl');
		expect(items).toContain('product-holder.svg');
		expect(items).toContain('getOrderItemStatusColor');
		expect(items).toContain('whitespace-normal');
		expect(items).not.toContain('prod_name.substring(0, 10)');
		expect(items).not.toContain('column="item"');

		const identity = readFileSync(resolve(process.cwd(), 'app/components/Z/Section/Order/Detail/ItemIdentity.vue'), 'utf8');
		expect(identity).toContain('data-testid="order-item-product-line"');
		expect(identity).toContain('data-testid="order-item-variant-line"');
		expect(identity).toContain('class="order-item-product-line"');
		expect(identity).toContain('class="order-item-variant-value"');
		expect(identity).toContain('components.orderDetail.variant');
		expect(identity).toContain('color: var(--ui-text-highlighted)');
		expect(identity).toContain('color: var(--ui-text)');
		expect(identity).toMatch(/\.order-item-product-line\s*\{[\s\S]*?font-weight:\s*600/);
		expect(identity).toMatch(/\.order-item-variant-value\s*\{[\s\S]*?font-size:\s*0\.8rem/);
		expect(identity).not.toMatch(/variantText[\s\S]*?text-sm font-semibold leading-5 text-highlighted/);
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
