---
name: nuxt-ui-usage
description: Build UIs with @nuxt/ui v4 in the Wemotoo CRM Portal. Use when creating interfaces, forms, tables, modals, SelectMenus, or customizing the theme. Covers project-specific theming (main/secondary colors), component conventions, and integration with i18n.
---

# Nuxt UI in Wemotoo CRM Portal

This skill guides UI development with **@nuxt/ui v4** in the Wemotoo CRM Portal. For deep component knowledge (125+ components, props, composables), invoke the official Nuxt UI skill:

- **Install**: `npx skills add nuxt/ui` or add in Cursor Settings > Skills: `https://github.com/nuxt/ui/tree/v4/skills/nuxt-ui`
- **Invoke**: Type `/nuxt-ui` in chat

## Project Setup

- **Framework**: Nuxt 4, Vue 3, Tailwind CSS 4
- **Module**: `@nuxt/ui` in `nuxt.config.ts`
- **CSS**: `app/assets/css/main.css` — `@import 'tailwindcss'` and `@import '@nuxt/ui'`
- **Theme config**: `app/app.config.ts` — `ui` block with `strategy: 'merge'`

## Theming

### Colors

Primary color is `main` (Wemotoo orange). Custom palettes in `main.css`:

- **main**: `--color-main-50` … `--color-main-900`, `--color-main: #f37323`
- **secondary**: `--color-secondary-*` (blue tones)
- **neutral**: `--color-neutral-0` … `--color-neutral-900`

```ts
// app/app.config.ts
ui: {
  colors: { primary: theme.main },
  // ...
}
```

### Semantic Utilities

Prefer semantic utilities over raw palette colors where applicable: `text-default`, `bg-elevated`, `border-muted`. See [Nuxt UI theming reference](https://ui.nuxt.com/docs/getting-started/theming) for full list.

### Global Overrides

`app.config.ts` applies project-wide overrides:

- **Card**: `shadow-sm` on root
- **Input**: `w-full` on root
- **SelectMenu**: `min-w-30 sm:min-w-40` base, `min-w-fit` content, rotating trailing icon

## Components Used in This Project

| Component                  | Usage                                                      |
| -------------------------- | ---------------------------------------------------------- |
| UButton                    | Actions, submit, cancel                                    |
| UForm                      | Forms with Zod schema validation                           |
| UTable                     | Data tables with `app/utils/table-columns/`                |
| UModal                     | Dialogs; prefer `components/Z/Modal/` wrappers             |
| USelectMenu                | Filters, status selectors; items as `{ value, label }[]`   |
| UBadge                     | Status tags with `getXxxColor()` from `app/utils/options/` |
| UInput, USelect, UTextarea | Form fields                                                |
| UCard                      | Sections, panels                                           |

## Form Patterns

Forms use **UForm** + **Zod** + **createXxxValidation(t)** for i18n:

```vue
<script setup lang="ts">
import { createCreateTaxValidation } from '~/utils/schema';

const { t: $t } = useI18n();
const taxSchema = computed(() => createCreateTaxValidation(t));
</script>

<template>
	<UForm :schema="taxSchema" :state="formState" @submit="onSubmit">
		<!-- fields -->
	</UForm>
</template>
```

## Table Columns

Export `getXxxColumns(t: TranslateFn)` from `app/utils/table-columns/`:

```ts
export function getOrderColumns(t: TranslateFn) {
	return [
		{ key: 'order_no', label: t('table.orderNo') },
		{ key: 'status', label: t('table.status') },
	];
}
```

## SelectMenu and Options

Options from `app/utils/options/` — export `getXxxOptions(t)` returning `{ value, label }[]`:

```vue
<script setup lang="ts">
const { t: $t } = useI18n();
const items = computed(() => getOrderStatusOptions(t));
</script>

<template>
	<USelectMenu v-model="status" :items="items" value-key="value">
		<template #default>
			<UBadge :color="getOrderStatusColor(status)">{{ selectedLabel }}</UBadge>
		</template>
	</USelectMenu>
</template>
```

## Modal Wrappers

Use `components/Z/Modal/` for consistent modals:

- `Z/Modal/Confirmation.vue` — confirm/cancel
- `Z/Modal/Detail.vue` — entity detail views
- `Z/Modal/LeavePageConfirmation.vue` — unsaved changes

## Icons

Icons use Iconify format `i-{collection}-{name}`. Collections: `lucide`, `heroicons`, `mdi`, `material-symbols`, etc. Browse at [icones.js.org](https://icones.js.org).

## Composables

- `useToast()` — notifications
- `useOverlay()` — programmatic modals
- `defineShortcuts()` — keyboard shortcuts

## Checklist for New UI

1. Use semantic colors (`text-default`, `bg-elevated`) or project palette (`main`, `secondary`, `neutral`)
2. Translate labels with `$t()` or `getXxxOptions(t)`
3. Put reusable primitives in `components/Z/`
4. Use `UForm` + Zod schema for forms; schemas in `app/utils/schema/`
5. Table columns in `app/utils/table-columns/`; options in `app/utils/options/`

## References

- [Nuxt UI docs](https://ui.nuxt.com/docs)
- [Nuxt UI skill](https://github.com/nuxt/ui/tree/v4/skills/nuxt-ui) — install for full component reference
- [i18n-translation skill](.agent/skills/i18n-translation/SKILL.md) — locale patterns
