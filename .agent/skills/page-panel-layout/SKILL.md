---
name: page-panel-layout
description: Use when creating or refactoring dashboard pages under app/pages/, adding dashboard views, or changing page layout, navbar actions, toolbars, back navigation, or fixed footers in the Wemotoo CRM Portal.
---

# ZPagePanel Layout

Use `ZPagePanel` for all dashboard pages. It provides `UDashboardPanel` + `UDashboardNavbar` + optional `UDashboardToolbar` in one wrapper. Do not use raw `UDashboardPanel` or `UDashboardNavbar` directly.

**Component**: `app/components/Z/PagePanel.vue`

## Props

| Prop     | Type    | Required | Description                                                              |
| -------- | ------- | -------- | ------------------------------------------------------------------------ |
| `id`     | string  | yes      | Panel id (maps to `UDashboardPanel` id)                                  |
| `title`  | string  | yes      | Navbar title (use `t()` for i18n)                                        |
| `backTo` | string  | no       | When set, shows labeled `ZBackButton` in toolbar with this fallback path |
| `grow`   | boolean | no       | When true, panel grows to fill space (default: false)                    |

## Slots

| Slot           | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| `default`      | Body content                                                    |
| `navbar-right` | Right side of navbar (actions, date picker, etc.)               |
| `toolbar`      | Content in `UDashboardToolbar#left` (filters, back button area) |
| `leading`      | Override navbar leading area (replaces default; use sparingly)  |
| `footer`       | Fixed footer (e.g. form actions on product create/edit)         |

## Patterns

In each page script, declare `const { t } = useI18n()` and use the same `t` function in templates and `useHead`.

### List page (no back button)

```vue
<template>
	<ZPagePanel id="affiliates" :title="t('nav.affiliates')">
		<template #navbar-right>
			<UButton variant="outline" color="neutral" @click="navigateTo('/affiliates/tiers')">
				{{ t('affiliate.tiers') }}
			</UButton>
		</template>
		<template #toolbar>
			<ZSectionFilterAffiliates />
		</template>
		<div class="space-y-6">
			<!-- table, cards, etc. -->
		</div>
	</ZPagePanel>
</template>
```

### Sub-page (with back button)

```vue
<template>
	<ZPagePanel id="affiliate-tiers" :title="t('affiliate.tiers')" back-to="/affiliates">
		<div class="space-y-6 max-w-3xl">
			<!-- content -->
		</div>
	</ZPagePanel>
</template>
```

### Form page with fixed footer

```vue
<template>
	<ZPagePanel id="product-create" :title="t('pages.addNewProduct')" back-to="/products" grow>
		<div class="container w-full mx-auto">
			<FormProductCreation ref="formRef" />
		</div>
		<template #footer>
			<div class="w-full backdrop-blur-sm border-t border-neutral-200 shadow-md z-50">
				<!-- Save / Cancel / Create buttons -->
			</div>
		</template>
	</ZPagePanel>
</template>
```

### Simple page (no toolbar, no navbar-right)

```vue
<template>
	<ZPagePanel id="reports" :title="t('nav.reports')">
		<div class="space-y-6">
			<!-- content -->
		</div>
	</ZPagePanel>
</template>
```

## Checklist for New Pages

1. Use `ZPagePanel` — never `UDashboardPanel` + `UDashboardNavbar` directly
2. Set `id` (kebab-case, unique per page)
3. Set `title` with `t()` for i18n
4. Sub-pages: pass `back-to` with parent route
5. List pages with filters: use `#toolbar` for `ZSectionFilter*` components
6. Actions in navbar: use `#navbar-right`
7. Form pages with fixed actions: use `grow` + `#footer`
8. Set `useHead({ title: () => t('...') })` in script for document title
9. **Table / index listings** (filters + `UTable` + pagination): use **`listing-page`**

## References

- **`listing-page`** — index pages with `ZCreateButton`, `ZSectionFilter*`, `ZTableToolbar`, skeleton, empty state
- **`nuxt-ui-usage`** — UI components and theming
- **`i18n-translation`** — translation patterns
