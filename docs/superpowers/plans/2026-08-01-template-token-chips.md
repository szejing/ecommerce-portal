# Template Studio Token Chips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render allowlisted `{{token}}` values in Template Studio subject and rich-text fields as soft-orange removable chips (icon remove + Backspace/Delete as a unit), while keeping saved content as literal `{{token}}` text/HTML.

**Architecture:** Shared pure helpers parse/remove/keyboard-bound tokens. Subject uses a new `TokenPlainTextInput` (contenteditable chip shell). Rich text uses a Quill Embed blot that displays as the same chip and serializes back to `{{token}}`. TokenPicker insert paths stay string/blot based on surface; storage contracts unchanged.

**Tech Stack:** Nuxt 4, Vue 3, Nuxt UI v4 (`UBadge` / `UIcon`), `@vueup/vue-quill`, Vitest + `@nuxt/test-utils`.

**Spec:** `docs/superpowers/specs/2026-08-01-template-token-chips-design.md`

**Skills:** @implementation-and-tests, @nuxt-ui-usage, @i18n-translation

## Global Constraints

- Only tokens in the field’s `allowed_tokens` become chips; unknown `{{…}}` stay plain text.
- Chip label is the full token string (e.g. `{{customer.name}}`).
- Chip look: soft orange pill (primary soft), monospace, trailing remove icon.
- Remove via trailing icon **and** Backspace/Delete when the caret is against the chip.
- Saved subject string and rich-text HTML must contain literal `{{token}}` text (no blot markup in persisted HTML).
- Keep TokenPicker discoverability buttons as they are today.
- Do not run Nuxt with `bun --bun`; use `bun run test:vitest:run -- <paths>`.
- Prefer commits only when the user asks (skip plan commit steps unless requested).

## File map

| File | Responsibility |
| --- | --- |
| `app/utils/document-template.ts` | Shared token segment / remove / keyboard-bound helpers |
| `test/unit/document-template.spec.ts` | Unit tests for those helpers |
| `app/components/Z/TemplateStudio/TokenChip.vue` | Shared soft-orange chip + remove icon UI |
| `app/components/Z/TemplateStudio/TokenPlainTextInput.vue` | Subject chip input (contenteditable + selection API) |
| `app/components/Z/TemplateStudio/ContentEditor.vue` | Swap subject `UInput` → `TokenPlainTextInput` |
| `app/components/Z/TemplateStudio/template-token-blot.ts` | Quill Embed blot + HTML serialize/hydrate helpers |
| `app/components/Z/TemplateStudio/RichTextEditor.client.vue` | Register blot; insert/hydrate/serialize tokens as chips |
| `i18n/locales/en.json`, `i18n/locales/ms.json` | Remove-token aria label |
| `test/nuxt/template-studio-editors.nuxt.spec.ts` | Update subject selectors; chip / blot expectations |

---

### Task 1: Shared token helpers (TDD)

**Files:**
- Modify: `app/utils/document-template.ts`
- Modify: `test/unit/document-template.spec.ts`

**Interfaces:**
- Produces:
  - `normalizeTemplateToken(token: string): string` → always `{{name}}`
  - `TemplateTokenSegment = { type: 'text'; value: string } | { type: 'token'; value: string; start: number; end: number }`
  - `splitTemplateTokenSegments(value: string, allowedTokens: readonly string[]): TemplateTokenSegment[]`
  - `removeTemplateTokenAt(value: string, start: number, end: number): { value: string; cursor: number }`
  - `templateTokenBoundsForDelete(value: string, cursor: number, key: 'Backspace' | 'Delete', allowedTokens: readonly string[]): { start: number; end: number } | null`

- [ ] **Step 1: Write the failing unit tests**

Append to `test/unit/document-template.spec.ts`:

```ts
import {
	// ...existing
	normalizeTemplateToken,
	splitTemplateTokenSegments,
	removeTemplateTokenAt,
	templateTokenBoundsForDelete,
} from '../../app/utils/document-template';

it('normalizes bare names and braced tokens to {{name}}', () => {
	expect(normalizeTemplateToken('customer.name')).toBe('{{customer.name}}');
	expect(normalizeTemplateToken('{{customer.name}}')).toBe('{{customer.name}}');
});

it('splits only allowlisted well-formed tokens into chip segments', () => {
	expect(splitTemplateTokenSegments('Hi {{customer.name}} and {{unknown}}!', ['{{customer.name}}'])).toEqual([
		{ type: 'text', value: 'Hi ' },
		{ type: 'token', value: '{{customer.name}}', start: 3, end: 20 },
		{ type: 'text', value: ' and {{unknown}}!' },
	]);
});

it('ignores nested or incomplete braces', () => {
	expect(splitTemplateTokenSegments('a {{b {{c}} d', ['{{c}}'])).toEqual([
		{ type: 'text', value: 'a {{b ' },
		{ type: 'token', value: '{{c}}', start: 6, end: 11 },
		{ type: 'text', value: ' d' },
	]);
	expect(splitTemplateTokenSegments('Hello {{', ['{{customer.name}}'])).toEqual([
		{ type: 'text', value: 'Hello {{' },
	]);
});

it('removes one token occurrence by range and places the cursor at the cut', () => {
	expect(removeTemplateTokenAt('Hi {{customer.name}}!', 3, 20)).toEqual({
		value: 'Hi !',
		cursor: 3,
	});
});

it('expands Backspace/Delete against an adjacent allowlisted token to the full chip range', () => {
	const value = 'Hi {{customer.name}}!';
	const allowed = ['{{customer.name}}'];
	expect(templateTokenBoundsForDelete(value, 20, 'Backspace', allowed)).toEqual({ start: 3, end: 20 });
	expect(templateTokenBoundsForDelete(value, 3, 'Delete', allowed)).toEqual({ start: 3, end: 20 });
	expect(templateTokenBoundsForDelete(value, 2, 'Backspace', allowed)).toBeNull();
	expect(templateTokenBoundsForDelete(value, 21, 'Delete', allowed)).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/szejinggo/Documents/Projects/ecommerce/wemotoo-portal && bun run test:vitest:run -- test/unit/document-template.spec.ts`

Expected: FAIL — helpers not exported / not defined.

- [ ] **Step 3: Implement helpers in `app/utils/document-template.ts`**

```ts
const TOKEN_RE = /\{\{([^{}]+)\}\}/g;

export function normalizeTemplateToken(token: string): string {
	const match = /^\{\{([^{}]+)\}\}$/.exec(token);
	return `{{${match?.[1] ?? token}}}`;
}

export type TemplateTokenSegment =
	| { type: 'text'; value: string }
	| { type: 'token'; value: string; start: number; end: number };

export function splitTemplateTokenSegments(
	value: string,
	allowedTokens: readonly string[],
): TemplateTokenSegment[] {
	const allowed = new Set(allowedTokens.map(normalizeTemplateToken));
	const segments: TemplateTokenSegment[] = [];
	let lastIndex = 0;
	TOKEN_RE.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = TOKEN_RE.exec(value)) !== null) {
		const token = match[0];
		const start = match.index;
		const end = start + token.length;
		if (start > lastIndex) {
			segments.push({ type: 'text', value: value.slice(lastIndex, start) });
		}
		if (allowed.has(token)) {
			segments.push({ type: 'token', value: token, start, end });
		} else {
			segments.push({ type: 'text', value: token });
		}
		lastIndex = end;
	}
	if (lastIndex < value.length) {
		segments.push({ type: 'text', value: value.slice(lastIndex) });
	}
	if (!segments.length) segments.push({ type: 'text', value: '' });
	return segments;
}

export function removeTemplateTokenAt(
	value: string,
	start: number,
	end: number,
): { value: string; cursor: number } {
	const from = Math.max(0, Math.min(start, value.length));
	const to = Math.max(from, Math.min(end, value.length));
	return {
		value: `${value.slice(0, from)}${value.slice(to)}`,
		cursor: from,
	};
}

export function templateTokenBoundsForDelete(
	value: string,
	cursor: number,
	key: 'Backspace' | 'Delete',
	allowedTokens: readonly string[],
): { start: number; end: number } | null {
	const segments = splitTemplateTokenSegments(value, allowedTokens);
	for (const segment of segments) {
		if (segment.type !== 'token') continue;
		if (key === 'Backspace' && cursor === segment.end) return { start: segment.start, end: segment.end };
		if (key === 'Delete' && cursor === segment.start) return { start: segment.start, end: segment.end };
	}
	return null;
}
```

Keep existing `insertTemplateToken` unchanged (it already gatekeeps allowlisted tokens). Optionally refactor its token check to use `normalizeTemplateToken` if callers pass bare names; current callers pass `{{name}}` already — do not break that.

- [ ] **Step 4: Re-run unit tests**

Run: `bun run test:vitest:run -- test/unit/document-template.spec.ts`

Expected: PASS

---

### Task 2: Shared `TokenChip` + i18n

**Files:**
- Create: `app/components/Z/TemplateStudio/TokenChip.vue`
- Modify: `i18n/locales/en.json`
- Modify: `i18n/locales/ms.json`

**Interfaces:**
- Consumes: `normalizeTemplateToken` (label always full `{{…}}`)
- Produces: `TokenChip` props `{ token: string; removable?: boolean }` emit `remove`

- [ ] **Step 1: Add i18n keys**

In both locale files under `components.templateStudio`, add:

```json
"removeToken": "Remove token {token}"
```

MS: `"removeToken": "Buang token {token}"`

- [ ] **Step 2: Create `TokenChip.vue`**

```vue
<template>
	<span
		class="template-token-chip inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary align-middle"
		:data-token-chip="tokenName"
		contenteditable="false"
	>
		<span>{{ token }}</span>
		<button
			v-if="removable"
			type="button"
			class="inline-flex size-4 items-center justify-center rounded-full text-primary hover:bg-primary/20"
			:aria-label="t('components.templateStudio.removeToken', { token })"
			:data-token-remove="tokenName"
			@click.stop.prevent="emit('remove')"
		>
			<UIcon name="i-lucide-x" class="size-3" />
		</button>
	</span>
</template>

<script setup lang="ts">
import { normalizeTemplateToken } from '~/utils/document-template';

const props = withDefaults(
	defineProps<{ token: string; removable?: boolean }>(),
	{ removable: true },
);

const emit = defineEmits<{ remove: [] }>();
const { t } = useI18n();
const token = computed(() => normalizeTemplateToken(props.token));
const tokenName = computed(() => token.value.slice(2, -2));
</script>
```

Use project primary soft colors (`bg-primary/10`, `text-primary`) so the chip matches the approved soft-orange pill look under the portal theme.

- [ ] **Step 3: Smoke-check via typecheck later with Task 3** (no isolated test required for this presentational chip)

---

### Task 3: Subject `TokenPlainTextInput` + ContentEditor wiring

**Files:**
- Create: `app/components/Z/TemplateStudio/TokenPlainTextInput.vue`
- Modify: `app/components/Z/TemplateStudio/ContentEditor.vue`
- Modify: `test/nuxt/template-studio-editors.nuxt.spec.ts`

**Interfaces:**
- Consumes: `splitTemplateTokenSegments`, `removeTemplateTokenAt`, `templateTokenBoundsForDelete`, `TokenChip`
- Produces: props `{ modelValue: string; allowedTokens: readonly string[]; maxLength?: number; placeholder?: string; ariaLabel?: string }`  
  emits `update:modelValue`, `select`/`click`/`keyup` compatible selection events **or** expose selection via emitted offsets; parent must still feed TokenPicker `selectionStart`/`selectionEnd`

**Selection contract (keep TokenPicker working):**

`TokenPlainTextInput` must expose an API ContentEditor can use like today’s `HTMLInputElement`:

- Maintain internal `{ start, end }` string offsets
- On caret moves, emit a custom event **or** call parent handlers with synthetic offsets
- Simplest: emit `selection-change` with `{ start, end }` and update `ContentEditor` to use that instead of reading `HTMLInputElement.selectionStart`

- [ ] **Step 1: Update ContentEditor subject tests to the new selection surface**

In `test/nuxt/template-studio-editors.nuxt.spec.ts`, replace subject `input` queries with:

```ts
const subjectRoot = wrapper.get('[data-field="content.subject"] [data-testid="token-plain-text-input"]');
// Prefer TokenPicker click still works without manually setting DOM selection:
// set props path: find TokenPlainTextInput and set selection via component expose/event.
```

Concrete updated first test flow:

```ts
const plain = wrapper.getComponent({ name: 'ZTemplateStudioTokenPlainTextInput' });
// If expose setSelection(start,end):
plain.vm.setSelection?.(8, 8);
await wrapper.get('[data-field="content.subject"] [data-token="invoiceNumber"]').trigger('click');
expect(wrapper.emitted('update:path')?.[0]).toEqual([
	'content.subject',
	'Invoice {{invoiceNumber}}for ',
]);
```

If component name auto-import differs, use `wrapper.findComponent` by file import:

```ts
import TokenPlainTextInput from '~/components/Z/TemplateStudio/TokenPlainTextInput.vue';
// ...
wrapper.getComponent(TokenPlainTextInput)
```

Also assert chips render for allowlisted tokens already in the subject:

```ts
await wrapper.setProps({
	modelValue: { content: { subject: 'Hi {{customerName}}' } },
});
expect(wrapper.get('[data-field="content.subject"] [data-token-chip="customerName"]').exists()).toBe(true);
expect(wrapper.find('[data-field="content.subject"] [data-token-chip="unknown"]').exists()).toBe(false);
```

(Use the same token naming as fixtures — `customerName` / `{{customerName}}` per existing `contentFields`.)

- [ ] **Step 2: Run the ContentEditor tests to confirm they fail**

Run: `bun run test:vitest:run -- test/nuxt/template-studio-editors.nuxt.spec.ts -t "controlled content editor"`

Expected: FAIL — `TokenPlainTextInput` missing / selectors broken.

- [ ] **Step 3: Implement `TokenPlainTextInput.vue`**

Recommended MVP behavior:

1. Root looks like an input (`border border-default rounded-md px-2.5 py-1.5 min-h-9 w-full`).
2. Inner `contenteditable="true"` region with `data-testid="token-plain-text-input"`.
3. Render from `splitTemplateTokenSegments(modelValue, allowedTokens)`:
   - text → text nodes / spans
   - token → `<ZTemplateStudioTokenChip :token="..." @remove="removeAt(start,end)" />`
4. On `beforeinput` for deleteContentBackward / deleteContentForward with collapsed caret: if `templateTokenBoundsForDelete` returns a range, `preventDefault` and emit `removeTemplateTokenAt`.
5. On other input: serialize editable DOM to string (walk nodes; chip nodes contribute `data-token` as `{{name}}`), respect `maxLength` (reject/revert if exceeded).
6. Expose `setSelection(start, end)` and keep `selectionStart`/`selectionEnd` refs updated for parent.
7. Emit `selection-change` with `{ start, end }` on click/keyup/select.

Keep implementation focused; prefer modelValue as source of truth and rebuild DOM after model updates, restoring caret from stored offsets.

- [ ] **Step 4: Wire `ContentEditor.vue`**

Replace subject `UInput` block with:

```vue
<ZTemplateStudioTokenPlainTextInput
	v-if="field.path === 'content.subject'"
	:model-value="fieldValue(field.path)"
	:allowed-tokens="allowedTokens(field)"
	:max-length="field.max_length"
	:aria-label="fieldLabel(field)"
	@update:model-value="updateField(field.path, $event)"
	@selection-change="(sel) => { selections[field.path] = sel }"
/>
```

Remove `rememberSelection` usage for subject if no longer needed for that field. Keep `setCursor` from TokenPicker `inserted` event.

Ensure `allowedTokens(field)` still returns normalized `{{name}}` strings consistent with TokenPicker / helpers.

- [ ] **Step 5: Re-run ContentEditor tests**

Run: `bun run test:vitest:run -- test/nuxt/template-studio-editors.nuxt.spec.ts -t "controlled content editor"`

Expected: PASS

---

### Task 4: Quill `templateToken` Embed blot + RichTextEditor

**Files:**
- Create: `app/components/Z/TemplateStudio/template-token-blot.ts`
- Modify: `app/components/Z/TemplateStudio/RichTextEditor.client.vue`
- Modify: `test/nuxt/template-studio-editors.nuxt.spec.ts`

**Interfaces:**
- Produces:
  - `TemplateTokenBlot` Quill Embed (`blotName: 'templateToken'`)
  - `hydrateTemplateTokensInHtml(html: string, allowedTokens: readonly string[]): string`
  - `serializeTemplateTokenHtml(html: string): string` — replace chip markup with literal `{{token}}`
- Consumes: `normalizeTemplateToken`, `splitTemplateTokenSegments`

- [ ] **Step 1: Add failing RichTextEditor expectations**

In `test/nuxt/template-studio-editors.nuxt.spec.ts`, add:

```ts
it('registers a templateToken embed format and hydrates allowlisted tokens as chips in HTML', async () => {
	const wrapper = await mountSuspended(RichTextEditor, {
		props: {
			modelValue: '<p>Hello {{customerName}}</p>',
			allowedTokens: ['customerName'],
		},
	});
	const quill = wrapper.getComponent({ name: 'QuillEditor' });
	expect(quill.props('options').formats).toContain('templateToken');
	// Content passed into Quill should be hydrated chip HTML, not raw braces only:
	expect(String(quill.props('content'))).toContain('data-token="customerName"');
	expect(String(quill.props('content'))).not.toContain('{{unknown}}');
});

it('serializes templateToken chips back to literal {{token}} on emit', async () => {
	const wrapper = await mountSuspended(RichTextEditor, {
		props: {
			modelValue: '<p>Hello {{customerName}}</p>',
			allowedTokens: ['{{customerName}}'],
		},
	});
	const quill = wrapper.getComponent({ name: 'QuillEditor' });
	quill.vm.$emit(
		'update:content',
		'<p>Hello <span class="template-token-chip" data-token="customerName">{{customerName}}</span></p>',
	);
	await nextTick();
	expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toContain('{{customerName}}');
	expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).not.toContain('template-token-chip');
});
```

Adjust fixture token shapes to match whatever `allowedTokens` normalization RichTextEditor already uses (`customerName` vs `{{customerName}}`) — normalize internally with `normalizeTemplateToken`.

- [ ] **Step 2: Run rich-text tests to verify failure**

Run: `bun run test:vitest:run -- test/nuxt/template-studio-editors.nuxt.spec.ts -t "templateToken"`

Expected: FAIL

- [ ] **Step 3: Implement `template-token-blot.ts`**

```ts
import Embed from 'quill/blots/embed';
import { normalizeTemplateToken, splitTemplateTokenSegments } from '~/utils/document-template';

export class TemplateTokenBlot extends Embed {
	static blotName = 'templateToken';
	static className = 'template-token-chip';
	static tagName = 'SPAN';

	static create(value: string) {
		const node = super.create(value) as HTMLElement;
		const token = normalizeTemplateToken(value);
		const name = token.slice(2, -2);
		node.setAttribute('data-token', name);
		node.setAttribute('contenteditable', 'false');
		node.classList.add(
			'inline-flex',
			'items-center',
			'gap-1',
			'rounded-full',
			'border',
			'border-primary/30',
			'bg-primary/10',
			'px-2',
			'py-0.5',
			'font-mono',
			'text-xs',
			'text-primary',
		);
		const label = document.createElement('span');
		label.textContent = token;
		node.appendChild(label);
		const remove = document.createElement('button');
		remove.type = 'button';
		remove.setAttribute('data-token-remove', name);
		remove.setAttribute('aria-label', `Remove token ${token}`);
		remove.className = 'inline-flex size-4 items-center justify-center rounded-full text-primary';
		remove.textContent = '×';
		node.appendChild(remove);
		return node;
	}

	static value(domNode: HTMLElement) {
		const name = domNode.getAttribute('data-token') ?? '';
		return normalizeTemplateToken(name);
	}

	html() {
		return TemplateTokenBlot.value(this.domNode as HTMLElement);
	}
}

export function hydrateTemplateTokensInHtml(html: string, allowedTokens: readonly string[]): string {
	if (!html || !allowedTokens.length) return html;
	const allowed = allowedTokens.map(normalizeTemplateToken);
	return html.replace(/\{\{([^{}]+)\}\}/g, (raw) => {
		if (!allowed.includes(raw)) return raw;
		const name = raw.slice(2, -2);
		return `<span class="template-token-chip" data-token="${name}">${raw}<button type="button" data-token-remove="${name}">×</button></span>`;
	});
}

export function serializeTemplateTokenHtml(html: string): string {
	if (!html.includes('template-token-chip')) return html;
	// Prefer DOMParser in browser; for unit simplicity use regex replace of chip spans:
	return html.replace(
		/<span[^>]*class="[^"]*template-token-chip[^"]*"[^>]*data-token="([^"]+)"[^>]*>[\s\S]*?<\/span>/gi,
		(_m, name: string) => `{{${name}}}`,
	);
}
```

Register blot once (guard against HMR double-register):

```ts
import Quill from 'quill';
if (!Quill.imports['blots/templateToken']) {
	Quill.register(TemplateTokenBlot);
}
```

Use the Quill instance available from `@vueup/vue-quill` / `quill` package already pulled in by the editor — match how `quill-mention` registers `MentionBlot`.

- [ ] **Step 4: Update `RichTextEditor.client.vue`**

1. Add `'templateToken'` to `formats`.
2. Hydrate `modelValue` before passing to `QuillEditor` `:content`:
   `hydrateTemplateTokensInHtml(modelValue, allowedTokens)`.
3. In `updateContent`, run `serializeTemplateTokenHtml(value)` before maxLength check / emit.
4. Change `insertToken` to insert an embed when Quill is ready:

```ts
editor.insertEmbed(range.index, 'templateToken', tokenValue(token), 'user');
editor.setSelection(range.index + 1, 0, 'silent');
```

(Embed length is 1 in Quill indexes.)

5. Update mention `onSelect` to insert the same embed instead of plain text.
6. On editor `ready`, bind click on `[data-token-remove]` to `editor.deleteText(blotIndex, 1, 'user')`.
7. Quill already deletes Embeds as atomic units on Backspace/Delete — verify; if not, add a keyboard binding.

Scope CSS so chips inside `.ql-editor` match `TokenChip` styling (can reuse blot class list above).

- [ ] **Step 5: Re-run rich-text + full template studio editor tests**

Run:

```bash
bun run test:vitest:run -- test/nuxt/template-studio-editors.nuxt.spec.ts
bun run test:vitest:run -- test/unit/document-template.spec.ts
```

Expected: PASS

---

### Task 5: Verification pass

**Files:** none new (fix only if typecheck reveals gaps)

- [ ] **Step 1: Run focused verification**

```bash
cd /Users/szejinggo/Documents/Projects/ecommerce/wemotoo-portal
bun run test:vitest:run -- test/unit/document-template.spec.ts test/nuxt/template-studio-editors.nuxt.spec.ts
npm run typecheck
```

Expected: tests PASS; typecheck clean for touched files.

- [ ] **Step 2: Manual smoke checklist (dev server already running or `bun run start:local`)**

1. Open Template Studio → email content → subject: insert token via picker → soft-orange chip with × appears.
2. Click × → token removed from subject string.
3. Place caret after chip, Backspace → whole chip removed.
4. Place caret before chip, Delete → whole chip removed.
5. Type unknown `{{nope}}` → stays plain text.
6. Greeting rich text: insert via picker and via `@` → chip; × removes; save/preview still shows literal `{{token}}` in stored HTML (inspect emitted model / preview source).
7. Confirm `max_length` still blocks oversized inserts.

---

## Spec coverage self-check

| Spec requirement | Task |
| --- | --- |
| Both subject + rich text | Tasks 3–4 |
| Allowed tokens only | Task 1 + consumers |
| Full `{{token}}` label | Tasks 2–4 |
| Soft orange pill + remove icon | Task 2 (+ blot styles in 4) |
| Icon + Backspace/Delete remove | Tasks 1, 3, 4 |
| Literal storage unchanged | Tasks 3–4 serialize paths |
| Shared utils | Task 1 |
| Unit tests for utils | Task 1 |
| No TokenPicker redesign | Unchanged component |
| No Quill E2E | Manual smoke only |

## Placeholder / consistency notes

- Token fixtures in existing tests use bare names like `customerName`; helpers always normalize to `{{customerName}}`. All new code must normalize at boundaries.
- Subject selection moves from native `input` events to `selection-change` / `setSelection` — update every ContentEditor test that touched `HTMLInputElement`.
- Quill embed index length is `1`; do not add `token.length` when moving caret after embed insert.
