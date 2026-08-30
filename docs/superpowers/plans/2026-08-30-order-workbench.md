# Order Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved mobile/tablet-first Order Workbench using existing Order History data and processing actions.

**Architecture:** Keep the page as the orchestration boundary, introduce one pure utility for item workload derivation, and deepen the existing Order Detail section components instead of creating a new store or backend state. Render phone item cards and tablet/desktop `UTable` from the same active/excluded partitions; reuse the current sidebar sections in both desktop and bottom-sheet processing surfaces.

**Tech Stack:** Vue 3, Nuxt 4, Nuxt UI v4, TypeScript, Pinia, Tailwind CSS, Vitest, `@nuxt/test-utils`.

**Spec:** `docs/superpowers/specs/2026-08-30-order-workbench-design.md`

## Global Constraints

- No backend, database, API, or persisted verification-state changes.
- Do not duplicate backend payment/shipment completion gates in the portal.
- Preserve the existing uncommitted thumbnail, line-identity, item-status, money-summary, model, column, and test changes in `Items.vue` and its supporting files.
- Below 1024px use full-width items plus a sticky processing bar/sheet; at 1024px use the sticky 8/4 layout.
- Use plain Node-based Nuxt commands; never run portal Nuxt scripts with `bun --bun`.
- Do not commit or discard user-owned working-tree changes.

---

### Task 1: Derive visual-verification workload and valid update states

**Files:**
- Create: `app/utils/order-workbench.ts`
- Create: `test/unit/order-workbench.spec.ts`
- Modify: `app/utils/options/order-status.ts`
- Modify: `app/components/Z/SelectMenu/OrderStatus.vue`
- Modify: `test/unit/order-status-filter.spec.ts`

**Interfaces:**
- Produces: `getOrderItemWorkload(items)` returning `{ activeItems, excludedItems, activeLineCount, activeUnitCount, excludedLineCount }`.
- Produces: `getOrderStatusUpdateOptions(t)` returning merchant-selectable update states without `All`, Requires Action, or Refunded.

- [x] **Step 1: Write failing unit tests**

```ts
expect(getOrderItemWorkload(items)).toMatchObject({ activeLineCount: 2, activeUnitCount: 5, excludedLineCount: 1 });
expect(getOrderStatusUpdateOptions(t).map(({ value }) => value)).not.toContain('All');
```

- [x] **Step 2: Run tests and confirm feature-missing failures**

```bash
bun run test:vitest:run -- test/unit/order-workbench.spec.ts test/unit/order-status-filter.spec.ts
```

- [x] **Step 3: Add the minimal pure derivation and wire the update select to it**
- [x] **Step 4: Re-run the focused tests and confirm they pass**

---

### Task 2: Make Order Items a responsive visual-verification surface

**Files:**
- Modify: `app/components/Z/Section/Order/Detail/Items.vue`
- Modify: `test/unit/order-detail-items.spec.ts`
- Create: `test/nuxt/order-detail-items-workbench.nuxt.spec.ts`

**Interfaces:**
- Consumes: `getOrderItemWorkload(props.order.items)` from Task 1.
- Preserves: current `refresh` emit and `ZModalOrderDetailItem` overlay contract.
- Produces: active/excluded summaries, phone cards, tablet/desktop table, and an explicit Edit control for eligible active items.

- [x] **Step 1: Add a failing component test for workload summary, phone cards, excluded grouping, and Pending Payment edit controls**
- [x] **Step 2: Run the component test and confirm the new workbench affordances are absent**
- [x] **Step 3: Implement the responsive card/table templates while retaining the current line identity, thumbnail, appointment, and totals work**
- [x] **Step 4: Remove hover-only row selection and expose a native Edit button with an accessible label**
- [x] **Step 5: Run the item unit and Nuxt tests and confirm they pass**

---

### Task 3: Recompose the Order Workbench page and processing surfaces

**Files:**
- Modify: `app/pages/orders/[order_no].vue`
- Create: `app/components/Order/Workbench/StatusSummary.vue`
- Create: `test/nuxt/order-workbench-status-summary.nuxt.spec.ts`
- Modify: `i18n/locales/en.json`
- Modify: `i18n/locales/ms.json`

**Interfaces:**
- Consumes: existing `OrderHistory`, shared order/payment/shipment status helpers, and current sidebar section components.
- Produces: three-state operational summary, remarks banner, reordered items/customer/activity layout, and shared processing sequence for desktop/sidebar and mobile/tablet sheet.

- [x] **Step 1: Add a failing component test covering Confirmed/Ready for Pickup display plus Payment and Fulfillment summaries**
- [x] **Step 2: Run the test and confirm the status-summary component is missing**
- [x] **Step 3: Implement `StatusSummary.vue` using display helpers only—no portal-side completion gate**
- [x] **Step 4: Reorder the page, replace hard-coded status branches, add accessible refresh labelling, and create the safe-area processing bar/sheet**
- [x] **Step 5: Add English and Malay labels for workload, processing, state summaries, Ship to, and excluded items**
- [x] **Step 6: Run focused page/status/order-detail tests and confirm they pass**

---

### Task 4: Accessible action polish and full verification

**Files:**
- Modify: `app/components/Z/Section/Order/Detail/Payment.vue`
- Modify as required by test evidence: touched Order Workbench files only

**Interfaces:**
- Preserves: payment overlay behavior and `refresh` emit.
- Produces: keyboard-operable payment rows and clear focus/touch states.

- [x] **Step 1: Add or update the focused payment component test to require native keyboard-operable actions**
- [x] **Step 2: Run it and confirm the current clickable-div behavior fails**
- [x] **Step 3: Convert payment rows to semantic buttons without changing overlay behavior**
- [x] **Step 4: Run all focused Order Workbench tests**

```bash
bun run test:vitest:run -- test/unit/order-workbench.spec.ts test/unit/order-detail-items.spec.ts test/unit/order-status-filter.spec.ts test/nuxt/order-detail-items-workbench.nuxt.spec.ts test/nuxt/order-workbench-status-summary.nuxt.spec.ts test/nuxt/order-detail-fulfillment-batches.nuxt.spec.ts test/nuxt/z-section-order-detail-customer-email.nuxt.spec.ts
```

- [x] **Step 5: Lint touched source/tests, run portal typecheck, inspect the final diff, and compare every design-spec requirement against the implementation**
