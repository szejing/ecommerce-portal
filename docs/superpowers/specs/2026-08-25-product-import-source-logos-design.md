# Product Import Source Logos

**Date:** 2026-08-25  
**Status:** Approved for planning  
**Scope:** CRM portal product listing import source picker

## Goal

Make the product import template picker easier to recognize by showing a brand mark next to each import source (Wemotoo, Sitegiant, TikTok).

## Context

- Products listing (`app/pages/products/listing.vue`) passes `productImportSources` into `ZImportActions`.
- When more than one source exists, `ZImportActions` opens a modal of outline buttons with label + description only.
- TikTok icon is available via existing `@iconify-json/simple-icons` (`i-simple-icons-tiktok`).
- Wemotoo already ships `public/logo/logo.png`.
- SiteGiant mark is sourced from [commerce.asia/sitegiant](https://www.commerce.asia/sitegiant) (`sitegiant_on.png`) and stored locally as `public/logo/sitegiant.png`.

## Approach

Optional visual fields on each import source item. The shared component renders a mark when present; callers own brand assets/icons.

## Data contract

Extend each `importSources` entry:

| Field | Type | Meaning |
|-------|------|---------|
| `label` | `string` | Existing |
| `value` | `string` | Existing |
| `description?` | `string` | Existing |
| `logoSrc?` | `string` | Image path under `public/` |
| `icon?` | `string` | Iconify name for `UIcon` |

Precedence: if `logoSrc` is set, render the image; else if `icon` is set, render `UIcon`; else text only.

### Listing values

| Source | Mark |
|--------|------|
| Wemotoo | `logoSrc: '/logo/logo.png'` |
| Sitegiant | `logoSrc: '/logo/sitegiant.png'` |
| TikTok | `icon: 'i-simple-icons-tiktok'` |

## UI

- Keep existing modal and outline `UButton`s.
- Button content: horizontal row — optional ~24×24 mark on the left, label + description stacked on the right.
- Images use `object-contain` on a transparent background and keep original colors (do not recolor).
- No modal layout redesign; no new npm packages.

## Files

| File | Change |
|------|--------|
| `app/components/Z/ImportActions.vue` | Prop type + mark rendering |
| `app/pages/products/listing.vue` | Pass `logoSrc` / `icon` on sources |
| `public/logo/sitegiant.png` | Local SiteGiant brand mark |
| `test/nuxt/z-import-actions.nuxt.spec.ts` | Assert marks render when provided |

## Out of scope

- Backend import behavior
- Recoloring / cropping SiteGiant artwork for light mode
- Custom slot API for source buttons

## Success criteria

- Admins can tell Wemotoo / Sitegiant / TikTok apart at a glance in the import source modal.
- Sources without `logoSrc`/`icon` still render as text-only.
- Existing import source selection + file picker flow is unchanged.
