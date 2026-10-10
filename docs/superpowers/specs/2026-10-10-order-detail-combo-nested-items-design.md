# Order Detail combo nested items (CRM)

## Goal

Show Fixed Combo purchases on CRM Order Detail Items the same nested way as storefront cart/review:

```
[COMBO_HEADER]  thumb + identity + qty + price + edit
  [COMBO_ITEM]  smaller thumb + name (+ variant) + qty (no price)
  [COMBO_ITEM]  …
```

Also harden thumbnails: missing URL and broken image both fall back to `/svg/product-holder.svg`.

## Surface

- `app/components/Z/Section/Order/Detail/Items.vue` (desktop `UTable` `#item-cell` and mobile cards)

## Approach

**A — Nested mini-rows inside the header cell/card** (approved).

- Keep one table row / mobile card per `COMBO_HEADER` and normal product.
- `COMBO_ITEM` remains excluded from `ordered_items` via `getOrderItemWorkload` (no separate table rows).
- Replace the plain text include list with indented nested rows when real `COMBO_ITEM` children exist.
- Nested row content: smaller thumb, product name (+ variant name if present), qty only.
- No unit price, line total, edit control, or preorder badge on nested rows.
- Money columns (unit price, qty, line total) stay header-only.
- Header badges (preorder, non-active status), appointment block, and edit stay on the header.

### Thumbnails

- Resolve URL from `item.thumbnail?.url` then `metadata.thumbnail.url`; if empty → `/svg/product-holder.svg`.
- On `@error`, swap `src` to the same placeholder (header and nested).
- Do not invent a new placeholder asset; reuse existing `public/svg/product-holder.svg`.

### Legacy single-line combos

- If a `COMBO_HEADER` has no `COMBO_ITEM` children but has `metadata.combo_components`, keep the existing text list (`qty × name`).
- Prefer nested visual rows when `COMBO_ITEM` children exist; do not also show the text list for those.

## Data / workload

- No change to `getOrderItemWorkload` counting: active lines and units still ignore `COMBO_ITEM`.
- `comboItems(header)` continues to filter `order.items` by `line_type === COMBO_ITEM` and `parent_item_line === header.item_line`.

## Styling (CRM-dense)

- Nested block: muted text, light elevated/neutral background, left indent so hierarchy is obvious under the header thumb+identity.
- Nested thumbs ≈ 32–40px; header thumbs stay 48px (table) / 56px (mobile).
- Preserve existing voided/preorder surface classes on the header card/row.

## Out of scope

- Backend line shape or DTO changes
- Storefront cart/review/order UI
- Sale detail screens other than this shared Items section (if sale reuses it, it inherits automatically)
- Changing edit modal or Line Identity formatting for components

## Verification

- Extend `test/unit/order-detail-items.spec.ts` to assert nested combo markup markers and thumbnail `@error` / placeholder usage.
- Manual: order with combo header + component lines shows nested thumbs; broken image URL shows holder; legacy metadata-only combo still shows text list.
