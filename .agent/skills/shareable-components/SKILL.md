---
name: shareable-components
description: Use when extracting a shared or reusable component, deduplicating repeated markup, or when two or more pages or forms use the same section, form block, card, or UI behavior.
---

# Creating Shareable Components

Use this skill when the same UI block (section, form block, card, or pattern) appears in **two or more** places and should live in one reusable component.

## When to Apply

- User asks to "create a shared component" or "extract into a reusable component"
- Same template block exists in 2+ files (e.g. same form section in Creation and Update)
- Repeated UI that only differs by binding (e.g. `formState` vs `new_product`) or a few options (e.g. code field disabled vs editable)

## Placement

| Use case | Location | Example |
|----------|----------|---------|
| Generic / cross-domain | `app/components/Z/` | `Z/Dropzone`, `Z/BackButton` |
| Domain-specific section or input block | `app/components/Z/Input/<Domain>/` or `Z/Section/` | `Z/Input/Product/BasicInfoSection.vue`, `Z/Input/Product/ClassificationSection.vue` |
| Feature-specific but shared in that feature | Same domain folder | `Form/Product/ReviewSummary.vue` |

Prefer **Z** for anything reusable across domains; use **Z/Input/** or **Z/Section/** subfolders when the project already groups by domain (e.g. Product, Order).

## Workflow

### 1. Identify the duplicate block

- Compare the two (or more) usages side by side.
- Note what is **identical** (markup, labels, structure) and what **differs** (bound model, disabled vs editable, optional handlers like delete).

### 2. Design the API

- **State**: Prefer a single `state` (or `model`) prop — the parent’s reactive object. The shared component binds to it (e.g. `v-model="state.code"`) so the parent stays the source of truth. Use `toRef(props, 'state')` in the component so v-model and local mutations work.
- **Behaviour flags**: Add props for mode-specific behaviour (e.g. `codeDisabled: boolean` for update vs create).
- **Events**: For actions the parent must handle (file selection, delete, custom actions), emit events (e.g. `update:thumbnail`, `delete:image`) and let the parent update its state.

### 3. Create the component

- Add the new `.vue` file under the chosen path (e.g. `app/components/Z/Input/Product/BasicInfoSection.vue`).
- Move the shared markup into the new component; replace differing parts with props and events.
- Use project conventions: `ICONS` from `~/utils/icons`, `t()` for copy, `UFormField`/`UCard` etc. as in the rest of the app.
- Export a type for the state shape if useful (e.g. `ProductBasicInfoState`) so parents can type their ref.

### 4. Replace usages

- In each original file, remove the duplicated block and use the new component.
- Pass the same state ref and wire events to existing handlers (e.g. `@update:thumbnail="updateThumbnail"`, `@delete:image="deleteImage"`).
- If one usage didn’t have a handler (e.g. no delete in Create), add a minimal handler so the shared component’s API stays consistent (e.g. clear thumbnail/images in state when delete is emitted).

### 5. Verify

- Run linter; fix any type errors (e.g. filter result type when removing an image).
- Ensure both usages still behave correctly (create vs update, optional handlers).

## API patterns

**Single state prop + events for side effects**

```vue
<!-- Parent -->
<ZInputProductBasicInfoSection
  :state="formState"
  :code-disabled="true"
  @update:thumbnail="updateThumbnail"
  @update:images="updateImages"
  @delete:thumbnail="deleteThumbnail"
  @delete:image="deleteImage"
/>
```

**Component (excerpt)**

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  state: ProductBasicInfoState;
  codeDisabled?: boolean;
}>(), { codeDisabled: false });

const emit = defineEmits<{
  'update:thumbnail': [files: File[]];
  'delete:image': [image: Image];
}>();

const state = toRef(props, 'state');
</script>

<template>
  <UCard>
    <!-- bind to state; emit for thumbnail/images -->
  </UCard>
</template>
```

## Checklist

- [ ] Duplicate block appears in 2+ places
- [ ] Component lives under `Z/` (or `Z/Input/<Domain>/` / `Z/Section/` if domain-grouped)
- [ ] Parent passes reactive state; component uses `toRef(props, 'state')` if it mutates state
- [ ] Mode-specific behaviour is a prop (e.g. `codeDisabled`); actions are events
- [ ] All call sites updated; optional handlers added where the shared component emits
- [ ] Lint clean; types exported if useful

## References

- Vue/components rule: `.agent/rules/vue-pages-components.mdc` — structure, naming, Z primitives
- **`nuxt-ui-usage`** — forms, UCard, UFormField, theming
