# Template Studio: Removable `{{token}}` Chips in Subject and Rich Text

**Date:** 2026-08-01  
**Status:** Approved for planning  
**Scope:** `wemotoo-portal` Template Studio content fields (`content.subject` + rich-text greeting/introduction/footer)

## Problem

Template Studio inserts allowlisted Handlebars tokens as plain `{{token}}` text in:

1. Subject: `UInput` in `ContentEditor.vue`
2. Body fields: Quill in `RichTextEditor.client.vue` (TokenPicker and `@` mention both insert plain text)

Merchants cannot easily see or remove tokens as discrete units. Tokens should render as soft-orange chips (UBadge/UButton-like) with a trailing remove icon, and Backspace/Delete against a chip should remove the whole token.

## Decisions

| Topic | Choice |
| --- | --- |
| Surfaces | Both subject and rich-text fields |
| Which tokens chip | Only field `allowed_tokens` (unknown `{{…}}` stays plain text) |
| Chip label | Full token string, e.g. `{{customer.name}}` |
| Chip look | Soft orange pill (primary soft), monospace label, trailing × / `UIcon` |
| Remove | Trailing icon click **and** Backspace/Delete when caret is against the chip |
| Storage | Unchanged: literal `{{token}}` in subject string and rich-text HTML |
| Approach | Shared token utils + dual adapters (plain chip input + Quill Embed blot) |

## Architecture

```
TokenPicker / typing / paste / @ mention
        │
        ▼
shared token utils (split / remove / keyboard bounds)
        │
   ┌────┴────┐
   ▼         ▼
Subject      Rich text
TokenPlain   Quill Embed blot
TextInput    (atomic chip)
   │         │
   └────┬────┘
        ▼
content.* still stores literal {{allowed.token}} text
```

### Shared utils

Extend or sibling to `app/utils/document-template.ts`:

- Parse a string into segments: plain text vs allowed `{{token}}` matches
- Match rule: well-formed `{{…}}` with no nested `{}`, token must be in `allowed_tokens` (normalize name the same way as `TokenPicker` / existing `tokenName`)
- Remove a token occurrence by string range / index
- Compute Backspace/Delete chip bounds when caret sits at chip edge

### Subject — `TokenPlainTextInput`

- New component under `app/components/Z/TemplateStudio/`
- Replaces `UInput` for `content.subject` in `ContentEditor.vue`
- Renders interleaved plain text + soft-orange chips
- Emits the underlying plain string via `update:modelValue`
- Preserves selection APIs so existing `TokenPicker` (`selectionStart` / `selectionEnd` / `inserted`) keeps working
- Enforces `maxlength` on the underlying string

### Rich text — Quill token Embed blot

- Custom atomic Embed blot in `RichTextEditor.client.vue` (or a small sibling module)
- Visual: same soft-orange chip + remove icon as subject
- TokenPicker and `@` mention insert the blot (not raw text), still subject to `maxLength`
- On load / content set: scan text for allowed `{{tokens}}` and convert to blots; unknown `{{…}}` remain text
- On HTML emit: serialize blots back to literal `{{token}}` text so persisted HTML never depends on blot markup
- Note: this evolves the earlier “plain text only in Quill” mention design — display uses blots; **saved** content remains plain `{{token}}`

### Visual

- Soft orange pill aligned with TokenPicker / primary soft
- Monospace full `{{token}}` label
- Trailing remove control (`UIcon` or equivalent ×) with accessible label

## Data flow

1. Merchant inserts token via TokenPicker or `@` → underlying value gains `{{token}}` (subject string or Quill blot that serializes to that text).
2. Editor re-renders allowed tokens as chips.
3. Remove icon or keyboard chip-delete removes that occurrence only.
4. Parent `ContentEditor` continues to `emit('update:path', path, value)` with string/HTML containing literal tokens.
5. Preview / save / backend contracts unchanged.

## Edge cases

- Incomplete `{{` while typing stays plain until a full allowed token exists
- Nested/malformed braces: only well-formed non-nested `{{…}}` match
- Duplicate tokens: each occurrence is its own chip; remove is per occurrence
- `max_length` applies to underlying string/HTML after insert/remove/type
- Paste of mixed content: allowed tokens chip-ify; unknown stay text
- SSR: subject chip input may render on server; Quill blot stays client-only (existing `.client.vue`)

## Out of scope

- Friendly/localized token labels inside chips
- Chip styling for unknown tokens
- Full Quill E2E / browser automation
- Backend or `yeppi-common` contract changes
- Changing TokenPicker discoverability chips (insert buttons remain as today)

## Testing

- Unit tests for shared utils: segment split, allowed-only matching, remove occurrence, Backspace/Delete bounds
- Keep/extend `insertTemplateToken` coverage in `test/unit/document-template.spec.ts`
- Light component tests only if cheap; no full Quill E2E for MVP

## Success criteria

- Subject and rich-text fields show allowed `{{tokens}}` as soft-orange removable chips
- × removes that token; Backspace/Delete against the chip removes it as one unit
- Saved subject/HTML still contain literal `{{token}}` text
- Unknown `{{…}}` remain plain text
- Existing TokenPicker insert + max-length behavior still works
