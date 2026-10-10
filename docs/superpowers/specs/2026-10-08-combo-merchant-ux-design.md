# Combo Merchant UX Design

**Date:** 2026-10-08  
**Status:** Approved for implementation planning  
**Project:** ecommerce-portal  
**Approach:** Portal-only enrichment (no backend/storefront/DTO changes in this slice)

## Relationship to prior work

- Supersedes the narrower portal slice in `2026-10-08-combo-ui-separation-design.md` for remaining implementation.
- Builds on backend Fixed Combo / `ProductCombo` work (ADR 0033, inventory design 2026-10-03) without reopening inventory, cart, or order integrations.
- Defers authoritative `reference_total` / `savings` API fields and storefront savings badges to a later slice.

## Goal

Finish dedicated Combo create/edit UI under `/products/combos/*`, keep Standard product flows free of Composition UI, and make merchant combo setup feel like: select included items, enter one fixed price, see Bought separately / Customer saves.

## Architecture

- Combo remains a Product API entity with `composition: 'fixed_combo'`.
- Portal UI trees:
  - Combo: `Form/Combo/*` + `Z/Input/Combo/*`
  - Standard product: `Form/Product/*` (no Composition / combo-components UI)
- Reuse Product Classification, Pricing shell, LongDescription, ReviewSummary, AdditionalInfo (tax; variations already hidden for `fixed_combo`).
- Keep `useProductStore` (`startNewCombo`, create/update/delete, `getCombos`).
- Pricing comparison is portal-local display math only. It is not persisted and must not mutate component catalog prices.

## Components

| Path | Role |
|------|------|
| `Form/Combo/CreatePage.vue` | Combo create shell |
| `Form/Combo/DetailPage.vue` | Combo detail shell + non-combo guard |
| `Form/Combo/Creation.vue` | Combo create form |
| `Form/Combo/Update.vue` | Combo update form |
| `Form/Combo/UpdateLoading.vue` | Combo update loading skeleton |
| `Z/Input/Combo/BasicInfoSection.vue` | Combo basic info + included items |
| `Z/Input/Combo/ComboComponents.vue` | Included-items table + searchable add modal |
| `Z/Input/Combo/PricingSection.vue` (or thin wrapper) | Fixed combo price + Bought separately / savings |
| `app/utils/combo-pricing.ts` | Decimal-safe reference total and savings helpers |

Product `CreatePage` / `DetailPage` / `Creation` / `Update` / `BasicInfoSection`: no `comboOnly`, no Composition UI, no combo-components.

## Merchant UI

### Included items

Searchable Add-items modal using existing paginated product search:

- Search by name/SKU via existing APIs (no full-catalog load).
- Exact variant required when the product has variants.
- Exclude nested combos and the combo itself.
- Re-selecting an already-added variant increases its quantity.
- New selections start at quantity 1.

Table columns:

| Item | Quantity | Unit price | Line total | Remove |
|------|----------|------------|------------|--------|
| Popcorn | [ − 1 + ] | RM8.00 | RM8.00 | trash |

- Unit price and line total are read-only references.
- Quantity uses ± steppers; values must stay positive integers.
- Helper copy: “Individual prices are shown for reference. Editing this combo does not change the prices of the included items.”
- If a component price cannot be resolved, suppress that row’s money cells and suppress the Pricing comparison (do not invent zero).

### Combo pricing

Show:

- Bought separately: sum of current individual selling prices × quantities.
- Combo selling price: existing editable currency input (fixed price only; no % or amount discount fields).
- Customer saves: `max(0, referenceTotal − comboSellingPrice)`; hide when ≤ 0.

Helper copy: “This combo has a fixed selling price. Changes to individual item prices will not automatically change the combo price.”

If combo price ≥ reference total:

- Non-blocking merchant notice.
- No Customer saves line.
- Do not block save.

### Availability

Keep derived complete-sets readout. No editable parent stock.

Copy: “Availability is calculated from the included items.”

### Layout and actions

One page, not a wizard. Existing Cancel / Save draft / Publish (create) or Save changes (edit). ReviewSummary remains the live preview (beside form on desktop, below on mobile). Advanced settings stay collapsed as today.

## Data flow and money rules

Unit selling price for a component:

- Use `sale_price` when set and > 0, otherwise `orig_sell_price`.
- Must match the combo currency context; otherwise treat as unresolved.

Formulas (portal util):

- `referenceTotal = Σ(unitPrice × quantity)`
- `savings = max(0, referenceTotal − comboSellingPrice)`

Use existing decimal-safe / currency formatting patterns (`yeppi-common` / portal formatters). Do not accumulate with unsafe floating-point.

Hydrate component product/variant price rows into a local map when adding components and when loading an existing combo for edit. Quantity changes recalculate display cells only; they never PATCH component products.

## Validation and errors

On publish / save when published:

- Valid name and combo selling price > 0 (existing product price rules).
- Valid component references; no nested combos / self-reference (backend still authoritative).
- Total component units ≥ 2 (two different items, or quantity 2 of one item).

Draft save keeps the existing looser draft path; do not add a multi-step wizard.

Preserve entered values when an API request fails (existing form pattern). Duplicate-submit protection remains as in current create/update forms.

## Testing

Extend `test/nuxt/product-combos.nuxt.spec.ts` and add a focused unit test for `combo-pricing`:

1. Popcorn RM8 + Coke RM4, combo RM10 → Bought separately RM12, Customer saves RM2.
2. Editing combo price does not change component unit prices in the table.
3. Changing Coke’s loaded unit price to RM5 keeps combo at RM10 and updates reference to RM13.
4. Combo ≥ reference hides savings and shows the non-blocking notice.
5. ± quantity, remove, and re-add merge quantity.
6. Product basic info still has no Composition / Fixed combo UI.
7. Dedicated combo routes/forms still initialize `composition: 'fixed_combo'` and guard non-combo detail.

No backend Jest or storefront tests in this slice.

## Out of scope

- Backend `reference_total` / `savings` DTO fields.
- Storefront savings badge / Bought separately display.
- Cart, checkout, inventory, tax, discount, or migration changes.
- Mix-and-match, optional components, nested combos, automatic promotions.
- Editable independent combo stock quantity.

## Success criteria

Merchant can create Popcorn + Coke at RM10, see Bought separately RM12 and Customer saves RM2, publish from `/products/combos/create`, and edit from `/products/combos/:slug`, while Standard product create/edit remains unchanged.
