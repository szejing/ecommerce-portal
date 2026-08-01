# Template Studio Rich Text: Quill SSR, Essential Toolbar, and @ Token Mentions

**Date:** 2026-08-01  
**Status:** Approved for planning  
**Scope:** `wemotoo-portal` Template Studio rich-text fields only

## Problem

Template Studio’s `RichTextEditor.client.vue` uses `@vueup/vue-quill` with a custom minimal toolbar (bold / italic / link) and a chip-based `TokenPicker` that inserts `{{token}}` plain text. Merchants need:

1. Correct SSR behavior per VueQuill docs
2. `@`-mention autocomplete for allowlisted tokens (same plain `{{token}}` storage as today)
3. VueQuill `essential` toolbar / standard format set (no images/video)

Subject-line editing stays plain `UInput` + `TokenPicker` in `ContentEditor.vue` (no Quill).

## Decisions

| Topic | Choice |
| --- | --- |
| Mention storage | Plain Handlebars text `{{tokenName}}` — not mention-blot HTML in saved content |
| TokenPicker chips | Keep alongside `@` mention (both insert the same string) |
| Toolbar | VueQuill `toolbar="essential"` |
| SSR approach | Keep `.client.vue`; register mention modules only in the browser |

## Architecture

### Component

- Primary change: `app/components/Z/TemplateStudio/RichTextEditor.client.vue`
- Unchanged: subject `TokenPicker` wiring in `ContentEditor.vue`
- Shared chip UI: existing `TokenPicker.vue` remains for discoverability

### Dependencies

- Add `quill-mention` and its stylesheet
- Continue using `@vueup/vue-quill` (already present)

### SSR

- Keep the Nuxt `.client.vue` suffix so the editor is client-bundled
- Follow [VueQuill SSR](https://vueup.github.io/vue-quill/guide/ssr.html): Quill runtime / `document` access only after mount; use VueQuill `modules` registration (and `loadQuill` only if a browser-only register step is required)
- Do not introduce a second `ClientOnly` wrapper unless tests or hydration force it

### Toolbar and formats

- Replace the custom `#toolbarId` bold/italic/link container with `toolbar="essential"`
- Configure Quill `formats` to match the essential set
- Include `mention` in `formats` only if required for the module to run; saved HTML must still be plain `{{token}}` text, not mention embeds
- Explicitly avoid image / video / raw-HTML controls

### Mention module

Register per [VueQuill modules](https://vueup.github.io/vue-quill/guide/modules.html):

```ts
[
  { name: 'blots/mention', module: MentionBlot },
  {
    name: 'modules/mention',
    module: Mention,
    options: {
      mentionDenotationChars: ['@'],
      source: (searchTerm, renderList) => { /* filter allowedTokens */ },
      // select/insert must yield plain {{token}} text in editor contents
    },
  },
]
```

- `source` filters `allowedTokens` (case-insensitive substring on token name)
- Empty `allowedTokens`: omit mention module (or empty source list); chip picker already hidden when empty
- On select: insert plain `{{tokenName}}` at caret (same normalization as TokenPicker). Prefer mention select/insert hooks that insert text; if a blot is unavoidable momentarily, strip/replace before `update:modelValue` so persisted HTML never contains mention markup

### TokenPicker coexistence

- Chip click keeps the current Delta `insertToken` path
- Both paths subject to existing `maxLength` HTML-string checks (reject + restore controlled `modelValue`)

## Data flow

```
allowedTokens prop
       │
       ├─► TokenPicker chips ──click──► insert {{token}} via Delta
       │
       └─► quill-mention @ source ──select──► insert {{token}} as plain text
                    │
                    ▼
            Quill HTML (content-type=html)
                    │
                    ▼
            maxLength gate → update:modelValue
```

Subject field (`content.subject`): unchanged `UInput` + TokenPicker only.

## Testing

Extend `test/nuxt/template-studio-editors.nuxt.spec.ts`:

1. Toolbar/formats reflect `essential` (not bold/italic/link-only); assert no image / raw-HTML controls
2. When `allowedTokens` present, `modules` includes mention blot + module
3. Mention select path results in plain `{{token}}` in content (mock select / content update)
4. Existing TokenPicker insert and `maxLength` rejection tests remain green

## Out of scope

- Subject-line Quill / mention
- Converting existing mention-blot HTML in stored templates (none expected)
- Changing backend token rendering / Handlebars contracts
- `toolbar="full"` or image upload modules

## References

- https://vueup.github.io/vue-quill/guide/ssr.html
- https://vueup.github.io/vue-quill/guide/modules.html
- https://vueup.github.io/vue-quill/api/
- https://vueup.github.io/vue-quill/guide/toolbar.html
