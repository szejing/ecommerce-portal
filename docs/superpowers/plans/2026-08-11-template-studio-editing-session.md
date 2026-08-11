# Template Studio Editing Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deepen the existing Template Studio Pinia module so it owns selection, draft, preview, conflict, publication, reset, and disposal while Vue owns only route translation and overlays.

**Architecture:** Keep `useDocumentTemplateStore` as the caller-facing seam and the existing Document Template repository as its internal transport seam. Convert the store to setup syntax so request identity, debounce handles, serialization, merge, and Blob bookkeeping remain closure-private; expose semantic state and domain-named actions only. Migrate the Template Studio page and tests in vertical slices, replacing page-side orchestration instead of layering a facade over it.

**Tech Stack:** Nuxt 4, Vue 3, Pinia, TypeScript, Vitest, `@nuxt/test-utils`.

## Global Constraints

- Scope is `wemotoo-portal` only; backend contracts do not change.
- Merchant-facing behavior and routes do not change.
- Stateful workflow logic remains Pinia-based.
- Existing Document Template repository methods remain the internal transport seam; no generic transport abstraction or new dependency is added.
- Pinia is the sole writer of Template Studio workflow state and owns preview timers and Blob URLs.
- Vue owns route translation, confirmation overlays, translations, notifications, and editor tab presentation.
- Email preview remains debounced by `EMAIL_PREVIEW_DEBOUNCE_MS` (`800` milliseconds); PDF preview remains refresh-only.
- Tests cross the Pinia interface or the Nuxt page seam and do not mutate coordination state.
- Use Node `/Users/szejinggo/.nvm/versions/node/v20.19.6/bin` for local Nuxt commands because the shell default Node 20.12.1 cannot load the installed ESM parser.
- The full typecheck has pre-existing failures outside Template Studio; compare its output and introduce no new Template Studio diagnostics.

## Agreed Test Seams

1. **Editing-session seam:** `useDocumentTemplateStore` driven through its returned semantic actions with the Nuxt-injected Document Template repository replaced by an in-memory test adapter.
2. **Page seam:** the rendered `/settings/templates` Nuxt page, with assertions limited to route translation, confirmation presentation, localized rendering, and emitted domain intent.

No test may inspect request counters, debounce handles, timer identities, serialized configuration keys, or Blob bookkeeping.

## Target Interface

The store returns semantic state needed for rendering: `summaries`, `selected`, `detail`, `draft`, `preview`, `previewStale`, `revisions`, `isDirty`, loading/action flags, `conflict`, `fieldErrors`, `error`, `summaryError`, `detailError`, `schedule`, and capability getters.

It returns these caller actions:

```ts
type TemplateActivationWindow = {
	startDate: Date | null;
	endDate: Date | null;
};

type TemplatePublishIntent = TemplateActivationWindow & {
	channel: DocumentTemplateChannel;
	templateCode: string;
	revisionId: string;
	revisionNo: number;
};

type TemplatePublishPreparation =
	| { status: 'ready'; intent: TemplatePublishIntent; scheduled: boolean }
	| { status: 'rejected' };

type TemplateResetIntent = {
	channel: DocumentTemplateChannel;
	templateCode: string;
	version: number;
	draftRevisionId: string | null;
};

type TemplateMutationOutcome = 'completed' | 'stale' | 'failed';

loadCatalog(): Promise<void>;
openTemplate(channel: DocumentTemplateChannel, templateCode: string): Promise<void>;
setConfigurationPath(path: string, value: string | number): void;
clearConfigurationOverride(path: string): void;
setBlockEnabled(id: string, enabled: boolean): void;
saveDraft(): Promise<void>;
refreshPreview(): Promise<void>;
sendTest(): Promise<void>;
preparePublish(window: TemplateActivationWindow): TemplatePublishPreparation;
confirmPublish(intent: TemplatePublishIntent): Promise<TemplateMutationOutcome>;
prepareReset(): TemplateResetIntent | null;
confirmReset(intent: TemplateResetIntent): Promise<TemplateMutationOutcome>;
reloadServerVersion(): Promise<void>;
restoreRevision(revisionNo: number): Promise<void>;
dispose(): void;
```

`$reset()` remains available for Pinia test isolation and delegates to the same cleanup path as `dispose()` before restoring initial public state.

---

### Task 1: Stabilize and characterize the current workflow

**Files:**

- Modify: `test/nuxt/template-studio-workflow.nuxt.spec.ts`
- Modify: `test/unit/document-template-store.spec.ts`

**Interfaces:**

- Consumes: Current `useDocumentTemplateStore` behavior.
- Produces: Time-stable characterization tests for activation validation and explicit coverage for stale selection, post-dispatch edits, conflict reload, preview replacement, and disposal.

- [ ] **Step 1: Freeze the date-sensitive publication test before its fixed schedule**

Add the following at the start of `converts local schedule boundaries to UTC for the exact saved draft`:

```ts
vi.useFakeTimers();
vi.setSystemTime(new Date("2026-07-31T00:00:00.000Z"));
```

- [ ] **Step 2: Run the focused workflow test and verify the baseline failure is removed**

Run:

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run test/nuxt/template-studio-workflow.nuxt.spec.ts
```

Expected: PASS. Before this change the fixed 2026-08-07 end date is rejected when the real clock is later.

- [ ] **Step 3: Add a public-seam characterization for overlapping preview requests**

Use deferred in-memory adapter responses, call the current selection and preview actions, resolve the newer preview first, and assert the older preview cannot replace it. Assert only `store.preview`, `store.previewStale`, and visible errors; do not assert counters.

- [ ] **Step 4: Run the unit store suite**

Run:

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run test/unit/document-template-store.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the characterization slice**

```bash
git add test/nuxt/template-studio-workflow.nuxt.spec.ts test/unit/document-template-store.spec.ts
git commit -m "test(template-studio): stabilize editing session invariants"
```

### Task 2: Move preview scheduling behind the Pinia seam

**Files:**

- Modify: `app/stores/DocumentTemplate/DocumentTemplate.ts`
- Modify: `app/pages/settings/templates/index.vue`
- Modify: `test/unit/document-template-store.spec.ts`
- Modify: `test/nuxt/template-studio-workflow.nuxt.spec.ts`

**Interfaces:**

- Consumes: `setConfigurationPath`, `clearConfigurationOverride`, and `setBlockEnabled` edit intent.
- Produces: `refreshPreview(): Promise<void>` and store-owned email debounce/PDF stale behavior.

- [ ] **Step 1: Write a failing store test for edit-owned preview scheduling**

Drive an opened email template through `setConfigurationPath` twice, advance fake time to `EMAIL_PREVIEW_DEBOUNCE_MS - 1`, assert no adapter call, advance one millisecond, and assert one call using the latest configuration. Add the PDF counterpart asserting no adapter call and `previewStale === true`.

- [ ] **Step 2: Run the new tests and verify red**

Expected: FAIL because the page currently owns the deep draft watcher and calls `previewDraft`.

- [ ] **Step 3: Implement the minimal store-owned scheduler**

Create one closure-private timer and request invalidation path. Every accepted edit calls one private `schedulePreviewAfterEdit()` function:

```ts
function schedulePreviewAfterEdit(): void {
  if (!selected.value || !detail.value || !isDirty.value) return;
  if (selected.value.channel === "pdf") {
    if (preview.value) previewStale.value = true;
    return;
  }
  cancelPreviewTimer();
  previewTimer = setTimeout(
    () => void requestPreview({ force: false }),
    EMAIL_PREVIEW_DEBOUNCE_MS,
  );
}
```

`refreshPreview()` cancels pending debounce and requests immediately. `dispose()` cancels the timer and invalidates any response.

- [ ] **Step 4: Run unit tests and make them green**

Expected: PASS.

- [ ] **Step 5: Delete the page draft watcher and its debounce import**

Remove the deep `watch(() => templateStore.draft, ...)` block and stop importing `EMAIL_PREVIEW_DEBOUNCE_MS` in the page. Change the refresh button handler to `templateStore.refreshPreview()`.

- [ ] **Step 6: Narrow the Nuxt workflow tests**

Keep assertions that buttons emit edit/refresh intent and that rendered stale/updating indicators follow store state. Move debounce and PDF edit semantics to the store suite; delete page assertions that rely on the page watcher.

- [ ] **Step 7: Run both focused suites**

Run the unit store and workflow Nuxt files together. Expected: PASS.

- [ ] **Step 8: Commit the preview slice**

```bash
git add app/stores/DocumentTemplate/DocumentTemplate.ts app/pages/settings/templates/index.vue test/unit/document-template-store.spec.ts test/nuxt/template-studio-workflow.nuxt.spec.ts
git commit -m "refactor(template-studio): own preview lifecycle in Pinia"
```

### Task 3: Move publication validation and revalidation behind the Pinia seam

**Files:**

- Modify: `app/stores/DocumentTemplate/DocumentTemplate.ts`
- Modify: `app/pages/settings/templates/index.vue`
- Modify: `test/unit/document-template-store.spec.ts`
- Modify: `test/nuxt/template-studio-workflow.nuxt.spec.ts`

**Interfaces:**

- Produces: `preparePublish(window)` and `confirmPublish(intent)` with the target types defined above.
- Removes from Vue: activation validation, direct `error` writes, direct `schedule` writes, and saved-revision identity checks.

- [ ] **Step 1: Write failing tests for publication preparation**

Assert literal outcomes for invalid dates, non-increasing windows, expired ends, dirty drafts, and missing saved drafts. For a clean saved draft assert:

```ts
expect(store.preparePublish({ startDate: null, endDate: null })).toEqual({
  status: "ready",
  scheduled: false,
  intent: {
    channel: "email",
    templateCode: "order-confirmation",
    revisionId: "draft-1",
    revisionNo: 2,
    startDate: null,
    endDate: null,
  },
});
```

- [ ] **Step 2: Run the preparation tests and verify red**

Expected: FAIL because these actions do not exist.

- [ ] **Step 3: Implement preparation and confirmation minimally**

`preparePublish` validates and copies dates into an immutable intent. `confirmPublish` repeats time validation and verifies selection, dirty state, revision id, and revision number before setting the schedule and dispatching the existing publish request. Return `stale` without transport for changed intent, `failed` for validation/transport failure, and `completed` only after the authoritative response is applied.

- [ ] **Step 4: Add race tests and make the store suite green**

Change the selected template, draft revision, dirty state, and current time between preparation and confirmation in separate tests. Assert the repository adapter is never called and only semantic outcome/error state is observable.

- [ ] **Step 5: Migrate the page to the publication actions**

The page uses `preparePublish` to choose localized confirmation copy and passes its returned intent to `confirmPublish` inside the overlay. Delete `activationError`, `selectionMatches` publication checks, and direct state assignments.

- [ ] **Step 6: Reduce Nuxt publication tests to overlay presentation**

Assert one confirmation opens, its title/message use the preparation result, cancel does not confirm, and confirm passes the exact intent to `confirmPublish`. Keep schedule conversion and stale-intent rules in store tests.

- [ ] **Step 7: Run focused tests and commit**

```bash
git add app/stores/DocumentTemplate/DocumentTemplate.ts app/pages/settings/templates/index.vue test/unit/document-template-store.spec.ts test/nuxt/template-studio-workflow.nuxt.spec.ts
git commit -m "refactor(template-studio): own publication intent in Pinia"
```

### Task 4: Move reset outcome and preview refresh behind the Pinia seam

**Files:**

- Modify: `app/stores/DocumentTemplate/DocumentTemplate.ts`
- Modify: `app/pages/settings/templates/index.vue`
- Modify: `test/unit/document-template-store.spec.ts`
- Modify: `test/nuxt/template-studio-workflow.nuxt.spec.ts`

**Interfaces:**

- Produces: `prepareReset()` and `confirmReset(intent)`.
- Removes from Vue: selection/version/draft-id snapshots and post-reset preview orchestration.

- [ ] **Step 1: Write failing reset-intent tests**

Prepare a reset intent, mutate selection or version before confirmation, and assert `stale` without an adapter call. In the successful case assert `completed`, a clean authoritative draft, revision refresh, and an immediate preview for the still-selected template.

- [ ] **Step 2: Run the tests and verify red**

Expected: FAIL because reset preparation and confirmation do not exist.

- [ ] **Step 3: Implement preparation and confirmation**

Copy selection, version, and draft id into the intent. Revalidate selection and version immediately before dispatch. Preserve post-dispatch edits with the existing merge rules. Refresh revision history and preview only while the same selection remains active.

- [ ] **Step 4: Make the store suite green**

Expected: PASS, including existing post-dispatch field/block edit tests.

- [ ] **Step 5: Migrate the reset overlay**

The page prepares intent before opening the overlay, calls `confirmReset(intent)`, and moves the editor to Content only when the result is `completed`. Delete page snapshots and explicit preview call.

- [ ] **Step 6: Narrow and run Nuxt reset tests**

Keep confirmation and active-tab presentation assertions; move reset race and preview behavior to the store suite.

- [ ] **Step 7: Commit the reset slice**

```bash
git add app/stores/DocumentTemplate/DocumentTemplate.ts app/pages/settings/templates/index.vue test/unit/document-template-store.spec.ts test/nuxt/template-studio-workflow.nuxt.spec.ts
git commit -m "refactor(template-studio): own reset lifecycle in Pinia"
```

### Task 5: Make template selection one editing-session action

**Files:**

- Modify: `app/stores/DocumentTemplate/DocumentTemplate.ts`
- Modify: `app/pages/settings/templates/index.vue`
- Modify: `test/unit/document-template-store.spec.ts`
- Modify: `test/nuxt/settings-templates-index.nuxt.spec.ts`

**Interfaces:**

- Produces: `loadCatalog()` and `openTemplate(channel, templateCode)`.
- Removes from Vue: detail-plus-preview ordering and `selectionOperation` request coordination.

- [ ] **Step 1: Write failing store tests for `openTemplate`**

Assert successful open loads detail and initial preview as one action. Use deferred adapter results to cover A→B and A→B→A selection; assert only the newest detail/preview is visible. Dispose while detail and preview are pending and assert no later visible state changes.

- [ ] **Step 2: Run the new tests and verify red**

Expected: FAIL because callers currently compose `loadDetail` and `previewDraft`.

- [ ] **Step 3: Implement `loadCatalog` and `openTemplate`**

`loadCatalog` preserves independent catalog loading/error state. `openTemplate` resets detail state, selects the requested Document Template, loads authoritative detail, then starts an initial preview only if request identity and selection still match.

- [ ] **Step 4: Make store tests green**

Expected: PASS without inspecting request identity.

- [ ] **Step 5: Simplify page route translation**

Navigation selection performs only `router.replace`. The route watcher resolves the editable summary and calls `openTemplate` after the URL is canonical. Rely on Pinia stale-response rejection and remove `selectionOperation`; retain `isActive` only to prevent post-unmount routing work.

- [ ] **Step 6: Rewrite page fixtures to use the repository seam**

Replace test assignments to `summaries`, `selected`, `detail`, and dirty state with in-memory adapter responses plus `setConfigurationPath`. Spy only on `openTemplate`, route methods, and overlays where the page seam requires intent observation.

- [ ] **Step 7: Run the page and store suites**

Expected: PASS for initial fallback, valid URL, latest-query replay, dirty navigation, leave disposal, and localization.

- [ ] **Step 8: Commit the selection slice**

```bash
git add app/stores/DocumentTemplate/DocumentTemplate.ts app/pages/settings/templates/index.vue test/unit/document-template-store.spec.ts test/nuxt/settings-templates-index.nuxt.spec.ts
git commit -m "refactor(template-studio): deepen selection lifecycle"
```

### Task 6: Privatize coordination state and delete displaced paths

**Files:**

- Modify: `app/stores/DocumentTemplate/DocumentTemplate.ts`
- Modify: `test/unit/document-template-store.spec.ts`
- Modify: `test/nuxt/settings-templates-index.nuxt.spec.ts`
- Modify: `test/nuxt/template-studio-workflow.nuxt.spec.ts`

**Interfaces:**

- Consumes: The target interface above.
- Produces: A setup-style Pinia module whose closure-private implementation owns request generations, timers, transport payload construction, merge helpers, and Blob bookkeeping.

- [ ] **Step 1: Add a failing interface test**

Assert the store does not expose implementation keys:

```ts
expect(Object.keys(store)).not.toEqual(
  expect.arrayContaining([
    "generation",
    "selectionEpoch",
    "editGeneration",
    "mutationGeneration",
    "summariesGeneration",
    "saveGeneration",
    "previewGeneration",
    "publishGeneration",
    "revisionsGeneration",
    "testGeneration",
    "previewedConfigurationKey",
  ]),
);
```

- [ ] **Step 2: Run the interface test and verify red**

Expected: FAIL because option-store state currently exposes every key.

- [ ] **Step 3: Convert the store to setup syntax**

Return only semantic refs, computed capabilities, and the target actions. Keep counters, timer handles, stable serialization, request configuration, mutation application, error parsing, and Blob replacement inside the setup closure or file-private functions. Provide a custom `$reset()` that cancels resources before restoring initial public state.

- [ ] **Step 4: Remove obsolete exposed actions**

Delete caller access to `refreshDirty`, `setBaseline`, `resetDetailSelection`, `resetSelection`, `clearPreview`, `markPreviewStale`, `previewConfigurationKey`, `replacePreview`, `loadDetail`, `loadRevisions`, `configurationForRequest`, `applyDraftRevision`, `applyPublishedRevision`, `applyMutation`, `readFieldErrors`, `readConflict`, `previewDraft`, `publish`, `reset`, `resetTemplate`, `restore`, and `testSend`.

- [ ] **Step 5: Rewrite remaining tests through the target interface**

Replace all direct state mutations used to manufacture workflow behavior. Test adapter inputs may be mutable fixture data; store coordination state may not be. Keep direct assertions on semantic rendered state.

- [ ] **Step 6: Run all three focused suites**

Expected: PASS.

- [ ] **Step 7: Run Template Studio lint and compare typecheck output**

Run:

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx eslint app/stores/DocumentTemplate/DocumentTemplate.ts app/pages/settings/templates/index.vue test/unit/document-template-store.spec.ts test/nuxt/settings-templates-index.nuxt.spec.ts test/nuxt/template-studio-workflow.nuxt.spec.ts
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx nuxt typecheck
```

Expected: touched-file lint passes; typecheck has no new Template Studio diagnostic compared with the recorded baseline.

- [ ] **Step 8: Commit the privacy/deletion slice**

```bash
git add app/stores/DocumentTemplate/DocumentTemplate.ts test/unit/document-template-store.spec.ts test/nuxt/settings-templates-index.nuxt.spec.ts test/nuxt/template-studio-workflow.nuxt.spec.ts
git commit -m "refactor(template-studio): expose only editing session intent"
```

### Task 7: Final verification and review

**Files:**

- Verify: all changed Phase 1 files
- Reference: `docs/superpowers/specs/2026-08-11-portal-architecture-improvement-roadmap-design.md`

**Interfaces:**

- Consumes: Completed Phase 1 diff.
- Produces: Verification evidence and a two-axis Standards/Spec review.

- [ ] **Step 1: Run the complete focused test set**

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run test/unit/document-template-store.spec.ts test/nuxt/settings-templates-index.nuxt.spec.ts test/nuxt/template-studio-workflow.nuxt.spec.ts test/nuxt/template-studio-editors.nuxt.spec.ts
```

- [ ] **Step 2: Run the full test suite once**

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx vitest run
```

Record any pre-existing or unrelated failures verbatim.

- [ ] **Step 3: Run lint, typecheck comparison, and diff checks**

```bash
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx eslint app/stores/DocumentTemplate/DocumentTemplate.ts app/pages/settings/templates/index.vue test/unit/document-template-store.spec.ts test/nuxt/settings-templates-index.nuxt.spec.ts test/nuxt/template-studio-workflow.nuxt.spec.ts
PATH=/Users/szejinggo/.nvm/versions/node/v20.19.6/bin:$PATH npx nuxt typecheck
git diff --check
```

- [ ] **Step 4: Apply the code-review skill**

Use the commit immediately before Task 1 as the fixed point. Review Standards and the Phase 1 roadmap requirements separately, resolve validated findings, and rerun affected checks.

- [ ] **Step 5: Commit review fixes and confirm clean task state**

```bash
git add app/stores/DocumentTemplate/DocumentTemplate.ts app/pages/settings/templates/index.vue test/unit/document-template-store.spec.ts test/nuxt/settings-templates-index.nuxt.spec.ts test/nuxt/template-studio-workflow.nuxt.spec.ts
git commit -m "refactor(template-studio): complete editing session deepening"
git status --short
```

Expected: no uncommitted Phase 1 files remain.
