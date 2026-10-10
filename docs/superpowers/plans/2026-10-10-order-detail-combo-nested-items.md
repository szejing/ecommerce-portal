# Order Detail Combo Nested Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nest `COMBO_ITEM` under `COMBO_HEADER` inside CRM Order Detail Items (Approach A) and harden thumbnail fallback with `@error`.

**Architecture:** Keep one row/card per header via existing `getOrderItemWorkload`. Replace the text-only include list with indented mini-rows when `comboItems(header)` is non-empty. Extract a small thumbnail helper component (or inline reactive src + `@error`) so header and nested thumbs share the same placeholder behavior. Legacy `metadata.combo_components` text list remains when there are no `COMBO_ITEM` children.

**Tech Stack:** Nuxt 4, Vue 3, Nuxt UI `UTable`, Vitest unit (file-content assertions in `test/unit/order-detail-items.spec.ts`).

## Global Constraints

- Placeholder asset: `/svg/product-holder.svg` only (no new image).
- Nested rows: thumb + name (+ variant) + qty; no price, edit, or preorder badge.
- Do not change `getOrderItemWorkload` semantics.
- Ship with tests per portal `implementation-and-tests` skill.

---

### Task 1: Failing unit assertions for nested combo UI + thumbnail error fallback

**Files:**
- Modify: `test/unit/order-detail-items.spec.ts`
- Modify: `app/components/Z/Section/Order/Detail/Items.vue` (later in Task 2)

**Interfaces:**
- Consumes: existing source-string assertions pattern in `order-detail-items.spec.ts`
- Produces: assertions that fail until Items.vue gains nested combo markup and `@error` thumbnail handling

- [ ] **Step 1: Write the failing test**

Add a new `it` block to `test/unit/order-detail-items.spec.ts`:

```ts
it('nests COMBO_ITEM under COMBO_HEADER with thumbnail error fallback', () => {
	const items = readFileSync(resolve(process.cwd(), 'app/components/Z/Section/Order/Detail/Items.vue'), 'utf8');

	expect(items).toContain('data-testid="order-item-combo-nested"');
	expect(items).toContain('data-testid="order-item-combo-child"');
	expect(items).toContain('@error');
	expect(items).toContain('onThumbnailError');
	expect(items).toContain('product-holder.svg');
	expect(items).toContain('metadata?.combo_components');
	// Nested qty only — no price formatting on children
	expect(items).toMatch(/order-item-combo-child[\s\S]*?child\.qty/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:vitest:run -- test/unit/order-detail-items.spec.ts`

Expected: FAIL — missing `order-item-combo-nested` / `onThumbnailError`.

- [ ] **Step 3: Commit** (optional if executing in one batch; otherwise commit failing test first)

```bash
git add test/unit/order-detail-items.spec.ts
git commit -m "test: assert nested combo rows and thumbnail error fallback"
```

---

### Task 2: Implement nested combo rows + thumbnail `@error` in Items.vue

**Files:**
- Modify: `app/components/Z/Section/Order/Detail/Items.vue`
- Test: `test/unit/order-detail-items.spec.ts`

**Interfaces:**
- Consumes: `comboItems(item)`, `itemThumbnailUrl(item)`, `PRODUCT_THUMBNAIL_FALLBACK`, `ItemModel`
- Produces: nested UI under header identity; `thumbnailSrcFor` / reactive map or per-img `@error` handler; legacy text list when no children

- [ ] **Step 1: Thumbnail error handling**

Replace bare `<img :src="itemThumbnailUrl(...)">` with a pattern that:
1. Uses `itemThumbnailUrl` as initial src
2. On `@error`, sets src to `PRODUCT_THUMBNAIL_FALLBACK` if not already

Minimal approach (no new file): track broken URLs in a `Set` ref keyed by `item_line`, or use `@error` with `$event.target.src = PRODUCT_THUMBNAIL_FALLBACK` carefully (only once). Prefer:

```ts
const brokenThumbnailLines = ref(new Set<number>());

const resolvedThumbnailUrl = (item: ItemModel) => {
	if (brokenThumbnailLines.value.has(item.item_line)) return PRODUCT_THUMBNAIL_FALLBACK;
	return itemThumbnailUrl(item);
};

const onThumbnailError = (item: ItemModel) => {
	if (brokenThumbnailLines.value.has(item.item_line)) return;
	const next = new Set(brokenThumbnailLines.value);
	next.add(item.item_line);
	brokenThumbnailLines.value = next;
};
```

Template:

```vue
<img
	:src="resolvedThumbnailUrl(item)"
	:alt="..."
	@error="onThumbnailError(item)"
/>
```

Apply on header (mobile + table) and nested child thumbs.

- [ ] **Step 2: Nested combo markup (mobile + desktop)**

Replace the current text-only combo `<ul>` when `comboItems(item).length` with:

```vue
<div v-if="comboItems(item).length" data-testid="order-item-combo-nested" class="mt-2 space-y-1.5">
	<div
		v-for="child in comboItems(item)"
		:key="child.item_line"
		data-testid="order-item-combo-child"
		class="flex items-center gap-2 rounded-md bg-elevated/50 py-1.5 pl-2 pr-2"
	>
		<img
			:src="resolvedThumbnailUrl(child)"
			:alt="child.prod_name || t('table.productThumbnail')"
			width="32"
			height="32"
			class="size-8 rounded object-cover shrink-0 bg-elevated"
			@error="onThumbnailError(child)"
		/>
		<div class="min-w-0 flex-1">
			<p class="truncate text-xs text-muted">
				{{ child.prod_name }}
				<template v-if="child.prod_variant_name"> ({{ child.prod_variant_name }})</template>
			</p>
		</div>
		<span class="shrink-0 text-xs font-medium tabular-nums text-muted">×{{ child.qty }}</span>
	</div>
</div>
<ul
	v-else-if="legacyComboComponents(item).length"
	class="text-xs text-muted"
>
	<li v-for="(component, idx) in legacyComboComponents(item)" :key="idx">
		{{ component.quantity }} × {{ component.product_name }}
		<template v-if="component.variant_name"> ({{ component.variant_name }})</template>
	</li>
</ul>
```

Add helper:

```ts
type LegacyComboComponent = {
	quantity: number;
	product_name: string;
	variant_name?: string;
};

const legacyComboComponents = (item: ItemModel): LegacyComboComponent[] => {
	if (item.line_type !== LineType.COMBO_HEADER) return [];
	if (comboItems(item).length) return [];
	const raw = item.metadata?.combo_components;
	if (!Array.isArray(raw)) return [];
	return raw
		.map((entry) => {
			if (!entry || typeof entry !== 'object') return null;
			const row = entry as Record<string, unknown>;
			const product_name = String(row.product_name ?? '').trim();
			if (!product_name) return null;
			return {
				quantity: Number(row.quantity) || 0,
				product_name,
				variant_name: row.variant_name ? String(row.variant_name) : undefined,
			};
		})
		.filter((row): row is LegacyComboComponent => row !== null);
};
```

Mirror the same nested / legacy blocks in both mobile cards and `#item-cell`.

- [ ] **Step 3: Run tests**

Run: `bun run test:vitest:run -- test/unit/order-detail-items.spec.ts`

Expected: PASS

- [ ] **Step 4: Typecheck / lint when feasible**

Run: `bun run typecheck` (and `bun run lint` if quick)

- [ ] **Step 5: Commit**

```bash
git add app/components/Z/Section/Order/Detail/Items.vue test/unit/order-detail-items.spec.ts
git commit -m "feat(orders): nest combo items under header with thumbnail fallback"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Nested mini-rows under header | Task 2 |
| Smaller thumb + name + qty, no price | Task 2 |
| Missing URL → product-holder | existing + Task 2 |
| `@error` → product-holder | Task 2 |
| Legacy metadata text list | Task 2 |
| Workload unchanged | no change |
| Unit test coverage | Task 1–2 |
