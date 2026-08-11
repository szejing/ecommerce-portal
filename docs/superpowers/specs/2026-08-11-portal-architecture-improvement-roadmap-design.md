# Portal Architecture Improvement Roadmap

**Date:** 2026-08-11  
**Status:** Approved for planning  
**Scope:** `wemotoo-portal` only  
**References:** [`CONTEXT.md`](../../../CONTEXT.md), [`ADR-0001`](../../adr/0001-keep-portal-workflows-in-pinia.md)

## Purpose

Deepen four active portal areas so callers learn smaller interfaces, workflow knowledge gains locality, and tests exercise the same seams as production callers. The roadmap preserves merchant-facing behaviour and existing backend contracts.

Approval of this document authorizes phase planning only. Every phase requires a separate implementation-ready plan and explicit approval before code changes begin.

## Problem

Recent changes concentrate in Template Studio, Orders, and Shipment Arrangement. Important workflow rules currently cross Vue files, mutable Pinia state, small helper modules, repository modules, and tests that reach into implementation state.

The recurring friction is architectural:

- Callers coordinate ordering, cancellation, dirty state, pagination, and error handling.
- Pinia interfaces expose state that should be implementation detail.
- Pure helpers are tested in isolation while the highest-risk behaviour lives in how callers assemble them.
- Some tests mutate the same private coordination state that production callers must understand.
- Deleting a helper often spreads its knowledge across callers instead of removing complexity.

The goal is not fewer files or more implementation lines. Depth is measured by leverage at the interface: more behaviour behind less caller knowledge.

## Decisions

### Architectural vocabulary

- A **module** owns an interface and its implementation.
- The **interface** includes observable state, actions, invariants, ordering, errors, and performance expectations.
- A **seam** is where callers and tests meet that interface.
- An **adapter** satisfies an interface at a seam.
- **Depth** gives leverage to callers and locality to maintainers.

### Global shape

- Template Studio, Shipment Arrangement, and Order History remain Pinia-based modules.
- Template Token semantics form a deep in-process module because editor selection is instance-local workflow state.
- Pinia modules are the sole writers of their workflow state.
- Vue modules read workflow state, issue domain-named intent, translate routes, and present confirmations, translations, and notifications.
- Pinia modules own Blob URL, preview-resource, filename, and download lifecycles.
- Existing repository modules remain the internal transport seam.
- Production uses the existing HTTP adapters; tests use in-memory adapters at the same seam.
- No generic workflow or transport module is introduced.

### Interface discipline

Public workflow state is semantic: selected domain data, current outcome, capabilities, loading state, and actionable errors. The following stay private implementation:

- request and generation counters;
- debounce handles and stale-response identity;
- transport payload construction;
- Blob URL bookkeeping;
- coordination flags used only to suppress watchers;
- raw transport errors.

The interface is the test surface. Tests must not need knowledge that production callers do not need.

### Migration discipline

Each phase deepens or replaces its selected module incrementally:

1. Characterize observable behaviour through the current caller-facing seam.
2. Move one coherent responsibility behind the owning interface.
3. Migrate Vue callers to domain-named actions and semantic state.
4. Privatize displaced coordination state.
5. Delete replaced paths and tests that reach past the new interface.

Temporary delegation is allowed inside an active phase. It must be gone before the completion gate. No permanent compatibility facade, parallel state model, runtime feature flag, or speculative shared foundation survives a phase.

## Roadmap

| Priority | Phase                           | Target module                              | Dependency category        | Hard dependency                |
| -------- | ------------------------------- | ------------------------------------------ | -------------------------- | ------------------------------ |
| 1        | Template Studio editing session | Existing Template Studio Pinia module      | Remote but owned           | None                           |
| 2        | Shipment Arrangement workflow   | Existing Shipment Arrangement Pinia module | Remote but owned           | None                           |
| 3        | Template Token semantics        | Deep in-process module with two adapters   | In-process + true external | Template Studio phase complete |
| 4        | Order History discovery         | Dedicated Order History Pinia module       | Remote but owned           | None                           |

The sequence is priority, not universal coupling. Shipment Arrangement and Order History remain independently approvable. Deferring one does not block unrelated phases.

## Phase 1 — Deepen the Template Studio editing session

### Current friction

The existing Pinia implementation already concentrates valuable behaviour: safe cloning, dirty comparison, post-dispatch edit merging, stale-response invalidation, revision transitions, conflict handling, and preview-resource cleanup. Its interface is still wide.

The Template Studio page currently coordinates route selection, dirty-leave checks, preview scheduling, publication confirmation, request ordering, and disposal while reading or writing many Pinia fields directly. Store and Nuxt tests exercise overlapping lifecycle rules through different seams.

Primary evidence:

- `app/stores/DocumentTemplate/DocumentTemplate.ts`
- `app/pages/settings/templates/index.vue`
- `app/repository/modules/document-template/document-template.ts`
- `test/unit/document-template-store.spec.ts`
- `test/nuxt/template-studio-workflow.nuxt.spec.ts`
- `test/nuxt/settings-templates-index.nuxt.spec.ts`

### Target depth

The existing Pinia module owns the full Template Studio editing session:

- Document Template selection lifecycle;
- draft, baseline, and dirty decisions;
- field and block edits;
- preview scheduling and stale-preview outcomes;
- save, test-send, publish, reset, and conflict outcomes;
- revision and activation state;
- stale-response rejection and post-dispatch edit preservation;
- preview Blob URL creation, replacement, and revocation;
- disposal and cleanup.

The Vue seam remains responsible for:

- translating route query changes into selection intent;
- navigating after the store accepts selection intent;
- displaying leave, publish, and reset confirmations;
- translating and presenting semantic outcomes.

Routing and overlay details do not enter the Pinia interface. Vue does not write schedule, error, selection, dirty, preview, or generation state directly.

### Internal adapter seam

The existing Document Template repository interface remains the internal port. The current HTTP implementation is the production adapter; phase tests provide an in-memory adapter. No new generic port is added.

### Preserved invariants

- Drafts save only through explicit merchant intent.
- Email preview remains debounced at approximately 800 milliseconds while dirty.
- PDF preview remains refresh-only.
- The last successful preview remains visible while stale or updating.
- Dirty drafts guard template and route changes.
- A stale request cannot replace a newer selection, preview, revision, or edit.
- Edits made while save, reset, or publish is in flight survive the response.
- Publication requires a saved revision and version validation.
- Conflict reload does not silently discard newer intent.
- Every replaced or discarded preview Blob URL is revoked.

### Test surface and completion gate

- Editing-session tests drive the Pinia interface with an in-memory repository adapter.
- Race tests cover selection changes, overlapping preview requests, post-dispatch edits, conflict reload, and disposal.
- Nuxt tests cover route translation, confirmation presentation, and rendering only.
- Tests stop mutating counters, schedule, errors, dirty state, or selection directly.
- Replaced page-side coordination and its tests are deleted.
- Relevant Pinia, Nuxt, type, and lint checks pass.

### Deletion test

Deleting the deepened Pinia module would spread draft, preview, revision, conflict, and cancellation knowledge back across Vue callers and tests. That complexity must reappear, proving the module earns its seam.

### Stop condition

Return to design if preserving lifecycle behaviour requires changing route semantics or merchant-facing Template Studio behaviour, or if the proposed interface exposes request identity and coordination counters.

## Phase 2 — Deepen the Shipment Arrangement workflow

### Current friction

The Pinia module owns query construction, pending rows, preview/apply requests, page clamping, and download mechanics. The page separately owns filter debounce, watcher suppression, workbook validation, active shipping-method loading, six operation flags, errors, and notifications. The preview modal reaches into Pinia directly.

A page test asserts that apply-owned page clamping must suppress the page watcher to prevent a duplicate fetch. This invariant crosses the current seam.

Primary evidence:

- `app/stores/ShipmentArrangement/ShipmentArrangement.ts`
- `app/pages/orders/shipment-arrangement.vue`
- `app/components/ShipmentArrangement/ImportPreviewModal.vue`
- `app/repository/modules/fulfillment/fulfillment.ts`
- `test/unit/shipment-arrangement-store.spec.ts`
- `test/nuxt/shipment-arrangement-page.nuxt.spec.ts`
- `test/nuxt/shipment-arrangement-import-preview.nuxt.spec.ts`

### Target depth

The existing Pinia module owns the complete Shipment Arrangement workflow:

- filters and active shipping-method options;
- debounced refresh and page-reset rules;
- pagination and final-page clamping;
- allowed workbook validation;
- export, preview, apply, partial-result, and retry outcomes;
- eligibility mapping and concurrency fields;
- download lifecycle and filenames;
- loading and actionable error state.

The page connects semantic Pinia state to Vue presentation. The modal receives state as input and emits intent; it does not reach sideways into Pinia.

### Internal adapter seam

The existing Fulfillment repository interface remains the internal port. The current HTTP implementation is the production adapter; tests provide an in-memory adapter.

### Preserved invariants

- Pending shipments start without a date filter.
- Only `.xlsx` and `.numbers` workbooks are accepted.
- Preview rows marked as errors cannot be applied.
- Valid and warning rows remain eligible.
- `source_updated_at` remains the concurrency value.
- Partial apply outcomes remain visible until dismissed or replaced.
- Applying the final row clamps pagination without a duplicate fetch.
- Active shipping-method options remain independent of Shipping Method listing filters.

### Test surface and completion gate

- Workflow tests drive filters, refresh, export, preview, apply, clamp, and retry through the Pinia interface.
- Fake time verifies debounce behaviour without inspecting its handle.
- In-memory repository outcomes cover success, partial success, failure, and stale concurrency.
- Nuxt tests cover file-picker wiring, presentation, and modal intent only.
- Page watcher-suppression state and direct modal access to Pinia are deleted.
- Relevant Pinia, Nuxt, type, and lint checks pass.

### Deletion test

Deleting the deepened module would reproduce query, debounce, preview, eligibility, apply, clamp, and download knowledge in the page. The workflow complexity must reappear rather than vanish.

### Stop condition

Return to design if the change adds public coordination flags, adds more page watchers, or cannot remove the existing duplicate-fetch suppression path. Defer the phase under YAGNI if Shipment Arrangement is no longer expected to change.

## Phase 3 — Deepen Template Token semantics

### Current friction

Shared token helpers earn some keep, but callers still assemble allowlisting, normalization, insertion, deletion, length acceptance, storage form, and adapter-specific editing behaviour. Contenteditable and Quill integrations separately manage cursor state, controlled self-echo, and rendering mechanics.

Primary evidence:

- `app/utils/document-template.ts`
- `app/components/Z/TemplateStudio/TokenPlainTextInput.vue`
- `app/components/Z/TemplateStudio/RichTextEditor.client.vue`
- `app/components/Z/TemplateStudio/template-token-blot.ts`
- `app/components/Z/TemplateStudio/ContentEditor.vue`
- `test/unit/document-template.spec.ts`
- `test/nuxt/template-studio-editors.nuxt.spec.ts`

### Target depth

A deep in-process Template Token module owns:

- token recognition and normalization;
- allowlist decisions;
- insertion and atomic deletion rules;
- saved placeholder representation;
- length acceptance for semantic edits.

Two adapters establish a real seam:

- the contenteditable adapter owns DOM traversal, selection mapping, caret restoration, and controlled self-echo;
- the Quill adapter owns Delta/embed operations, Quill selection, hydration, serialization, and controlled self-echo.

The shared interface does not mention DOM nodes, Quill ranges, Delta operations, or cursor restoration. Quill is a true external dependency and is mocked only in Quill-adapter tests.

### Preserved invariants

- Only allowlisted Template Tokens render as chips.
- Saved content retains literal Template Token placeholders.
- Deleting a chip removes exactly one token occurrence atomically.
- Subject content remains single-line and pasted newlines are flattened.
- Controlled self-echo cannot drop input or move the caret to the start.
- Rejected over-limit edits restore the prior valid content.
- Multiple editor instances remain isolated.
- Quill retains its approved formats and `@` insertion behaviour.

### Test surface and completion gate

- Shared semantic tests exercise the deep in-process interface directly.
- Contenteditable tests cover DOM selection and self-echo only.
- Quill tests cover embed, hydration, serialization, selection, and self-echo only.
- Duplicated semantic assertions are removed from adapter tests.
- Callers no longer reassemble low-level helper operations.
- Relevant semantic, Nuxt, type, and lint checks pass.

### Deletion test

Deleting the deep semantic module would reproduce token recognition, allowlisting, insertion, deletion, storage, and length rules in both adapters. Cursor mechanics remain local to each adapter and do not count toward the shared module's depth.

### Stop condition

Return to design if the shared interface must expose DOM or Quill cursor mechanics, or if moving a rule into the shared module makes either adapter harder to understand. This phase cannot start until the Template Studio editing-session phase is complete.

## Phase 4 — Deepen Order History discovery

### Current friction

Order History discovery is spread across the Orders page, the broad Order Pinia module, persistence helpers, status and export helpers, the export modal, and repository calls. Callers know URL precedence, stored-status recovery, pagination resets, date and status query syntax, relation expansion, export independence, and browser download mechanics.

The broad Order Pinia interface also exposes unrelated detail mutation and email behaviour, so deepening that whole store would reduce locality.

Primary evidence:

- `app/pages/orders/index.vue`
- `app/stores/Order/Order.ts`
- `app/utils/order-status-filter.ts`
- `app/utils/order-export.ts`
- `app/utils/orders-selected-statuses-storage.ts`
- `app/components/Z/Modal/Order/Export.vue`
- `test/unit/order-status-filter.spec.ts`
- `test/unit/order-export.spec.ts`
- `test/unit/orders-selected-statuses-storage.spec.ts`

### Target depth

A dedicated Order History Pinia module owns:

- URL and stored-status normalization;
- list filters, search, pagination, and reset rules;
- list and urgent-request discovery;
- independent export criteria;
- date, status, relation, and query construction;
- browser download lifecycle and filenames;
- loading, totals, and actionable outcomes.

The existing Order Pinia module retains order-detail mutations and email resend behaviour. Discovery paths move completely to Order History; the two modules never own the same list, filter, pagination, or export state.

The Orders page translates route values into Order History intent and renders state. The export modal supplies independent export intent and never reads list filters implicitly.

### Internal adapter seam

The existing Order repository interface remains the internal port. The current HTTP implementation is the production adapter; tests provide an in-memory adapter. OData remains private implementation.

### Preserved invariants

- URL status wins for the current visit and is persisted.
- Otherwise valid stored statuses win.
- Empty or invalid stored values select every supported status.
- Export criteria remain independent of list criteria.
- Search and filters retain AND semantics.
- Selecting every status emits no status constraint.
- Replacing the dataset resets client sorting.
- Existing default date behaviour remains unchanged.

### Test surface and completion gate

- Order History tests drive route intent, stored values, filters, pagination, discovery, and export through the Pinia interface.
- In-memory repository assertions verify observable request intent without exposing OData to callers.
- Nuxt tests cover route translation, rendering, selection, and independent export-modal intent.
- Discovery state and actions are removed from the broad Order Pinia module.
- Isolated string-helper tests are deleted when their behaviour is covered through the deep interface.
- Relevant Pinia, Nuxt, type, and lint checks pass.

### Deletion test

Deleting the Order History module would spread URL precedence, persistence, query semantics, pagination, discovery, export independence, and download knowledge across the page and modal. Detail mutation knowledge remains outside and does not inflate this module's interface.

### Stop condition

Return to design if migration creates two active sources of Order History truth, if export begins inheriting list filters implicitly, or if the old discovery path cannot be deleted at the completion gate.

## Phase completion evidence

Every phase must demonstrate all of the following before the next approved phase begins:

- Vue modules do not write workflow state owned by Pinia.
- Callers cannot access request counters, debounce handles, transport payloads, or resource bookkeeping.
- Tests and production callers cross the same seam.
- Every preserved invariant has explicit coverage.
- Tests that reach past the interface are deleted.
- Replaced implementation paths are deleted.
- The deletion test proves the deepened module concentrates real complexity.
- Merchant-facing behaviour and backend contracts remain unchanged.
- Focused tests, relevant Nuxt tests, type checking, and touched-file lint checks pass.

No dates or effort estimates appear in this roadmap. Progress is measured by these evidence gates.

## Explicit exclusions

- Backend or shared-contract changes.
- Merchant-facing workflow redesign.
- Runtime feature flags.
- Framework-neutral workflow cores.
- Generic transport or workflow frameworks.
- Unrelated Pinia rewrites.
- New external dependencies.
- Concrete method-level interface designs before phase approval.
- Changes to historical approved design specs or implementation plans.

## Planning handoff

When a phase is selected, its implementation-ready plan must:

1. inspect the then-current source and tests;
2. design the smallest useful interface at the agreed seam;
3. name the old paths and tests to delete;
4. define red-green evidence for every preserved invariant;
5. split work into independently verifiable changes;
6. stop on the phase-specific conditions above.

Completing one phase does not authorize or require the next.
