# Variant Detail Programmatic Modal Design

**Date:** 2026-09-05  
**Status:** Approved for implementation after user review  
**Scope:** `ecommerce-portal` product variant list + detail editor only

## Problem

Variant editing is split awkwardly: the list table edits orig/sale price inline, while SKU/barcode/cost live in a `v-model:open` detail modal. Inventory (manage / pre-order / on-hand) exists for simple products but is not editable per variant in that modal. Staff need a single, easy detail editor opened the same way other portal overlays are.

## Goals

1. Open variant detail via Nuxt UI `useOverlay` programmatic modal (`emit('close', result)`).
2. Keep list table inline orig/sale price editing and Apply to All (option **A**).
3. Expand detail modal to edit: SKU, barcode, orig sell, sale, cost, manage inventory, allow pre-order, on-hand quantity (when managed).
4. On confirm, merge payload into the row and re-emit variants; on cancel/dismiss, leave the row unchanged.

## Non-goals

- Changing product-level inventory card behavior for simple products (no variants).
- Removing inline price editors from the list table.
- Backend API / DTO / migration changes.
- Moving this modal into `Z/Modal/` as a generic shell.

## UX

### List (`Variant/List.vue`)

- Unchanged columns: option labels, orig sell, sale, edit (pencil).
- Apply to All row stays.
- Pencil opens programmatic overlay; no in-template `<ZInputProductVariantDetail v-model:open>`.

### Detail modal (`Variant/Detail.vue`)

- Title: option labels joined (e.g. `Red · M`).
- Fields (draft copy of the variant row):
  - SKU (duplicate check vs other rows)
  - Barcode
  - Original sell price
  - Sale price (normalize invalid on blur, same helper as list)
  - Cost price
  - Inventory: manage inventory, allow pre-order; quantity when manage inventory is on
- Footer: Cancel → `emit('close', undefined)`; Confirm (disabled when SKU duplicate) → `emit('close', payload)`.
- Wider modal (`sm:max-w-lg` or slightly larger) if needed for the extra fields; no nested `UCard` chrome required — plain form sections.

### Inventory reuse

Prefer embedding the same controls as `ZInputProductInventory` (checkboxes + quantity). Either:

- Reuse `ZInputProductInventory` with a draft object and no card chrome if easy, or
- Inline the same fields in Detail to avoid card-in-modal nesting.

Either is fine; prefer the lighter approach that avoids nested card headers.

## Data flow

```
List.openVariantDetail(rowIdx)
  → overlay.create(ZInputProductVariantDetail).open({ title, variant, otherSkus, currencyCode })
  → await instance.result
  → if payload: merge into variantRows[rowIdx], emitVariants()
```

### Confirm payload shape

```ts
{
  sku?: string;
  barcode?: string;
  orig_sell_price?: number;
  sale_price?: number;
  cost_price?: number;
  manage_inventory?: boolean;
  allow_preorder?: boolean;
  inventory_quantity?: number;
}
```

Merge rules on List:

- Write SKU/barcode onto the variant.
- Ensure `price_types[0]` exists before writing price fields.
- Write inventory flags/qty onto the variant.
- Normalize sale price with existing `normalizeSalePrice`.

## Technical notes

- Match Nuxt UI programmatic pattern: modal must `emit('close', value)` so `open()`’s promise resolves.
- Portal already uses `useOverlay` extensively; follow that style (`#components` import of the detail component).
- Remove `defineModel('open')` from Detail; open state is owned by OverlayProvider.
- Draft state initialized from props when the component mounts (overlay creates a fresh instance per open).

## Testing

- Manual: open pencil → edit inventory + prices + SKU → confirm → list reflects changes; cancel leaves row unchanged; duplicate SKU blocks confirm.
- If an existing unit/helper test covers list price apply, leave it; no new backend tests.

## Out of scope / later

- Per-variant weight/dimensions in this modal.
- Read-only list prices (rejected; option A keeps inline editors).
