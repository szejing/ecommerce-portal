import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('order detail fulfillment owner', () => {
	it('defaults missing and unknown query types to order behavior', () => {
		const source = readFileSync(resolve(process.cwd(), 'app/pages/orders/[order_no].vue'), 'utf8');

		expect(source).toContain('type.value === \'sale\' ? \'sale\' : \'order\'');
		expect(source.match(/type\.value === 'order'/g) ?? []).toHaveLength(0);
		expect(source).toContain('orderStore.open(order_no_param.value, ownerType.value, { silent: !!order.value })');
		expect(source).toContain('orderStore.updateStatus(new_status)');
		expect(source).toContain('sessionLoading.value && !order.value');
	});

	it('passes fulfillment context and the resolved action through the global resend control', () => {
		const source = readFileSync(resolve(process.cwd(), 'app/pages/orders/[order_no].vue'), 'utf8');

		expect(source).toContain('fulfillments: current.fulfillments,');
		expect(source).toContain('orderStore.resendCurrentStatusEmail(resend_email_action.value)');
	});

	it('shows the customer email section only when the current status has a resend action', () => {
		const source = readFileSync(resolve(process.cwd(), 'app/pages/orders/[order_no].vue'), 'utf8');
		const customerEmailBlocks = source.match(/<ZSectionOrderDetailCustomerEmail[\s\S]*?\/>/g) ?? [];

		expect(customerEmailBlocks).toHaveLength(2);
		for (const block of customerEmailBlocks) {
			expect(block).toContain('v-if="resend_email_action"');
		}
	});

	it('places delivery fulfillment controls in the desktop sidebar and mobile actions drawer', () => {
		const source = readFileSync(resolve(process.cwd(), 'app/pages/orders/[order_no].vue'), 'utf8');
		const occurrences = source.match(/<FulfillmentBatchList/g) ?? [];

		expect(occurrences).toHaveLength(2);
		expect(source.indexOf('<FulfillmentBatchList')).toBeGreaterThan(source.indexOf('<!-- Sidebar (desktop) -->'));
		expect(source.match(/v-if="orderForModal && \(record\?\.order_type \?\? OrderType\.PICKUP\) === OrderType\.DELIVERY"/g) ?? []).toHaveLength(2);
		expect(source.match(/:owner-type="ownerType"/g) ?? []).toHaveLength(2);
		expect(source.match(/@refresh="getOrderDetails"/g) ?? []).toHaveLength(2);
	});

	it('composes the workbench around items first and processing prerequisites in sequence', () => {
		const source = readFileSync(resolve(process.cwd(), 'app/pages/orders/[order_no].vue'), 'utf8');
		const desktop = source.slice(source.indexOf('<!-- Sidebar (desktop) -->'), source.indexOf('<!-- Mobile:'));
		const mobile = source.slice(source.indexOf('<!-- Mobile:'));

		expect(source).toContain('<OrderWorkbenchStatusSummary');
		expect(source).toContain('@update:shipment-status="handleWorkbenchShipmentStatusChange"');
		expect(source).toContain('fulfillmentStore.runAction(batch.id, action)');
		expect(source).toContain(':aria-label="t(\'components.orderDetail.refresh\')"');
		expect(source.indexOf('data-testid="order-attention"')).toBeLessThan(source.indexOf('<ZSectionOrderDetailItems'));
		expect(desktop.indexOf('<ZSectionOrderDetailPayment')).toBeLessThan(desktop.indexOf('<FulfillmentBatchList'));
		expect(desktop.indexOf('<FulfillmentBatchList')).toBeLessThan(desktop.indexOf('<ZSectionOrderDetailOrderStatus'));
		expect(mobile.indexOf('<ZSectionOrderDetailPayment')).toBeLessThan(mobile.indexOf('<FulfillmentBatchList'));
		expect(mobile.indexOf('<FulfillmentBatchList')).toBeLessThan(mobile.indexOf('<ZSectionOrderDetailOrderStatus'));
	});

	it('places the customer card in the header section before order items', () => {
		const source = readFileSync(resolve(process.cwd(), 'app/pages/orders/[order_no].vue'), 'utf8');
		const headerEnd = source.indexOf('<!-- Main Grid Layout -->');
		const header = source.slice(source.indexOf('<!-- Header Section -->'), headerEnd);
		const mainColumn = source.slice(headerEnd, source.indexOf('<!-- Sidebar (desktop) -->'));
		const customerCardMatches = source.match(/<ZSectionOrderDetailCustomer[\s\n]/g) ?? [];

		expect(header).toContain('<ZSectionOrderDetailCustomer');
		expect(header).toContain('class="order-header-customer"');
		expect(header).toContain('class="order-header-divider"');
		expect(header).toContain(':show-addresses="(record?.order_type ?? OrderType.PICKUP) === OrderType.DELIVERY"');
		expect(header).toContain('@refresh="refreshOrder"');
		expect(header.indexOf('order-header-right')).toBeLessThan(header.indexOf('status-last-updated'));
		expect(header.indexOf('status-last-updated')).toBeLessThan(header.indexOf('order-header-states'));
		expect(header.indexOf('order-header-divider')).toBeLessThan(header.indexOf('<ZSectionOrderDetailCustomer'));
		expect(mainColumn).not.toMatch(/<ZSectionOrderDetailCustomer[\s\n]/);
		expect(customerCardMatches).toHaveLength(1);
		expect(source.indexOf('<ZSectionOrderDetailCustomer')).toBeLessThan(source.indexOf('<ZSectionOrderDetailItems'));
		expect(source).toContain('.order-header-customer');
		expect(source).toMatch(/\.order-header-customer\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/);
	});
});
