# Order Detail — customer card in Header Section (CRM)

## Goal

When staff open an order, customer contact (and delivery ship/bill addresses) should be visible in the **Header Section** without scrolling past Order Items.

## Surface

- `app/pages/orders/[order_no].vue` — Header Section vs main column placement
- Reuse `app/components/Z/Section/Order/Detail/Customer.vue` unchanged in behavior

## Behavior

| Area | MVP |
|------|-----|
| Placement | Full `ZSectionOrderDetailCustomer` inside `.order-header`, after status summary / last-updated |
| Props | Same as today: `customer`, `show-addresses` when order type is delivery, `order-no`, `@refresh` |
| Edit / mailto / tel / copy address / maps | Unchanged |
| Main column | Remove the customer card so it is not duplicated below items |
| Activities | Stay below items (unchanged) |

## Architecture

**Approach:** Full card move (approved).

1. In `[order_no].vue` Header Section, render `ZSectionOrderDetailCustomer` as a full-width grid child (same span pattern as `.order-header-states` / last-updated: `grid-column: 1 / -1`).
2. Remove the Customer Detail block from `.main-wrapper`.
3. Keep the component’s `UCard` content identical. Optional light spacing class on the page wrapper only if nested border feels heavy inside the header shell — do not rewrite Customer.vue for MVP unless a one-line class/`ui` tweak is clearly needed.

## Out of scope

- Compact header strip or splitting contact vs addresses
- API / DTO / store changes
- New i18n keys (reuse existing labels)
- Sale detail page unless it shares this exact template later

## Verification

- Manual: open order detail → customer card visible in header above items; delivery shows addresses; Edit still opens modal and refresh updates header.
- Pickup: addresses hidden (`show-addresses` false) as today.
- No duplicate customer card below items.
