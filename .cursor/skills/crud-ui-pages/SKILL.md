---
name: crud-ui-pages
description: >-
  Use when adding or refactoring full-entity create, detail, edit, update, or
  delete flows in the Wemotoo CRM Portal, including settings entity forms,
  Form*Creation, Form*Update, schema validation, or review panels.
---

# CRUD UI page logic (portal)

End-to-end pattern for **create**, **read/edit**, **update**, and **delete** for a dashboard entity. Pages stay **thin**; **validation, mapping, and review** live in form components and **`~/utils/schema`**.

Pair with **`page-panel-layout`**, **`nuxt-ui-usage`**, **`i18n-translation`**, **`form-creation`** (create-focused detail), **`listing-page`** (index), and **`implementation-and-tests`**.

## Reference implementations

| Concern | Example |
|--------|---------|
| Create page + footer | `app/pages/settings/shipping/zones/create.vue`, `app/pages/settings/shipping/methods/create.vue` |
| Edit page + load + delete | `app/pages/settings/shipping/zones/[code].vue`, `app/pages/settings/shipping/methods/[id].vue` |
| Create form + schema + review | `app/components/Form/ShippingZone/Creation.vue` |
| Update form + schema + review | `app/components/Form/ShippingZone/Update.vue` |
| Review summary card | `app/components/Form/ShippingZone/ReviewSummary.vue` |
| Zod factories | `app/utils/schema/ShippingZone/Create/ShippingZoneValidation.ts` |
| Store: `current_*` + `new_*` + reset | `app/stores/ShippingZone/ShippingZone.ts` |
| Broader create UX (sections, loading modal) | `form-creation` skill + `app/components/Form/Discount/Creation.vue` |

## Pinia store: `current_*` and `new_*`

For entities where the **create form** binds to **Pinia** (not only local `reactive` in the form), use a **stable** draft and a **separate** slot for the loaded row:

- **`current_<entity>`** — `undefined` or the **API type** (e.g. `ShippingZone | undefined`). Set in **`getXxx` / `getSingle`** (e.g. `this.current_shipping_zone = response.shipping_zone`). Drives the edit page (title, footer visibility) and is passed to **`Form…Update`** as **`initial-…`** when you hydrate from the store.
- **`new_<entity>`** — the **form-fields** shape used by **`Form…Creation`** and **`UForm` `:state`**. Must not share object identity with a global template after resets.

**Initialize the draft** from a file-level **readonly template** and **`structuredClone`** so each store instance gets a **fresh** tree (nested objects like maps are not accidentally shared between sessions or with the template constant):

```ts
const initialEmptyNewXxx: XxxFormFields = { /* scalar defaults, empty arrays, {} for maps */ };

state: () => ({
  current_xxx: undefined as Xxx | undefined,
  new_xxx: structuredClone(initialEmptyNewXxx),
  // …
}),
```

**Reset** after a successful create (or on leave) by replacing with another clone — **not** a shallow copy of the template:

```ts
resetNewXxx() {
  this.new_xxx = structuredClone(initialEmptyNewXxx);
},
```

Call **`resetNewXxx()`** from the **`createXxx` action** after success (as in `createShippingZone`) and/or from **`onMounted`** in `Form…Creation` before filling defaults so revisiting the create page does not show a stale draft. Pair **`useLeavePageGuard`** with a dirty check on **`new_xxx`** when the skill **`form-creation`** applies.

**Alternatives (still valid):** Some flows keep **edit** as **`current_`** in the store but use **local `ref`/`reactive`** for create or update (e.g. `detailMethod` in shipping methods). Choose one approach per entity and stay consistent. Prefer **store-backed `new_*`** when the list filter lives in the same store and create should integrate with the same lifecycle.

## Architecture

1. **Page**: `ZPagePanel` + optional `#footer` — only routing, head title, `formRef.submit()`, store flags for button `:loading`, and **delete confirm** on edit routes. No Zod on the page.
2. **Form component**: `UForm` + **Zod schema** + **state** (`new_*` from `storeToRefs` for create, or reactive model for update) + **`defineExpose({ submit })`**; maps validated `event.data` to API payload and calls store actions.
3. **Schema**: Named factories in `~/utils/schema` (e.g. `CreateXxxValidation(t)`, `UpdateXxxValidation(t)`), wired with **`computed(() => XxxValidation(t))`** when messages need `t`. Register exports in `app/utils/schema/index.ts` when adding new files.
4. **Review summary**: Dedicated **`Form/<Entity>/ReviewSummary.vue`**; **`computed`** in the form builds a small typed object from the same state the schema validates; optional **`subtitleKey`** prop for create vs edit copy.

## Create route (`app/pages/.../create.vue`)

- **`ZPagePanel`**: `id`, `:title` (`t`), `back-to`, **`grow`**.
- Body: **`div.container.w-full.mx-auto`** (add **`py-4`** if the design needs vertical rhythm; shipping examples omit it) wrapping **`Form…Creation ref="formRef"`** and `@saved` if the form emits after success.
- **Footer**: Blurred top border, **desktop** row (cancel + primary), **mobile** column (primary full width first). Primary calls **`onSubmit` → `formRef?.submit()`** only — **do not** call the store from the page for create.
- Script: `storeToRefs` for **`adding`** (or store’s create flag), **`useHead`** title, **`onSaved`** → `navigateTo` list route.
- **Leave guard**: When the store holds a resettable draft, use **`useLeavePageGuard(isDirty, { onLeave: () => store.reset… })`** (see `form-creation`).

## Edit route (`app/pages/.../[id|code].vue`)

- **Load**: In **`onMounted`**, call store **`getXxx(id)`** (or equivalent). Toggle **`isLoading`**; on missing entity, **`navigateTo`** the list. When the store exposes **`current_<entity>`**, assign it in **`getXxx`** and read it on the page; otherwise use a local **`ref`** (see **Pinia store** above).
- **Template**: `Form…UpdateLoading` while loading; `Form…Update` with **`:key`** on stable id when the entity is present; pass **`id`/code** and **`initial-…`** props.
- **Footer**: Render only when the entity is loaded. **Desktop**: delete (start), cancel + save (end). **Mobile**: save full width, then delete + cancel row. Use **`updating`**, **`removing`** from the store for **`UButton` `:loading`**.
- **`onSubmit`**: `formRef?.submit()` only.
- **Delete**: **`useOverlay().create(ZModalConfirmation, { props: { message, action: 'delete', onConfirm, onCancel } })`**, `onConfirm` → store `deleteXxx` → `navigateTo` list. Reuse a single i18n key under **`components.<entity>…`**.

## Form component — validation (`UForm` + Zod)

- **`ref="formRef"`** on `UForm`; **`:schema`** = `computed` from a schema factory; **`:state`** = Pinia draft (**create**) or a **`reactive`/`ref`** form model for **update**.
- **`@submit="submitForm"`** with typed **`FormSubmitEvent<Schema>`**; **`type Schema = z.output<ReturnType<typeof CreateXxxValidation>>`** (or update factory).
- **Create** vs **update** schemas: separate exports when fields differ (e.g. create allows **code** entry; update uses **`code-readonly`** and may omit create-only rules). Shared shape can be factored in the same file.
- **Messages**: Use **`t('validation.<entity>.…')`** in Zod (see `ShippingZoneValidation.ts`). Add keys in **`i18n/locales/en.json`** and **`ms.json`**.
- **Expose** **`submit()`** as `formRef.value?.submit()` and **`defineExpose({ submit })`**.

## Form component — review summary

- **Layout**: `grid` on `UForm`: form **`lg:col-span-9`**, review **`lg:col-span-3`** with **`lg:sticky lg:top-4`**.
- **Data**: A **`computed`** (e.g. `reviewSummary`) derived from the **same** reactive state used by `UForm` so the panel reflects edits live. Use formatted labels (currency, joined lists) and **`t`** for status text.
- **Component**: `Form<Entity>ReviewSummary` with a **documented** interface (e.g. `ShippingZoneReviewSummary`) and presentation-only markup (`UCard`, sections, `dl`/`dt`/`dd`). Pass **`subtitle-key`** for create vs edit when copy differs.
- **Styling**: Align with existing review cards: primary border accent, check icon in header, **`rounded-xl bg-elevated/60`** sections.

## Product-specific CRUD

For **Product** only (store shape, image uploads, section nav, partial update): use **`product-crud`**; still apply the same **page thin / schema in utils / `defineExpose({ submit })`** rules above.

## Checklist (new entity)

- [ ] `CreateXxxValidation` / `UpdateXxxValidation` in `app/utils/schema/…` + exports in `app/utils/schema/index.ts`
- [ ] i18n: `validation.*` + page titles + `components.*Form` review strings
- [ ] `Form…Creation.vue` + `Form…Update.vue` (or shared sections) + `ReviewSummary.vue` if a summary is in scope
- [ ] `create.vue` and `[id|code].vue` pages with footer + delete on edit
- [ ] Store: `current_*`, `new_*` + `initialEmpty…` + `structuredClone` + `resetNew*()` when create uses Pinia draft
- [ ] Tests per **`implementation-and-tests`**
