---
name: listing-page
description: >-
  Use when adding or refactoring an entity listing, index route with a table,
  browse or manage grid, table filters, pagination, export controls, or selectable
  columns in the Wemotoo CRM Portal.
---

# Listing page (index / table)

Standard pattern for a **dashboard list** of a resource: filters in the toolbar, primary **create** action in the navbar, table with loading skeleton, empty state, and pagination.

Pair with **`page-panel-layout`** (ZPagePanel slots), **`nuxt-ui-usage`** (UTable, UButton, badges), **`i18n-translation`** (titles, placeholders, empty copy), **`shareable-components`** (if the same filter/table block appears twice), and **`implementation-and-tests`** (tests when behavior or data loading changes).

## Reference implementations

| Area        | Example |
|------------|---------|
| Full current page | `app/pages/operation/staff-departments/index.vue` |
| Exportable variant | `app/pages/settings/shipping/zones/index.vue` |
| With status filter + export stub | `app/pages/marketing/discounts/index.vue` |
| Product listing variant | `app/pages/products/listing.vue` |
| Filter only | `app/components/Z/Section/Filter/Brands.vue`, `…/Products.vue`, `…/Discounts.vue` |

## Page shell (`ZPagePanel`)

1. **`id`** — unique kebab-case (e.g. `products-brands`, `discounts-listing`).
2. **`:title`** — navbar title via **`t('nav.*')`** or a domain key; keep consistent with navigation.
3. **`back-to`** — set when this route is a **child** of a hub (e.g. discounts under `/marketing`). Omit for top-level section roots (e.g. brands under products if the product area is the parent).
4. **`#navbar-right`** — primary **create** action:
   - Use **`ZCreateButton`** with **`:to`** to the create route and **`:label`** from **`common.add…`** (e.g. `common.addBrand`, `common.addDiscount`).
   - Do **not** put the main create CTA only in the toolbar; match brands/discounts.
5. **`#toolbar`** — **`ZSectionFilter…`** component that owns search/filters and talks to the same Pinia store as the table.

Default body wrapper: **`div.space-y-6`**.

## Table toolbar

Use **`ZTableToolbar`** immediately below the filter toolbar (still inside `space-y-6`):

- **`v-model`** — `filter.page_size` (or store equivalent).
- **`v-model:selected-column-keys`** — `selectedColumnKeys` from **`useTableColumnVisibility`**.
- **`:page-size-options`** — **`options_page_size`** from **`~/utils/options`**.
- **`:column-options`** — translated **`columnOptions`** whose keys exactly match each table column’s `id` or `accessorKey`.
- **`:export-enabled`** — `true` when the listing is exportable; `false` only if product explicitly skips export.
- **`:exporting`** — from store (`exporting: false` in state until export is implemented).
- **`@update:model-value`** — call store **`updatePageSize`** (or inline `await store.updatePageSize`); same behavior as brands.
- **`@export`** — handler that calls store export when implemented; may be a stub with commented `await store.export…()` like brands.

## Loading and table

1. **`initialize`** (or equivalent) **`ref(true)`**: on **`onMounted`**, set true, **`await store.get…()`**, then false in **`finally`**.
2. While **`initialize`**: skeleton block matching table density — **`rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700`**, header row skeleton + **`v-for`** row skeletons (copy **`brands/index.vue`**).
3. **`UTable`** when not initializing: **`:data`**, **`:columns="visibleColumns"`**, **`:loading="loading"`**, **`@select`** for row navigation or modal.
4. **`#empty`**: centered column, **`ICONS.ADDITIONAL`**, **`pages.no…Found`**, and a second line **`pages.tryAdjustingFilters`** (same as brands).

## Pagination

When **`!initialize && rows.length > 0`**, wrap **`UPagination`** in **`div.section-pagination`**:

- **`v-model`** — `filter.current_page`
- **`:items-per-page`** — `filter.page_size`
- **`:total`** — store total count
- **`@update:page`** — `store.updatePage`

## Script conventions

- **`useHead({ title: () => t('pages.*Title') })`** — document title pattern **`Wemotoo CRM - …`** (see **`pages.brandsTitle`**, **`pages.discountsTitle`**), not only `nav.*`.
- **Columns**: **`import { getEntityColumns } from '~/utils/table-columns'`** and **`computed(() => getEntityColumns(t))`**.
- **Column options**: define a key-to-i18n-label map, pass it to **`columnOptionsFromLabelMap(t, LABELS)`**, then call **`useTableColumnVisibility(columns, columnOptions)`**. Use explicit option objects for composite labels. Pass **`visibleColumns`** to `UTable`.
- **Store**: **`storeToRefs`** for **`loading`**, list array, **`filter`**, total count, **`exporting`** when export UI is shown.

## Filter component (`Z/Section/Filter/<Entity>.vue`)

Auto-import name: **`ZSectionFilter<Entity>`** (PascalCase entity, e.g. **`ZSectionFilterDiscounts`**).

- Root **`div.w-full`**.
- **Grid** pattern: align with **`Brands`** (search + actions) or **`Products`** / **`Discounts`** (search + optional **status** or other selects + actions): **`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3`**.
- **Search**: **`UInput`** with **`v-model="filter.query"`**, **`@input="debouncedSearch"`**, label **`t('components.filter.searchLabel')`** or **`search`**, placeholder from **`t('components.filter.search…')`** (add a dedicated key per entity; do not hardcode English only if the rest of the app uses i18n for placeholders).
- **Actions**: Clear (**`components.filter.clear`**) + Search (**`components.filter.search`**) with loading/disabled tied to store **`loading`**.
- **Active filters**: row of **`UBadge`** + **`components.filter.activeFilters`**; removable badges call **`clearFilter`** then **`search`**.
- **Cleanup**: **`onUnmounted`** clear debounce timeout.
- **Store**: only read/write the **list** store’s **`filter`** and call its **`get…()`** refresh method.

## Pinia store expectations

For listing pages, the store usually exposes:

- **`filter`**: at least **`query`**, **`current_page`**, **`page_size`**; optional **`status`** or others for OData **`$filter`/`$search`**.
- **`get…()`**: loads current page; respects **`filter`**.
- **`updatePage` / `updatePageSize`**: adjust pagination and refetch.
- **`exporting`**: boolean for toolbar when export is wired later.

## i18n checklist

Add or reuse keys in **`i18n/locales/en.json`** and **`ms.json`**:

| Key | Purpose |
|-----|---------|
| **`common.add…`** | `ZCreateButton` label |
| **`pages.…Title`** | Browser title for the listing |
| **`pages.no…Found`** | Empty state primary line |
| **`pages.tryAdjustingFilters`** | Empty state secondary line (shared) |
| **`components.filter.search…`** | Search placeholder for the entity |

Table headers and cell labels live with **`get…Columns(t)`** — follow **`i18n-translation`** skill.

## When not to use

- **Detail or edit** pages — use **`page-panel-layout`** only, or feature-specific skills.
- **Create** flows — use **`form-creation`**.
- **Analytics / summaries** with date presets — reuse existing **`Z/Section/Filter/SaleSumm/*`** patterns rather than inventing a second layout language.
