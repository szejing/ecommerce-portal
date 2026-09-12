import { describe, expect, it, vi } from 'vitest';
import { OrderItemStatus } from 'yeppi-common';
import { getOrderColumns } from '../../app/utils/table-columns/order/order';

vi.mock('#components', () => ({
	UBadge: { name: 'UBadge' },
	UButton: { name: 'UButton' },
	UIcon: { name: 'UIcon' },
	UTooltip: { name: 'UTooltip' },
}));

type NamedVnode = {
	type?: { name?: string } | string;
	props?: Record<string, unknown>;
	children?: unknown;
};

function columnById(id: string) {
	const columns = getOrderColumns((key) => key);
	const column = columns.find((entry) => ('id' in entry && entry.id === id) || ('accessorKey' in entry && entry.accessorKey === id));
	expect(column).toBeTruthy();
	return column!;
}

function renderOrderNoCell(items: Array<{ is_preorder?: boolean; status: OrderItemStatus }>) {
	const cell = columnById('order_no').cell;
	expect(typeof cell).toBe('function');
	return (
		cell as (ctx: { row: { original: { order_no: string; order_date_time: string; items: typeof items } } }) => NamedVnode
	)({
		row: {
			original: {
				order_no: 'ORD-1',
				order_date_time: '12 Sep 2026 19:00:00',
				items,
			},
		},
	});
}

function findNamedVnode(vnode: unknown, name: string): NamedVnode | undefined {
	if (!vnode || typeof vnode !== 'object') return undefined;
	const node = vnode as NamedVnode;
	if (typeof node.type === 'object' && node.type?.name === name) return node;
	if (Array.isArray(node.children)) {
		for (const child of node.children) {
			const found = findNamedVnode(child, name);
			if (found) return found;
		}
	}
	return undefined;
}

describe('getOrderColumns sorting', () => {
	it('disables sorting on the index column', () => {
		expect(columnById('index').enableSorting).toBe(false);
	});

	it('enables sorting on data columns', () => {
		for (const id of [
			'order_no',
			'order_type',
			'customer',
			'status',
			'gross_amt',
			'tax_amt_exc',
			'net_amt',
			'shipping_fee',
			'payable_total',
		]) {
			expect(columnById(id).enableSorting).not.toBe(false);
		}
	});
});

describe('getOrderColumns order_no Pre-order badge', () => {
	it('shows a warning Pre-order badge when an active item is a Pre-order Line', () => {
		const badge = findNamedVnode(renderOrderNoCell([{ is_preorder: true, status: OrderItemStatus.ACTIVE }]), 'UBadge');
		expect(badge?.props?.color).toBe('warning');
	});

	it('hides the Pre-order badge when only voided lines are pre-order', () => {
		expect(findNamedVnode(renderOrderNoCell([{ is_preorder: true, status: OrderItemStatus.VOIDED }]), 'UBadge')).toBeUndefined();
	});

	it('hides the Pre-order badge when no line is pre-order', () => {
		expect(findNamedVnode(renderOrderNoCell([{ is_preorder: false, status: OrderItemStatus.ACTIVE }]), 'UBadge')).toBeUndefined();
	});
});
