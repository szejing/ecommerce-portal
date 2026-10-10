# Combo UI Separation Design

**Date:** 2026-10-08  
**Status:** Approved — implementing

## Goal

Remove the Product `comboOnly` flag mechanism. Combo create/edit lives in dedicated Combo components under `/products/combos/*`. Product forms no longer expose Composition / combo-components UI.

## Architecture

- Combo remains a Product API entity with `composition: 'fixed_combo'`.
- Portal UI trees are separate: `Form/Combo/*` + `Z/Input/Combo/*`.
- Reuse Product Classification, Pricing, LongDescription, ReviewSummary, AdditionalInfo (tax; variations already hidden when `fixed_combo`).
- Keep `useProductStore` (`startNewCombo`, create/update/delete, `getCombos`).

## Components

| New | Role |
|-----|------|
| `Form/Combo/CreatePage.vue` | Combo create shell |
| `Form/Combo/DetailPage.vue` | Combo detail shell + non-combo guard |
| `Form/Combo/Creation.vue` | Combo create form |
| `Form/Combo/Update.vue` | Combo update form |
| `Z/Input/Combo/BasicInfoSection.vue` | Combo basic info + components |
| `Z/Input/Combo/ComboComponents.vue` | Moved from Product |

Product `CreatePage` / `DetailPage` / `Creation` / `Update` / `BasicInfoSection`: strip `comboOnly` and Composition UI.

## Out of scope

Backend/API changes, combo listing rewrite, new Pinia store.
