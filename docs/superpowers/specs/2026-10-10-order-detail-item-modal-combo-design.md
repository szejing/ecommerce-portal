# Order Detail item modal — combo display (CRM)

Companion to [order-detail-combo-nested-items-design](./2026-10-10-order-detail-combo-nested-items-design.md) (list nesting). This spec covers the **edit modal** opened from a Combo Header.

## Goal

When staff open Update Item on a Fixed Combo header, show the included components as **read-only** nested rows. Status remains editable on the **header only** (void header = whole combo). No per-component qty edit and no item/variant swap for MVP.

## Surface

- `app/components/Z/Modal/Order/Detail/Item.vue`
- `app/components/Z/Input/Order/Detail/Item.vue`
- i18n under `components.orderInput` (and reuse `components.orderDetail` where labels already exist)
- Unit source assertions alongside existing order-detail item tests

## Behavior

| Area | MVP |
|------|-----|
| Header identity (code / name) | Display |
| Header status | Editable; Update persists header only |
| Variant swap | Hidden when `line_type === COMBO_HEADER` |
| Component qty / swap | Not allowed |
| Nested components | Read-only: thumb + name (+ variant) + ×qty; no prices |
| Pricing card | Unchanged (header money only) |
| Appointment card | Unchanged (rare on combos; keep existing gate) |
| `COMBO_ITEM` rows | Never open this modal (already excluded from Items workbench) |

Legacy headers with no `COMBO_ITEM` children but `metadata.combo_components`: show the same text fallback as the list (`qty × name`). Prefer nested rows when children exist; do not also show the text list.

## Architecture

**Approach:** Modal resolves children and passes them into the Input (approved).

1. **`ZModalOrderDetailItem`**
   - Treat as combo when `item.line_type === LineType.COMBO_HEADER`.
   - `comboChildren` = `order.items` filtered by `line_type === COMBO_ITEM` and `parent_item_line === item.item_line`.
   - Pass `:combo-items="comboChildren"`, `:line-type="item.line_type"`, and existing header field v-models into `ZInputOrderDetailItem`.
   - Submit path unchanged: update the cloned header item only. Do not send child patches.

2. **`ZInputOrderDetailItem`**
   - New props: `comboItems?: ItemModel[]` (default `[]`), `lineType?: LineType`.
   - `isComboHeader` = `lineType === LineType.COMBO_HEADER` (or equivalent).
   - When combo: hide variant `USelectMenu`; do not fetch variants on mount.
   - When `comboItems.length > 0`: render Includes block (see UI).
   - Else if combo and legacy metadata present: text list fallback.
   - Status + pricing stay as today for the header.

3. **Helpers**
   - Prefer small shared helpers for legacy `metadata.combo_components` parsing if duplication with `Items.vue` is awkward; otherwise keep a thin local copy for MVP. Do not change stores or APIs.

## UI / styling (CRM-dense)

Align with the list nested pattern and existing Input cards (Nuxt UI + Tailwind tokens — not a new design system).

- **Includes section:** inside the first `UCard`, below the identity + status row. Status remains the only editable control in that card. Use a short section label (i18n), e.g. “Includes”, so hierarchy is text+structure (not color alone).
- **Nested rows:** `space-y-1.5`, muted text (`text-xs text-muted`), light elevated surface (`bg-elevated/50`), thumb ≈ 32px, name + optional variant, trailing `×qty` tabular nums. No prices, edit buttons, or preorder badges on children.
- **Spacing:** Tailwind scale only (`gap-2`, `space-y-1.5` / `space-y-4`); match list nested markers via `data-testid="order-item-combo-nested"` / `order-item-combo-child` for consistency.
- **Thumbnails:** same resolve + `@error` → `/svg/product-holder.svg` as Items.vue when thumbs are shown.
- **Icons:** reuse existing `ICONS.*` / Heroicons via Nuxt UI; decorative icons beside visible labels get `aria-hidden="true"`.
- **Heading hierarchy:** keep card titles as existing `h2`; Includes is a labeled block (e.g. `p` / `UFormField` label), not a skipped heading level.
- **Read-only clarity:** children are not interactive (no selects, steppers, or hover affordances that suggest edit).

## Out of scope

- Backend void-cascades or DTO changes (assume header status update already covers combo semantics, or is a separate ticket)
- Editing header qty in this modal (qty is not currently an editable field in the Input template)
- Swapping component products/variants or editing component qty
- Sale-only screens beyond shared components
- Storefront cart/review UI

## Verification

- Unit: Modal/Input source assertions for `combo-items` / `line-type`, nested testids, variant block gated off for combo, legacy metadata fallback marker.
- Manual: open Update on a combo header → see Includes; change status → Update succeeds; no variant control; legacy metadata-only combo shows text list.
- `bun run test:vitest:run` for touched unit specs; `bun run typecheck` when feasible.
