# Template Studio Rich Text Quill Mention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Template Studio `RichTextEditor` to VueQuill `essential` toolbar, keep SSR-safe `.client.vue` usage, and add `quill-mention` `@` autocomplete that inserts plain `{{token}}` text alongside the existing TokenPicker chips.

**Architecture:** Keep `RichTextEditor.client.vue`. Pass `toolbar="essential"` and register `quill-mention` via VueQuill `modules` when `allowedTokens` is non-empty. Override mention `onSelect` to insert plain Handlebars text (never persist mention blot HTML). Subject-line TokenPicker in `ContentEditor` stays unchanged.

**Tech Stack:** Nuxt 4, Vue 3, `@vueup/vue-quill` ^1.5.3, `quill-mention` ^6.1.1, Vitest + `@nuxt/test-utils`.

**Spec:** `docs/superpowers/specs/2026-08-01-template-rich-text-quill-mention-design.md`

**Skills:** @implementation-and-tests, @nuxt-ui-usage

## Global Constraints

- Mention storage is plain `{{tokenName}}` text — never mention-blot HTML in `update:modelValue`.
- Keep TokenPicker chips under the editor; both paths insert the same token string.
- Use VueQuill `toolbar="essential"` (headers, bold/italic/underline, lists, align, blockquote, code-block, link, color, clean). No image/video.
- Keep `.client.vue`; do not add an extra `ClientOnly` unless hydration forces it.
- Subject field (`content.subject`) stays `UInput` + TokenPicker — no Quill/mention.
- Do not run Nuxt with `bun --bun`; use `bun run test:vitest:run -- test/nuxt/template-studio-editors.nuxt.spec.ts`.
- Prefer commits only when the user asks (skip plan commit steps unless requested).

## File map

- Modify: `app/components/Z/TemplateStudio/RichTextEditor.client.vue`
- Modify: `test/nuxt/template-studio-editors.nuxt.spec.ts`
- Modify: `package.json` / lockfile — add `quill-mention`
- Unchanged: `ContentEditor.vue` subject TokenPicker, `TokenPicker.vue`

### Essential formats whitelist

```ts
const ESSENTIAL_FORMATS = [
	'header',
	'bold',
	'italic',
	'underline',
	'list',
	'align',
	'blockquote',
	'code-block',
	'link',
	'color',
	'mention', // required while mention module is active for autocomplete UI
] as const;
```

---

### Task 1: Failing tests for essential toolbar + mention modules

**Files:**
- Modify: `test/nuxt/template-studio-editors.nuxt.spec.ts`

**Interfaces:**
- Consumes: `RichTextEditor` props `{ modelValue, allowedTokens?, maxLength?, ariaLabel?, placeholder? }`
- Produces: updated expectations for `toolbar="essential"`, formats list, and `modules` registration shape

- [x] **Step 1: Rewrite the restricted-toolbar test and add mention-module tests**

In `describe('Template Studio restricted rich text editor')`, replace the first test and add mention coverage:

```ts
it('uses the essential toolbar and formats without image or video controls', async () => {
	const wrapper = await mountSuspended(RichTextEditor, {
		props: { modelValue: '<p>Hello</p>' },
	});

	const quill = wrapper.getComponent({ name: 'QuillEditor' });
	expect(quill.props('toolbar')).toBe('essential');
	expect(quill.props('options')).toMatchObject({
		formats: expect.arrayContaining(['bold', 'italic', 'underline', 'link', 'list', 'header']),
	});
	expect(quill.props('options').formats).not.toContain('image');
	expect(quill.props('options').formats).not.toContain('video');
	expect(wrapper.find('[data-raw-html]').exists()).toBe(false);
});

it('registers quill-mention modules when allowlisted tokens are present', async () => {
	const wrapper = await mountSuspended(RichTextEditor, {
		props: { modelValue: '<p>Hello</p>', allowedTokens: ['customerName'] },
	});

	const modules = wrapper.getComponent({ name: 'QuillEditor' }).props('modules') as Array<{
		name: string;
		options?: { mentionDenotationChars?: string[]; source?: Function };
	}>;
	expect(modules.map((entry) => entry.name)).toEqual(['blots/mention', 'modules/mention']);
	expect(modules[1]?.options?.mentionDenotationChars).toEqual(['@']);

	const matches: unknown[] = [];
	modules[1]?.options?.source?.('customer', (items: unknown[]) => {
		matches.push(...items);
	});
	expect(matches).toEqual([
		expect.objectContaining({ id: 'customerName', value: 'customerName' }),
	]);
});

it('omits mention modules when there are no allowlisted tokens', async () => {
	const wrapper = await mountSuspended(RichTextEditor, {
		props: { modelValue: '<p>Hello</p>', allowedTokens: [] },
	});

	expect(wrapper.getComponent({ name: 'QuillEditor' }).props('modules')).toBeUndefined();
});
```

Keep existing TokenPicker insert / maxLength tests; they should still find `[data-token="customerName"]`.

- [x] **Step 2: Run tests to verify they fail**

Run: `cd /Users/szejinggo/Documents/Projects/ecommerce/wemotoo-portal && bun run test:vitest:run -- test/nuxt/template-studio-editors.nuxt.spec.ts`

Expected: FAIL — toolbar still custom / formats still `['bold','italic','link']` / `modules` undefined.

---

### Task 2: Install quill-mention and implement RichTextEditor

**Files:**
- Modify: `package.json` (add dependency)
- Modify: `bun.lock` via install
- Modify: `app/components/Z/TemplateStudio/RichTextEditor.client.vue`

**Interfaces:**
- Consumes: `allowedTokens` prop; `quill-mention` `{ Mention, MentionBlot }`
- Produces: QuillEditor with `toolbar="essential"`, optional mention `modules`, plain-text mention insert

- [x] **Step 1: Install dependency**

```bash
cd /Users/szejinggo/Documents/Projects/ecommerce/wemotoo-portal && bun add quill-mention
```

- [x] **Step 2: Implement RichTextEditor**

Replace custom toolbar markup with VueQuill essential toolbar; wire mention modules:

```vue
<template>
	<div class="space-y-3">
		<QuillEditor
			ref="editorRef"
			:content="modelValue"
			content-type="html"
			theme="snow"
			toolbar="essential"
			:modules="mentionModules"
			:options="{ placeholder, formats }"
			class="template-rich-text-editor"
			@ready="rememberEditor"
			@selection-change="rememberSelection"
			@update:content="updateContent"
		/>
		<ZTemplateStudioTokenPicker
			v-if="allowedTokens.length"
			:allowed-tokens="allowedTokens"
			@select="insertToken"
		/>
	</div>
</template>

<script setup lang="ts">
import { Delta, QuillEditor } from '@vueup/vue-quill';
import { Mention, MentionBlot } from 'quill-mention';
import '@vueup/vue-quill/dist/vue-quill.snow.css';
import 'quill-mention/dist/quill.mention.css';

// ... existing QuillRange / QuillInstance / props / emit / selection helpers ...

const ESSENTIAL_FORMATS = [
	'header', 'bold', 'italic', 'underline', 'list', 'align',
	'blockquote', 'code-block', 'link', 'color', 'mention',
] as const;

const formats = [...ESSENTIAL_FORMATS];

function tokenName(token: string): string {
	return /^\{\{([^{}]+)\}\}$/.exec(token)?.[1] ?? token;
}

function tokenValue(token: string): string {
	return `{{${tokenName(token)}}}`;
}

type MentionModuleHost = {
	quill: QuillInstance & {
		deleteText: (index: number, length: number, source?: string) => void;
		insertText: (index: number, text: string, source?: string) => void;
	};
	mentionCharPos: number;
	cursorPos: number;
};

const mentionModules = computed(() => {
	if (!props.allowedTokens.length) return undefined;

	const items = props.allowedTokens.map((token) => {
		const name = tokenName(token);
		return { id: name, value: name };
	});

	return [
		{ name: 'blots/mention', module: MentionBlot },
		{
			name: 'modules/mention',
			module: Mention,
			options: {
				mentionDenotationChars: ['@'],
				allowedChars: /^[A-Za-z0-9_]*$/,
				showDenotationChar: false,
				spaceAfterInsert: true,
				source: (searchTerm: string, renderList: (matches: Array<{ id: string; value: string }>, term: string) => void) => {
					const term = searchTerm.toLowerCase();
					const matches = !term
						? items
						: items.filter((item) => item.value.toLowerCase().includes(term));
					renderList(matches, searchTerm);
				},
				onSelect(this: MentionModuleHost, item: { id: string; value: string }, _insertItem: unknown) {
					const token = tokenValue(item.value);
					const editor = this.quill;
					const start = this.mentionCharPos;
					const length = this.cursorPos - this.mentionCharPos;
					editor.deleteText(start, length, 'user');
					editor.insertText(start, token, 'user');
					editor.insertText(start + token.length, ' ', 'user');
					editor.setSelection(start + token.length + 1, 0, 'user');
				},
			},
		},
	];
});

// retain insertToken / updateContent / maxLength / ariaLabel watch unchanged
</script>
```

Remove `#toolbarId` custom toolbar DOM and related `toolbarId` / i18n aria labels for individual bold/italic/link buttons if unused. Keep container styles for `.ql-toolbar` / `.ql-container`.

- [x] **Step 3: Run tests to verify they pass**

Run: `cd /Users/szejinggo/Documents/Projects/ecommerce/wemotoo-portal && bun run test:vitest:run -- test/nuxt/template-studio-editors.nuxt.spec.ts`

Expected: PASS for essential toolbar, mention registration, TokenPicker insert, maxLength rejection.

---

### Task 3: Verification sweep

**Files:** none new

- [x] **Step 1: Re-run focused editor tests**

Run: `bun run test:vitest:run -- test/nuxt/template-studio-editors.nuxt.spec.ts`

Expected: all green.

- [x] **Step 2: Typecheck if feasible**

Run: `bun run typecheck`

Expected: no new errors in RichTextEditor / tests.

---

## Spec coverage checklist

| Spec requirement | Task |
| --- | --- |
| SSR via `.client.vue` | Task 2 (keep suffix; browser-only mention import in client component) |
| `toolbar="essential"` | Task 1 + 2 |
| quill-mention `@` autocomplete | Task 1 + 2 |
| Plain `{{token}}` on select | Task 2 `onSelect` |
| Keep TokenPicker chips | Task 2 template |
| Subject unchanged | Explicit non-touch |
| Tests updated | Task 1 + 3 |
