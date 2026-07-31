---
name: repository-module-creation
description: >-
  Use when adding or refactoring an HttpFactory API client module, repository
  request or response models, MerchantRoutes domain, API plugin registration, or
  repository integration tests in the Wemotoo CRM Portal.
---

# Repository module creation

End-to-end checklist for a new **`app/repository/modules/{domain}/`** client, following **`product`** (wrapped responses) and **`discount`** (flat entity + optional unwrap).

Pair with **`implementation-and-tests`** when adding or changing repository behavior.

## 1. Routes

- **`app/repository/routes.client.ts`**: add a namespace (e.g. `MerchantRoutes.Products`) with **`API_PATH`** from `yeppi-common`; methods return path strings — `Many()`, `Single(id)`, `Create()`, `Update(id)`, `Delete(id)`, `Restore(id)` as needed.
- **`server/`**: if the portal proxies this resource, add matching handlers using the same path builders (see **`server-routes`** rule).

## 2. Folder layout

```
app/repository/modules/{domain}/
├── {domain}.ts
└── models/
    ├── request/
    │   ├── create-{domain}.req.ts
    │   ├── update-{domain}.req.ts
    │   └── {domain}.req.ts          # e.g. { code } for delete/restore-style calls
    └── response/
        ├── {domain}.resp.ts
        └── create-{domain}.resp.ts  # when create response shape differs or you want parity with product
```

## 3. Request types (`models/request/`)

- **`Create{Domain}Req`**: body for POST create; match backend DTOs / Nest `CreateXxxDto`. Nested DTO rows (e.g. conditions) as named types in the same file unless they are shared across modules.
- **`Update{Domain}Req`**: usually `Partial<Create{Domain}Req>` in **`update-{domain}.req.ts`** (import create req).
- **`{Domain}Req`**: minimal identifier for **`delete`/`restore`** when the pattern matches **`ProductModule.delete(product: ProductReq)`** — e.g. `{ code: string }`.

Use **`type`**, **`yeppi-common`** enums where applicable, and **`BaseODataReq`** for list query params.

## 4. Response types (`models/response/`)

- **Canonical domain entity**: if the API returns the same shape as an app-wide model, **import it from `~/utils/types/{domain}`** and alias resp types to it — do **not** maintain a parallel `XxxResponse` interface with `string` instead of enums.
- **List**: `Paginated{Domain}Resp` = **`BaseODataResp<Entity>`** when OData list matches **`getMany`**.
- **Wrapped vs flat**:
  - **Product-style**: `ProductResp = { product: Product }`, `CreateProductResp = { count; product }`.
  - **Discount-style**: `DiscountResp = Discount` (flat entity). If the backend wraps the entity in `{ data: … }`, add a small **`unwrapXxxPayload(raw: unknown)`** helper and use it in create/get/update/delete before returning.

## 5. Module class (`{domain}.ts`)

- **`class XxxModule extends HttpFactory`**
- Use **`this.call<T>({ method, url, body?, query? })`**; type the promise return as **`Promise<…Resp>`**.
- Optional **`private RESOURCE = MerchantRoutes.Xxx`** and template URLs like **`${this.RESOURCE.Many()}`** (see **product**).
- **Delete**: prefer **`remove(entity: XxxReq)`** / **`delete(product: ProductReq)`** — URL built from **`entity.code`**, not a bare string param, when that matches existing modules.

## 6. Wire-up

- **`app/repository/modules/index.ts`**: import default class, add to **`export { … }`**.
- **`app/plugins/01.api.ts`**: add to **`IApiInstance`**, instantiate **`new XxxModule()`**, assign on the **`modules`** object.

## 7. Consumers

- **Pinia stores / components**: import **request** types from **`~/repository/modules/{domain}/models/request/...`**; use **`~/utils/types/{domain}`** for list rows and detail state when it matches the API.
- Avoid importing deleted “kitchen sink” **`{domain}.type.ts`** files — types live under **`models/`** and **`utils/types/`**.

## 8. Tests

- **`app/repository/modules/repository-modules.integration.test.ts`** (or sibling): mock **`$fetch`**, assert URL/method and response handling (including unwrap if present). Mocks must satisfy **`~/utils/types`** if that is the asserted shape (enums, required **`created_at`/`updated_at`**, etc.).

## Reference modules

| Pattern | Module | Notes |
|--------|--------|--------|
| OData list + wrapped single/create | **`product`** | `models/request/*`, `models/response/*`, `Product` from utils |
| Flat entity + nested envelope unwrap | **`discount`** | `DiscountResp = Discount`, `remove({ code })` |

## Anti-patterns

- ❌ Hardcoded paths — use **`MerchantRoutes`** / **`API_PATH`**
- ❌ Duplicate domain types in **`repository`** and **`utils/types`** when they represent the same API entity
- ❌ Omitting **index** or **plugin** registration (module invisible to **`$api`**)
- ❌ Skipping tests when **`unwrap`** or non-obvious response shapes exist
