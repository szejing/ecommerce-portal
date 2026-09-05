# Variant List Apply-to-All Inventory Design

**Date:** 2026-09-05  
**Status:** Approved via grilling (all recommended answers)  
**Scope:** `ecommerce-portal` Variant List Apply bar only

## Problem

Staff can bulk-set orig/sale prices on all Variants, but Manage Inventory / Allow Pre-order / On Hand Quantity must be edited one-by-one in the Detail modal.

## Goals

1. Extend Apply To All with inventory controls using glossary labels.
2. One Apply button updates prices (filled-only) and inventory (overwrite rules below) for every row.
3. Keep list table columns unchanged (options, prices, pencil).

## Non-goals

- New inventory columns on the table.
- Toast, confirm dialog, or clearing the bar after Apply.
- Backend / DTO / migration changes.

## UX

Two wrapping rows above the table:

1. **Prices** — orig sell, sale (placeholders + currency leading; filled-only on Apply).
2. **Inventory** — Manage Inventory checkbox, Allow Pre-order checkbox (disabled + unchecked when Manage off), On Hand Quantity input (visible only when Manage on), then Apply To All.

Defaults: prices empty; Manage/Allow off; On Hand empty. Leave bar values after Apply.

## Apply rules

| Field | Rule |
|-------|------|
| Orig / Sale | Filled-only (existing); blank skips; sale `0` skips |
| Manage Inventory | Always overwrite all variants |
| Allow Pre-order | Always overwrite; forced `false` when Manage is off |
| On Hand Quantity | When Manage on: blank skips; filled (incl. `0`) writes. When Manage off: leave existing On Hand untouched |

## Data flow

```
applyToAll()
  → applyVariantListPricesToAll(variants, orig, sale)
  → applyVariantListInventoryToAll(variants, manage, allow, qty)
  → emitVariants()
```

## Testing

- Unit: inventory apply helper (manage on/off, blank qty, force allow off, leave qty when manage off).
- Nuxt: Apply bar shows inventory controls; Manage off hides qty / disables Allow.
