# Product Import Source Logos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show brand marks next to Wemotoo, Sitegiant, and TikTok options in the product import source modal so admins can pick a template at a glance.

**Architecture:** Extend each `importSources` item with optional `logoSrc` and `icon`. `ZImportActions` renders a small left-side mark when either is present (`logoSrc` wins). The products listing page supplies the concrete assets/icons. No backend or package changes.

**Tech Stack:** Vue 3, Nuxt 4, Nuxt UI (`UButton`, `UIcon`, `UModal`), TypeScript, Vitest + `@nuxt/test-utils`, Tailwind CSS, existing `@iconify-json/simple-icons`.

## Global Constraints

- Prefer `logoSrc` over `icon` when both are set.
- Keep SiteGiant artwork colors as-is (including black plate); do not recolor or crop.
- Do not add npm packages.
- Do not change import selection / file-picker behavior.
- `public/logo/sitegiant.png` is already committed; do not re-download unless the file is missing.
- Use Node-based Nuxt commands; do not run portal Nuxt scripts with `bun --bun`.

## File map

| File | Responsibility |
|------|----------------|
| `app/components/Z/ImportActions.vue` | Shared import toolbar + source modal; render optional mark |
| `app/pages/products/listing.vue` | Supply Wemotoo/Sitegiant/TikTok marks on `productImportSources` |
| `public/logo/sitegiant.png` | SiteGiant brand mark (already present) |
| `public/logo/logo.png` | Wemotoo logo (already present) |
| `test/nuxt/z-import-actions.nuxt.spec.ts` | Component coverage for marks + existing import flow |

---

### Task 1: Render optional logos/icons in `ZImportActions`

**Files:**
- Modify: `app/components/Z/ImportActions.vue`
- Test: `test/nuxt/z-import-actions.nuxt.spec.ts`

**Interfaces:**
- Consumes: existing `importSources` array shape plus optional `logoSrc?: string` and `icon?: string`
- Produces: source buttons that show `<img>` when `logoSrc` is set, else `<UIcon>` when `icon` is set, else text only

- [ ] **Step 1: Write the failing mark-rendering test**

Append this test to `test/nuxt/z-import-actions.nuxt.spec.ts` (keep existing tests unchanged):

```ts
	it('renders logoSrc image and icon mark for import sources', async () => {
		const wrapper = await mountSuspended(ZImportActions, {
			props: {
				accept: '.xlsx,.xls',
				importSources: [
					{ label: 'Our template', value: 'wemotoo', logoSrc: '/logo/logo.png' },
					{ label: 'Sitegiant', value: 'sitegiant', logoSrc: '/logo/sitegiant.png' },
					{ label: 'TikTok Shop', value: 'tiktok', icon: 'i-simple-icons-tiktok' },
					{ label: 'Plain', value: 'plain' },
				],
			},
		});

		const buttons = wrapper.findAll('button');
		await buttons[1]?.trigger('click');

		const images = wrapper.findAll('img');
		expect(images.some((img) => img.attributes('src') === '/logo/logo.png')).toBe(true);
		expect(images.some((img) => img.attributes('src') === '/logo/sitegiant.png')).toBe(true);

		const html = wrapper.html();
		expect(html).toContain('i-simple-icons-tiktok');
		expect(wrapper.findAll('button').find((button) => button.text().includes('Plain'))).toBeTruthy();
	});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd /Users/szejinggo/Documents/Projects/ecommerce/ecommerce-portal
npm run test:vitest:run -- test/nuxt/z-import-actions.nuxt.spec.ts
```

Expected: FAIL because source buttons do not render `logoSrc` / `icon` marks yet.

- [ ] **Step 3: Implement mark rendering in `ZImportActions.vue`**

Update the props type:

```ts
		importSources?: Array<{
			label: string;
			value: string;
			description?: string;
			logoSrc?: string;
			icon?: string;
		}>;
```

Replace the source button inner content with:

```vue
					<UButton
						v-for="source in importSources"
						:key="source.value"
						color="neutral"
						variant="outline"
						class="min-w-0 flex-1 justify-start text-left"
						@click="selectImportSource(source.value)"
					>
						<div class="flex min-w-0 items-center gap-2">
							<img
								v-if="source.logoSrc"
								:src="source.logoSrc"
								:alt="source.label"
								class="h-6 w-6 shrink-0 object-contain"
							/>
							<UIcon
								v-else-if="source.icon"
								:name="source.icon"
								class="h-6 w-6 shrink-0"
							/>
							<div class="flex min-w-0 flex-col items-start gap-1">
								<span class="font-medium">{{ source.label }}</span>
								<span v-if="source.description" class="text-xs text-gray-500 dark:text-gray-400">{{ source.description }}</span>
							</div>
						</div>
					</UButton>
```

Do not change download/import button behavior, file validation, or emit signatures.

- [ ] **Step 4: Run the test and verify GREEN**

Run:

```bash
cd /Users/szejinggo/Documents/Projects/ecommerce/ecommerce-portal
npm run test:vitest:run -- test/nuxt/z-import-actions.nuxt.spec.ts
```

Expected: PASS (all tests in the file, including the new mark test and existing source-selection test).

- [ ] **Step 5: Commit**

```bash
cd /Users/szejinggo/Documents/Projects/ecommerce/ecommerce-portal
git add app/components/Z/ImportActions.vue test/nuxt/z-import-actions.nuxt.spec.ts
git commit -m "$(cat <<'EOF'
feat(import): render optional logos on import source buttons

Make template sources scannable in the import modal without changing selection flow.
EOF
)"
```

---

### Task 2: Wire product listing import source marks

**Files:**
- Modify: `app/pages/products/listing.vue` (the `productImportSources` computed around lines 100–116)

**Interfaces:**
- Consumes: Task 1 `logoSrc` / `icon` fields on `ZImportActions` `importSources`
- Produces: product listing sources with Wemotoo/Sitegiant images and TikTok Iconify icon

- [ ] **Step 1: Add marks to `productImportSources`**

Replace the computed with:

```ts
const productImportSources = computed(() => [
	{
		label: t('import.ourTemplate'),
		value: 'wemotoo',
		description: t('import.ourTemplateDescription'),
		logoSrc: '/logo/logo.png',
	},
	{
		label: t('import.sitegiant'),
		value: 'sitegiant',
		description: t('import.sitegiantDescription'),
		logoSrc: '/logo/sitegiant.png',
	},
	{
		label: t('import.tiktok'),
		value: 'tiktok',
		description: t('import.tiktokDescription'),
		icon: 'i-simple-icons-tiktok',
	},
]);
```

Confirm `public/logo/sitegiant.png` and `public/logo/logo.png` exist. Do not change `importProductFile` / template type mapping.

- [ ] **Step 2: Smoke-check the page composition**

Run:

```bash
cd /Users/szejinggo/Documents/Projects/ecommerce/ecommerce-portal
npm run test:vitest:run -- test/nuxt/z-import-actions.nuxt.spec.ts
```

Expected: PASS.

Optional manual check: open Products listing → Import → confirm three marks appear (Wemotoo image, Sitegiant image, TikTok icon).

- [ ] **Step 3: Commit**

```bash
cd /Users/szejinggo/Documents/Projects/ecommerce/ecommerce-portal
git add app/pages/products/listing.vue
git commit -m "$(cat <<'EOF'
feat(products): show brand marks on import template sources

Help merchants recognize Wemotoo, Sitegiant, and TikTok import templates at a glance.
EOF
)"
```

---

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| Optional `logoSrc` / `icon` contract | Task 1 |
| `logoSrc` precedes `icon` | Task 1 template (`v-if` / `v-else-if`) |
| ~24×24 mark left of label/description | Task 1 (`h-6 w-6`, horizontal flex) |
| Wemotoo `/logo/logo.png` | Task 2 |
| Sitegiant `/logo/sitegiant.png` | Task 2 (asset already present) |
| TikTok `i-simple-icons-tiktok` | Task 2 |
| Text-only when no mark | Task 1 test (`Plain` source) |
| No backend / package / recolor work | Global constraints |
| Existing selection flow unchanged | Task 1 (no emit/flow edits) |
