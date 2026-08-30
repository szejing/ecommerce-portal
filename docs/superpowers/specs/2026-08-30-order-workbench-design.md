# Order Workbench Design

## Goal

Turn the merchant Order History detail page into a mobile/tablet-first Order Workbench that helps general admins visually verify order items and carry out payment, fulfillment, communication, and status actions. Fulfillment packing is the primary job; customer-service work remains available as supporting context.

## Domain boundary

- **Visual Verification** means reviewing active item identities, quantities, appointments, and excluded lines before fulfillment.
- Verification is not persisted and creates no picked, checked, or packed state.
- Reuse the current Order History record, payment actions, fulfillment actions, status updates, email resend action, and customer editing.
- Do not reproduce backend completion or delivery gates in the portal and do not derive an authoritative “next action.”

## Information hierarchy

1. Compact order header with order number, date/reference, refresh, and independent Order, Payment, and Fulfillment state summaries.
2. Attention banner when the order has remarks.
3. Order Items visual-verification surface.
4. Processing controls in the order Payment → Fulfillment → Order status → Customer email.
5. Compact customer context, labelled **Ship to** for delivery and **Customer** for pickup.
6. Activity history.

## Order Items

- Header summarizes active lines, active units, and excluded lines.
- Active items appear first; refunded or voided items remain visible in a clearly separated excluded group.
- Phone presentation uses stacked item cards. Product/variant identity and large quantity lead; appointment and item disposition follow; unit price and line total are secondary.
- Tablet/desktop presentation keeps Nuxt UI `UTable`, preserving the existing thumbnail, line-identity, appointment, money-summary, discount, tax, and shipping work already present in the working tree.
- Pending-payment active lines expose an explicit accessible Edit button. Do not rely on row hover/tap or make Completed orders appear editable.

## Responsive processing controls

- Below 1024px, keep the items surface full width and show a safe-area-aware sticky processing bar.
- The sticky bar shows compact Payment and Fulfillment state text plus a **Process order** action.
- The action opens a tall bottom sheet containing Payment, Fulfillment, Order status, then Customer email.
- At 1024px and above, retain the 8/4 layout with a sticky processing sidebar in the same sequence.

## Customer context

- Move customer context below the items and processing surface.
- Delivery orders use a compact **Ship to** card with contact, address, copy, map, and edit capabilities.
- Pickup orders use a compact **Customer** card without emphasizing delivery address.
- Preserve existing customer data and actions; do not change the customer API.

## Correctness and accessibility

- Render every valid overall order status through the shared order-status option/color helpers, including Confirmed and Ready for Pickup.
- Remove `All`, Requires Action, and Refunded from the status-update choices; the latter two remain display states rather than merchant-selected transitions.
- Give the icon-only refresh control an accessible name.
- Make item and payment edit controls native buttons with visible focus states and accessible names.
- Keep touch targets at least 44px and avoid hover-only meaning.
- Use semantic theme tokens, restrained borders, and minimal decorative shadow/motion.

## Out of scope

- Backend, database, or API changes.
- Persisted picking progress, packing progress, checkboxes, or per-item fulfillment state.
- Portal-side enforcement of payment/shipment completion rules.
- New courier booking, batch splitting, or shipment arrangement behavior.

## Verification

- Unit-test item workload partition/count behavior and status-update choices.
- Exercise responsive item structures and explicit edit affordances through focused component tests where feasible.
- Run relevant order-detail unit/Nuxt tests, lint touched files, and run portal typecheck.
- Inspect at phone and tablet widths if a local browser session is available.
