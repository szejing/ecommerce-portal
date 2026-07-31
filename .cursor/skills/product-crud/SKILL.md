---
name: product-crud
description: Use when implementing or refactoring Product create, listing, slug-based detail, update, delete, Product forms, Product store actions, image uploads, or product management pages in the Wemotoo CRM Portal.
---

# Product CRUD (portal)

Use this skill when working on product create/read/update/delete behavior so new code follows the established product implementation. For **generic** portal patterns (thin pages, Zod in `~/utils/schema`, `Form*Update`, review summary, delete modal), see **`crud-ui-pages`**.

## Reference files

- `app/stores/Product/Product.ts`
- `app/pages/products/listing.vue`
- `app/pages/products/create.vue`
- `app/pages/products/[slug].vue`
- `app/utils/types/form/product-creation.ts`
- `app/components/Form/Product/Creation.vue`
- `app/components/Form/Product/Update.vue`

## Core pattern

1. Keep Product CRUD business logic in `useProductStore` actions (`getProducts`, `getProduct`, `getProductBySlug`, `createProduct`, `updateProduct`, `deleteProduct`).
2. Keep form payload contracts in `ProductCreate` and `ProductUpdate` from `app/utils/types/form/product-creation.ts`.
3. Keep page files thin: host form components inside `ZPagePanel`; trigger submit from footer via `formRef.submit()`.
4. Keep heavy form UX (section nav, scroll-to-error, review summary, price helpers, relation mapping) in `Form/Product/Creation.vue` and `Form/Product/Update.vue`.

## Store conventions (`app/stores/Product/Product.ts`)

- Use status flags consistently: `loading`, `adding`, `updating`, `exporting`.
- Use `failedNotification` and `successNotification` for user feedback.
- For list queries, use OData params (`$top`, `$skip`, `$count`, `$expand`, `$orderby`, optional `$filter`, `$search`).
- Resolve image uploads in the store before `create`/`update` API calls.
- For partial update, only include defined fields in request body (undefined means no change).
- Reset `new_product` after successful create with `resetNewProduct()`.

## Form/page conventions

- `app/pages/products/create.vue` owns footer actions and leave guard; form component owns validation/submission behavior.
- `app/pages/products/[slug].vue` owns slug-based loading, update/delete footer actions, and clearing `current_product` on route leave.
- `Form/Product/Creation.vue` and `Form/Product/Update.vue` expose `submit()` with `defineExpose`.
- Keep relation mapping explicit before submit (`category_codes`, `tag_ids`, `brand_codes`).
- Preserve confirmation guard for zero `orig_sell_price` before create/update.
- Use `useOverlay` with `ZModalLoading`/`ZModalConfirmation` for loading and confirmations.

## Type and payload rules

- `ProductCreate` is for full create payload and store draft state.
- `ProductUpdate` is partial; omit unchanged fields.
- Keep `thumbnail`/`images` union types (`File` and existing `Image`) compatible with store upload logic.

## When implementing new Product CRUD behavior

1. Update the form type(s) first if payload shape changes.
2. Update store action(s) and keep notifications/loading flags accurate.
3. Update create/update form components to map UI state to payload fields.
4. Keep pages focused on layout, head title, footer actions, and navigation.
5. Add or update tests for changed behavior (store/repository/component flow).
