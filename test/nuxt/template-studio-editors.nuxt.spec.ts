import { flushPromises } from '@vue/test-utils';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ContentEditor from '~/components/Z/TemplateStudio/ContentEditor.vue';
import BrandEditor from '~/components/Z/TemplateStudio/BrandEditor.vue';
import SectionEditor from '~/components/Z/TemplateStudio/SectionEditor.vue';
import TokenPicker from '~/components/Z/TemplateStudio/TokenPicker.vue';
import TokenPlainTextInput from '~/components/Z/TemplateStudio/TokenPlainTextInput.vue';
import RichTextEditor from '~/components/Z/TemplateStudio/RichTextEditor.client.vue';
import { IMAGE_FORMAT_ERROR_MESSAGE } from '~/repository/modules/image/image';
import type {
	DocumentTemplateBlock,
	DocumentTemplateConfiguration,
	DocumentTemplateField,
} from '~/utils/types/document-template';

const contentFields: DocumentTemplateField[] = [
	{
		path: 'content.subject',
		label: 'Subject',
		kind: 'plain-text',
		max_length: 200,
		allow_blank: false,
		allowed_tokens: ['customerName', 'invoiceNumber'],
	},
	{
		path: 'content.greeting',
		label: 'Greeting',
		kind: 'rich-text',
		max_length: 500,
		allow_blank: false,
		allowed_tokens: ['customerName'],
	},
	{
		path: 'content.rawHtml',
		label: 'Raw HTML',
		kind: 'plain-text',
		max_length: 500,
		allow_blank: false,
		allowed_tokens: [],
	},
];

const brandFields: DocumentTemplateField[] = [
	{
		path: 'brand.logoAssetId',
		label: 'Logo',
		kind: 'asset',
		max_length: 0,
		allow_blank: false,
		allowed_tokens: [],
	},
	{
		path: 'brand.primaryColor',
		label: 'Primary colour',
		kind: 'color',
		max_length: 7,
		allow_blank: false,
		allowed_tokens: [],
	},
	{
		path: 'brand.secondaryColor',
		label: 'Secondary colour',
		kind: 'color',
		max_length: 7,
		allow_blank: false,
		allowed_tokens: [],
	},
	{
		path: 'merchantInfo.companyName',
		label: 'Company name',
		kind: 'merchant-info',
		max_length: 500,
		allow_blank: true,
		allowed_tokens: [],
	},
	{
		path: 'merchantInfo.companyEmail',
		label: 'Company email',
		kind: 'merchant-info',
		max_length: 500,
		allow_blank: false,
		allowed_tokens: [],
	},
	{
		path: 'brand.customCss',
		label: 'Custom CSS',
		kind: 'plain-text',
		max_length: 500,
		allow_blank: true,
		allowed_tokens: [],
	},
];

const invoiceBlocks: DocumentTemplateBlock[] = [
	{ id: 'merchantContact', label: 'Merchant contact', required: false, default_enabled: true },
	{ id: 'orderItems', label: 'Order items', required: true, default_enabled: true },
	{ id: 'taxSummary', label: 'Tax summary', required: false, default_enabled: false },
];

const configuration: DocumentTemplateConfiguration = {
	content: {
		subject: 'Invoice for ',
		greeting: '<p>Hello {{customerName}}</p>',
	},
	brand: {
		primaryColor: '#112233',
	},
	merchantInfo: {
		companyName: 'Template merchant',
	},
	blocks: [
		{ id: 'taxSummary', enabled: false, props: {} },
		{ id: 'orderItems', enabled: false, props: {} },
	],
};

function deferred<T>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
} {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

afterEach(async () => {
	vi.restoreAllMocks();
	if (useNuxtApp().$i18n.locale.value !== 'en') await useNuxtApp().$i18n.setLocale('en');
});

describe('Template Studio controlled content editor', () => {
	it('shows the catalog subject only for email entries and inserts an allowlisted token at the current selection', async () => {
		const wrapper = await mountSuspended(ContentEditor, {
			props: {
				entry: { channel: 'email', fields: contentFields, allowed_tokens: ['customerName', 'invoiceNumber'] },
				modelValue: configuration,
			},
		});
		expect(wrapper.get('[data-field="content.subject"] [data-testid="token-plain-text-input"]').exists()).toBe(true);
		const plain = wrapper.getComponent(TokenPlainTextInput);
		plain.vm.setSelection(8, 8);
		await nextTick();
		await wrapper.get('[data-field="content.subject"] [data-token="invoiceNumber"]').trigger('click');

		expect(wrapper.find('[data-field="content.subject"]').exists()).toBe(true);
		expect(wrapper.find('[data-field="content.greeting"]').exists()).toBe(true);
		expect(wrapper.find('[data-field="content.rawHtml"]').exists()).toBe(false);
		expect(wrapper.find('[data-token="unknownToken"]').exists()).toBe(false);
		expect(wrapper.emitted('update:path')?.[0]).toEqual([
			'content.subject',
			'Invoice {{invoiceNumber}}for ',
		]);
		// Insert at offset 8 → cursor after `{{invoiceNumber}}` (must not clamp to pre-insert length).
		const expectedCursor = 8 + '{{invoiceNumber}}'.length;
		expect(plain.vm.selectionStart).toBe(expectedCursor);
		expect(plain.vm.selectionEnd).toBe(expectedCursor);

		await wrapper.setProps({
			modelValue: {
				...configuration,
				content: {
					...configuration.content,
					subject: 'Invoice {{invoiceNumber}}for ',
				},
			},
		});
		await nextTick();
		expect(plain.vm.selectionStart).toBe(expectedCursor);
		expect(plain.vm.selectionEnd).toBe(expectedCursor);

		const greetingEditor = wrapper.get('[data-field="content.greeting"]')
			.getComponent({ name: 'QuillEditor' });
		greetingEditor.vm.$emit('update:content', 'x'.repeat(501));
		await nextTick();
		expect(wrapper.emitted('update:path')).toHaveLength(1);
		greetingEditor.vm.$emit('update:content', 'x'.repeat(500));
		await nextTick();
		expect(wrapper.emitted('update:path')?.[1]).toEqual(['content.greeting', 'x'.repeat(500)]);

		await wrapper.setProps({
			modelValue: {
				...configuration,
				content: { subject: 'Hi {{customerName}}', greeting: configuration.content?.greeting },
			},
		});
		await nextTick();
		expect(wrapper.get('[data-field="content.subject"] [data-token-chip="customerName"]').exists()).toBe(true);
		expect(wrapper.find('[data-field="content.subject"] [data-token-chip="unknown"]').exists()).toBe(false);

		const pdfWrapper = await mountSuspended(ContentEditor, {
			props: {
				entry: { channel: 'pdf', fields: contentFields, allowed_tokens: ['invoiceNumber'] },
				modelValue: configuration,
			},
		});
		expect(pdfWrapper.find('[data-field="content.subject"]').exists()).toBe(false);
	});

	it('keeps the caret after typed characters when the controlled value catches up', async () => {
		const wrapper = await mountSuspended(TokenPlainTextInput, {
			props: {
				modelValue: '',
				allowedTokens: ['{{customerName}}'],
			},
		});
		const editable = wrapper.get('[data-testid="token-plain-text-input"]');
		const root = editable.element as HTMLElement;
		const textHost = (root.querySelector('span') ?? root) as HTMLElement;
		textHost.textContent = 'Ab';
		const textNode = textHost.firstChild as Text;
		const range = document.createRange();
		range.setStart(textNode, 2);
		range.collapse(true);
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);

		await editable.trigger('input');

		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Ab']);
		expect(wrapper.vm.selectionStart).toBe(2);
		expect(wrapper.vm.selectionEnd).toBe(2);

		await wrapper.setProps({ modelValue: 'Ab' });
		await nextTick();
		expect(wrapper.vm.selectionStart).toBe(2);
		expect(wrapper.vm.selectionEnd).toBe(2);

		// DOM caret must stay at the end — resetting to 0 produces garbled subjects like HeyYourHeyYou…
		const live = window.getSelection();
		expect(live?.rangeCount).toBeGreaterThan(0);
		const liveRange = live!.getRangeAt(0);
		expect(liveRange.startOffset).toBe(2);
		expect(liveRange.collapsed).toBe(true);
		expect(root.textContent).toBe('Ab');
	});

	it('keeps the subject on one line and blocks Enter', async () => {
		const wrapper = await mountSuspended(TokenPlainTextInput, {
			props: {
				modelValue: 'Hello',
				allowedTokens: ['{{orderNumber}}'],
			},
		});
		const editable = wrapper.get('[data-testid="token-plain-text-input"]');
		expect(editable.attributes('aria-multiline')).toBe('false');
		expect(editable.classes()).toContain('whitespace-nowrap');

		await editable.trigger('keydown', { key: 'Enter' });
		expect(wrapper.emitted('update:modelValue')).toBeUndefined();

		const root = editable.element as HTMLElement;
		const textHost = (root.querySelector('span') ?? root) as HTMLElement;
		textHost.textContent = 'Hello\nWorld';
		const textNode = textHost.firstChild as Text;
		const range = document.createRange();
		range.setStart(textNode, textNode.textContent?.length ?? 0);
		range.collapse(true);
		window.getSelection()?.removeAllRanges();
		window.getSelection()?.addRange(range);
		await editable.trigger('input');

		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Hello World']);
	});

	it('does not drop subject keystrokes while the controlled value echoes back', async () => {
		const wrapper = await mountSuspended(TokenPlainTextInput, {
			props: {
				modelValue: '',
				allowedTokens: ['{{orderNumber}}'],
			},
		});
		const editable = wrapper.get('[data-testid="token-plain-text-input"]');

		async function typeIntoEditable(value: string): Promise<void> {
			const root = editable.element as HTMLElement;
			const textHost = (root.querySelector('span') ?? root) as HTMLElement;
			textHost.textContent = value;
			const textNode = textHost.firstChild as Text;
			const range = document.createRange();
			range.setStart(textNode, value.length);
			range.collapse(true);
			window.getSelection()?.removeAllRanges();
			window.getSelection()?.addRange(range);
			await editable.trigger('input');
		}

		await typeIntoEditable('H');
		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['H']);

		// Type ahead of the parent echo, then apply the stale echo — live DOM must win.
		await typeIntoEditable('Hye');
		await wrapper.setProps({ modelValue: 'H' });
		await nextTick();

		const emissions = wrapper.emitted('update:modelValue') ?? [];
		expect(emissions.at(-1)).toEqual(['Hye']);
	});

	it('keeps token input catalog-owned and displays backend field errors beside the matching field', async () => {
		const tokenWrapper = await mountSuspended(TokenPicker, {
			props: {
				allowedTokens: ['customerName'],
				modelValue: 'Hello customer',
				selectionStart: 6,
				selectionEnd: 14,
			},
		});
		await tokenWrapper.get('[data-token="customerName"]').trigger('click');
		expect(tokenWrapper.emitted('update:modelValue')?.[0]).toEqual(['Hello {{customerName}}']);
		expect(tokenWrapper.find('input').exists()).toBe(false);

		const wrapper = await mountSuspended(ContentEditor, {
			props: {
				entry: { channel: 'email', fields: contentFields, allowed_tokens: ['customerName'] },
				modelValue: configuration,
				fieldErrors: { 'content.greeting': 'Unsupported template expression' },
			},
		});
		expect(wrapper.get('[data-field="content.greeting"] [data-field-error="content.greeting"]').text())
			.toBe('Unsupported template expression');
	});

	it('preflights plain-text token replacements against the catalog limit without moving the cursor', async () => {
		const wrapper = await mountSuspended(TokenPicker, {
			props: {
				allowedTokens: ['invoiceNumber'],
				modelValue: 'Order 1234567890',
				selectionStart: 6,
				selectionEnd: 16,
				maxLength: 22,
			},
		});
		await wrapper.get('[data-token="invoiceNumber"]').trigger('click');

		expect(wrapper.emitted('select')).toBeUndefined();
		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
		expect(wrapper.emitted('inserted')).toBeUndefined();

		await wrapper.setProps({ maxLength: 23 });
		await wrapper.get('[data-token="invoiceNumber"]').trigger('click');
		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['Order {{invoiceNumber}}']);
		expect(wrapper.emitted('inserted')?.[0]).toEqual(['Order {{invoiceNumber}}', 23]);
	});

	it('passes the catalog subject limit to token insertion', async () => {
		const wrapper = await mountSuspended(ContentEditor, {
			props: {
				entry: {
					channel: 'email',
					fields: [{
						...contentFields[0]!,
						max_length: 12,
						allowed_tokens: ['customerName'],
					}],
					allowed_tokens: ['customerName'],
				},
				modelValue: { content: { subject: '123456789012' } },
			},
		});
		await wrapper.get('[data-token="customerName"]').trigger('click');

		expect(wrapper.emitted('update:path')).toBeUndefined();
	});
});

describe('Template Studio restricted rich text editor', () => {
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
		expect(wrapper.find('.ql-image').exists()).toBe(false);
		expect(wrapper.find('.ql-video').exists()).toBe(false);
		expect(wrapper.find('[data-raw-html]').exists()).toBe(false);
	});

	it('registers quill-mention modules when allowlisted tokens are present', async () => {
		const wrapper = await mountSuspended(RichTextEditor, {
			props: { modelValue: '<p>Hello</p>', allowedTokens: ['customerName'] },
		});

		const modules = wrapper.getComponent({ name: 'QuillEditor' }).props('modules') as Array<{
			name: string;
			options?: {
				mentionDenotationChars?: string[];
				source?: (searchTerm: string, renderList: (matches: unknown[], term: string) => void) => void;
			};
		}>;
		expect(modules.map((entry) => entry.name)).toEqual(['blots/mention', 'modules/mention']);
		expect(modules[1]?.options?.mentionDenotationChars).toEqual(['@']);

		const matches: unknown[] = [];
		modules[1]?.options?.source?.('customer', (items) => {
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

	it('inserts an allowlisted rich-text token at the last editor selection after the picker takes focus', async () => {
		const wrapper = await mountSuspended(RichTextEditor, {
			props: { modelValue: '<p>Hello</p>', allowedTokens: ['customerName'] },
		});
		const editor = {
			getSelection: vi.fn(() => ({ index: 0, length: 0 })),
			deleteText: vi.fn(),
			insertText: vi.fn(),
			insertEmbed: vi.fn(),
			updateContents: vi.fn(),
			setSelection: vi.fn(),
			getIndex: vi.fn(),
		};
		const quill = wrapper.getComponent({ name: 'QuillEditor' });
		quill.vm.$emit('ready', editor);
		quill.vm.$emit('selectionChange', { range: { index: 4, length: 3 } });
		await wrapper.get('[data-token="customerName"]').trigger('click');

		expect(editor.updateContents).toHaveBeenCalledWith(expect.anything(), 'user');
		expect((editor.updateContents.mock.calls[0]?.[0] as { ops: unknown[] }).ops).toEqual([
			{ retain: 4 },
			{ insert: { templateToken: '{{customerName}}' } },
			{ delete: 3 },
		]);
		expect(editor.deleteText).not.toHaveBeenCalled();
		expect(editor.insertText).not.toHaveBeenCalled();
		expect(editor.setSelection).toHaveBeenCalledWith(5, 0, 'silent');
	});

	it('keeps the parent and editor synchronized when a selected token replacement exceeds the limit', async () => {
		const wrapper = await mountSuspended(RichTextEditor, {
			props: {
				modelValue: '<p>Hello world</p>',
				allowedTokens: ['customerName'],
				maxLength: 18,
			},
		});
		const quill = wrapper.getComponent({ name: 'QuillEditor' });
		const setContents = vi.spyOn(
			quill.vm as unknown as { setContents: (content: string, source?: string) => void },
			'setContents',
		);
		const editor = {
			root: document.createElement('div'),
			getSelection: vi.fn(),
			deleteText: vi.fn(),
			insertText: vi.fn(),
			insertEmbed: vi.fn(),
			updateContents: vi.fn(() => quill.vm.$emit('update:content', '<p>Hello {{customerName}}ld</p>')),
			setSelection: vi.fn(),
			getIndex: vi.fn(),
		};
		quill.vm.$emit('ready', editor);
		quill.vm.$emit('selectionChange', { range: { index: 6, length: 3 } });
		await wrapper.get('[data-token="customerName"]').trigger('click');

		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
		expect(editor.updateContents).toHaveBeenCalledOnce();
		expect(setContents).toHaveBeenCalledWith('<p>Hello world</p>', 'silent');
		expect(editor.setSelection).toHaveBeenCalledWith(6, 3, 'silent');
	});

	it('does not append an over-limit token while the editor is unavailable', async () => {
		const wrapper = await mountSuspended(RichTextEditor, {
			props: {
				modelValue: '123456789012',
				allowedTokens: ['customerName'],
				maxLength: 12,
			},
		});
		const quill = wrapper.getComponent({ name: 'QuillEditor' });
		vi.spyOn(quill.vm as unknown as { getQuill: () => unknown }, 'getQuill').mockReturnValue(undefined);
		await wrapper.get('[data-token="customerName"]').trigger('click');

		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
	});

	it('rejects oversized HTML, restores the controlled value, and labels the editable surface', async () => {
		const wrapper = await mountSuspended(RichTextEditor, {
			props: {
				modelValue: '<p>Hello</p>',
				maxLength: 12,
				ariaLabel: 'Greeting',
			},
		});
		const quill = wrapper.getComponent({ name: 'QuillEditor' });
		const setContents = vi.spyOn(
			quill.vm as unknown as { setContents: (content: string, source?: string) => void },
			'setContents',
		);
		const root = document.createElement('div');
		quill.vm.$emit('ready', {
			root,
			getSelection: vi.fn(),
			deleteText: vi.fn(),
			insertText: vi.fn(),
			setSelection: vi.fn(),
		});
		quill.vm.$emit('update:content', '<p>123456</p>');
		await nextTick();

		expect(wrapper.emitted('update:modelValue')).toBeUndefined();
		expect(setContents).toHaveBeenCalledWith('<p>Hello</p>', 'silent');
		expect(root.getAttribute('aria-label')).toBe('Greeting');

		quill.vm.$emit('update:content', '<p>12345</p>');
		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['<p>12345</p>']);
	});

	it('registers a templateToken embed format and hydrates allowlisted tokens as chips in HTML', async () => {
		const wrapper = await mountSuspended(RichTextEditor, {
			props: {
				modelValue: '<p>Hello {{customerName}} and {{unknown}}</p>',
				allowedTokens: ['customerName'],
			},
		});
		const quill = wrapper.getComponent({ name: 'QuillEditor' });
		expect(quill.props('options').formats).toContain('templateToken');
		const content = String(quill.props('content'));
		// Content passed into Quill should be hydrated chip HTML, not raw braces only:
		expect(content).toContain('data-token="customerName"');
		// Unknown tokens stay literal text (un-chipped):
		expect(content).toContain('{{unknown}}');
		expect(content).not.toContain('data-token="unknown"');
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

	it('chipifies typed/pasted allowlisted {{tokens}} on user text-change without rebinding content', async () => {
		const textChangeHandlers: Array<(...args: unknown[]) => void> = [];
		const editor = {
			root: document.createElement('div'),
			getSelection: vi.fn(() => ({ index: 22, length: 0 })),
			getContents: vi.fn(() => ({
				ops: [{ insert: 'Hello {{customerName}}\n' }],
			})),
			deleteText: vi.fn(),
			insertEmbed: vi.fn(),
			insertText: vi.fn(),
			updateContents: vi.fn(),
			setSelection: vi.fn(),
			getIndex: vi.fn(),
			on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
				if (event === 'text-change') textChangeHandlers.push(handler);
			}),
		};
		const wrapper = await mountSuspended(RichTextEditor, {
			props: {
				modelValue: '<p>Hello</p>',
				allowedTokens: ['customerName'],
			},
		});
		const quill = wrapper.getComponent({ name: 'QuillEditor' });
		const contentBeforeReady = String(quill.props('content'));
		quill.vm.$emit('ready', editor);
		await nextTick();

		expect(textChangeHandlers).toHaveLength(1);
		textChangeHandlers[0]?.({}, {}, 'user');

		expect(editor.deleteText).toHaveBeenCalledWith(6, 16, 'api');
		expect(editor.insertEmbed).toHaveBeenCalledWith(6, 'templateToken', '{{customerName}}', 'api');
		expect(editor.setSelection).toHaveBeenCalledWith(7, 0, 'silent');
		// Self-echo guard path: do not fight Quill by rebinding hydrated :content
		expect(String(quill.props('content'))).toBe(contentBeforeReady);

		editor.deleteText.mockClear();
		editor.insertEmbed.mockClear();
		textChangeHandlers[0]?.({}, {}, 'api');
		expect(editor.deleteText).not.toHaveBeenCalled();
		expect(editor.insertEmbed).not.toHaveBeenCalled();
	});
});

describe('Template Studio brand and merchant information editor', () => {
	it('renders recognized brand paths only with their approved catalog control kind', async () => {
		const wrapper = await mountSuspended(BrandEditor, {
			props: {
				fields: [{
					path: 'brand.logoAssetId',
					label: 'Logo as colour',
					kind: 'color',
					max_length: 7,
					allow_blank: false,
					allowed_tokens: [],
				}],
				modelValue: configuration,
				inherited: {},
			},
		});

		expect(wrapper.find('[data-field="brand.logoAssetId"]').exists()).toBe(false);
	});

	it('shows resolved brand values and clears overrides for brand and merchant information', async () => {
		const wrapper = await mountSuspended(BrandEditor, {
			props: {
				fields: brandFields,
				modelValue: configuration,
				inherited: {
					brand: { primaryColor: '#EE7F01', secondaryColor: '#003B72' },
					merchantInfo: { companyName: 'Store Profile merchant', companyEmail: 'store@example.com' },
				},
			},
		});

		expect(wrapper.get('[data-color-text="brand.primaryColor"]').element).toHaveProperty('value', configuration.brand?.primaryColor);
		expect(wrapper.get('[data-color-text="brand.secondaryColor"]').element).toHaveProperty('value', '#003B72');
		expect(wrapper.find('[data-source]').exists()).toBe(false);
		expect(wrapper.find('[data-field="brand.customCss"]').exists()).toBe(false);
		expect(wrapper.find('[data-hide]').exists()).toBe(false);
		await wrapper.get('[data-clear="brand.primaryColor"]').trigger('click');

		expect(wrapper.emitted('clear:path')?.[0]).toEqual(['brand.primaryColor']);
	});

	it('validates six-digit hex colours before emitting an override', async () => {
		const wrapper = await mountSuspended(BrandEditor, {
			props: {
				fields: brandFields,
				modelValue: configuration,
				inherited: {},
			},
		});
		const input = wrapper.get('[data-color-text="brand.primaryColor"]');
		expect(input.attributes('aria-label')).toBe('Primary colour');

		await input.setValue('#12345');
		expect(wrapper.find('[data-color-error="brand.primaryColor"]').exists()).toBe(true);
		expect(wrapper.emitted('update:path')).toBeUndefined();

		await input.setValue('#12aBcF');
		expect(wrapper.emitted('update:path')?.[0]).toEqual(['brand.primaryColor', '#12aBcF']);
	});

	it('clears stale local colour errors when the controlled configuration changes', async () => {
		const wrapper = await mountSuspended(BrandEditor, {
			props: {
				fields: brandFields,
				modelValue: configuration,
				inherited: {},
			},
		});
		await wrapper.get('[data-color-text="brand.primaryColor"]').setValue('#12345');
		expect(wrapper.find('[data-color-error="brand.primaryColor"]').exists()).toBe(true);

		await wrapper.setProps({
			modelValue: {
				...configuration,
				brand: { primaryColor: '#ABCDEF' },
			},
		});

		expect(wrapper.find('[data-color-error="brand.primaryColor"]').exists()).toBe(false);
		expect(wrapper.get('[data-color-text="brand.primaryColor"]').element)
			.toHaveProperty('value', '#ABCDEF');
	});

	it('drops a cleared or reset override from its local colour cache and resolves the catalog default', async () => {
		const wrapper = await mountSuspended(BrandEditor, {
			props: {
				fields: brandFields,
				modelValue: { brand: { primaryColor: '#112233' } },
				inherited: {},
				systemDefaults: { brand: { primaryColor: '#EE7F01' } },
			},
		});

		await wrapper.get('[data-clear="brand.primaryColor"]').trigger('click');
		await wrapper.setProps({ modelValue: {} });
		expect(wrapper.get('[data-color-text="brand.primaryColor"]').element).toHaveProperty('value', '#EE7F01');
		expect(wrapper.find('[data-source]').exists()).toBe(false);

		await wrapper.setProps({ modelValue: { brand: { primaryColor: '#445566' } } });
		await wrapper.setProps({ modelValue: {} });
		expect(wrapper.get('[data-color-text="brand.primaryColor"]').element).toHaveProperty('value', '#EE7F01');
	});

	it('keeps merchant information controlled after clear, edit, empty hide, and external updates', async () => {
		const wrapper = await mountSuspended(BrandEditor, {
			props: {
				fields: brandFields,
				modelValue: configuration,
				inherited: { merchantInfo: { companyName: 'Store Profile merchant' } },
			},
		});
		await wrapper.get('[data-clear="merchantInfo.companyName"]').trigger('click');
		await wrapper.setProps({
			modelValue: {
				...configuration,
				merchantInfo: {},
			},
		});
		const input = wrapper.get('[data-field="merchantInfo.companyName"] input');
		expect(input.element).toHaveProperty('value', 'Store Profile merchant');

		await input.setValue('Edited merchant');
		await input.setValue('');
		expect(wrapper.emitted('update:path')?.at(-2)).toEqual(['merchantInfo.companyName', 'Edited merchant']);
		expect(wrapper.emitted('update:path')?.at(-1)).toEqual(['merchantInfo.companyName', '']);

		await wrapper.setProps({
			modelValue: {
				...configuration,
				merchantInfo: { companyName: 'Externally updated merchant' },
			},
		});
		expect(input.element).toHaveProperty('value', 'Externally updated merchant');
	});

	it('clears transient logo previews on clear and controlled model changes', async () => {
		const upload = vi.spyOn(useNuxtApp().$api.image, 'upload').mockResolvedValue({
			image: { id: 42, url: 'https://cdn.example.com/transient-logo.png' },
		});
		const wrapper = await mountSuspended(BrandEditor, {
			props: {
				fields: brandFields,
				modelValue: {
					...configuration,
					brand: { ...configuration.brand, logoAssetId: 7 },
				},
				inherited: { brand: { logoAssetId: 4 } },
				logoUrl: 'https://cdn.example.com/override-logo.png',
			},
		});
		expect(wrapper.get('[data-logo-preview]').attributes('src')).toBe('https://cdn.example.com/override-logo.png');

		await wrapper.get('[data-clear="brand.logoAssetId"]').trigger('click');
		expect(wrapper.find('[data-logo-preview]').exists()).toBe(false);
		await wrapper.setProps({
			modelValue: { ...configuration, brand: { ...configuration.brand } },
			logoUrl: 'https://cdn.example.com/inherited-logo.png',
		});
		expect(wrapper.get('[data-logo-preview]').attributes('src')).toBe('https://cdn.example.com/inherited-logo.png');

		wrapper.getComponent({ name: 'UFileUpload' }).vm.$emit(
			'update:modelValue',
			new File(['logo'], 'logo.png', { type: 'image/png' }),
		);
		await flushPromises();
		expect(upload).toHaveBeenCalledOnce();
		expect(wrapper.get('[data-logo-preview]').attributes('src')).toBe('https://cdn.example.com/transient-logo.png');

		await wrapper.setProps({
			modelValue: { ...configuration, brand: { ...configuration.brand, logoAssetId: 99 } },
		});
		expect(wrapper.get('[data-logo-preview]').attributes('src')).toBe('https://cdn.example.com/inherited-logo.png');
	});

	it('ignores a pending logo upload after the override is cleared', async () => {
		const pending = deferred<{ image: { id: number; url: string } }>();
		vi.spyOn(useNuxtApp().$api.image, 'upload').mockReturnValue(pending.promise);
		const wrapper = await mountSuspended(BrandEditor, {
			props: {
				fields: brandFields,
				modelValue: {
					...configuration,
					brand: { ...configuration.brand, logoAssetId: 7 },
				},
				logoUrl: 'https://cdn.example.com/current-logo.png',
			},
		});
		wrapper.getComponent({ name: 'UFileUpload' }).vm.$emit(
			'update:modelValue',
			new File(['a'], 'a.png', { type: 'image/png' }),
		);
		await nextTick();
		expect(wrapper.getComponent({ name: 'UFileUpload' }).props('disabled')).toBe(true);

		await wrapper.get('[data-clear="brand.logoAssetId"]').trigger('click');
		pending.resolve({ image: { id: 41, url: 'https://cdn.example.com/stale-a.png' } });
		await flushPromises();

		expect(wrapper.emitted('update:path')).toBeUndefined();
		expect(wrapper.find('[data-logo-preview]').exists()).toBe(false);
		expect(wrapper.getComponent({ name: 'UFileUpload' }).props('disabled')).toBe(false);
	});

	it('ignores a pending logo upload after an external controlled logo change', async () => {
		const pending = deferred<{ image: { id: number; url: string } }>();
		vi.spyOn(useNuxtApp().$api.image, 'upload').mockReturnValue(pending.promise);
		const wrapper = await mountSuspended(BrandEditor, {
			props: {
				fields: brandFields,
				modelValue: {
					...configuration,
					brand: { ...configuration.brand, logoAssetId: 7 },
				},
				logoUrl: 'https://cdn.example.com/current-logo.png',
			},
		});
		wrapper.getComponent({ name: 'UFileUpload' }).vm.$emit(
			'update:modelValue',
			new File(['a'], 'a.png', { type: 'image/png' }),
		);
		await wrapper.setProps({
			modelValue: {
				...configuration,
				brand: { ...configuration.brand, logoAssetId: 9 },
			},
			logoUrl: 'https://cdn.example.com/reset-logo.png',
		});

		pending.resolve({ image: { id: 41, url: 'https://cdn.example.com/stale-a.png' } });
		await flushPromises();
		expect(wrapper.emitted('update:path')).toBeUndefined();
		expect(wrapper.get('[data-logo-preview]').attributes('src')).toBe('https://cdn.example.com/reset-logo.png');
		expect(wrapper.getComponent({ name: 'UFileUpload' }).props('disabled')).toBe(false);
	});

	it('lets only the newest overlapping logo upload update the controlled value', async () => {
		const uploadA = deferred<{ image: { id: number; url: string } }>();
		const uploadB = deferred<{ image: { id: number; url: string } }>();
		vi.spyOn(useNuxtApp().$api.image, 'upload')
			.mockReturnValueOnce(uploadA.promise)
			.mockReturnValueOnce(uploadB.promise);
		const wrapper = await mountSuspended(BrandEditor, {
			props: { fields: brandFields, modelValue: configuration, inherited: {} },
		});
		const fileUpload = wrapper.getComponent({ name: 'UFileUpload' });
		fileUpload.vm.$emit('update:modelValue', new File(['a'], 'a.png', { type: 'image/png' }));
		fileUpload.vm.$emit('update:modelValue', new File(['b'], 'b.png', { type: 'image/png' }));

		uploadB.resolve({ image: { id: 52, url: 'https://cdn.example.com/logo-b.png' } });
		await flushPromises();
		expect(wrapper.emitted('update:path')).toEqual([['brand.logoAssetId', 52]]);
		expect(wrapper.get('[data-logo-preview]').attributes('src')).toBe('https://cdn.example.com/logo-b.png');

		uploadA.resolve({ image: { id: 51, url: 'https://cdn.example.com/logo-a.png' } });
		await flushPromises();
		expect(wrapper.emitted('update:path')).toEqual([['brand.logoAssetId', 52]]);
		expect(wrapper.get('[data-logo-preview]').attributes('src')).toBe('https://cdn.example.com/logo-b.png');
	});

	it('does not let a stale rejection replace the current upload loading or error state', async () => {
		const uploadA = deferred<{ image: { id: number; url: string } }>();
		const uploadB = deferred<{ image: { id: number; url: string } }>();
		vi.spyOn(useNuxtApp().$api.image, 'upload')
			.mockReturnValueOnce(uploadA.promise)
			.mockReturnValueOnce(uploadB.promise);
		const wrapper = await mountSuspended(BrandEditor, {
			props: { fields: brandFields, modelValue: configuration, inherited: {} },
		});
		const fileUpload = wrapper.getComponent({ name: 'UFileUpload' });
		fileUpload.vm.$emit('update:modelValue', new File(['a'], 'a.png', { type: 'image/png' }));
		fileUpload.vm.$emit('update:modelValue', new File(['b'], 'b.png', { type: 'image/png' }));

		uploadA.reject(new Error(IMAGE_FORMAT_ERROR_MESSAGE));
		await flushPromises();
		expect(wrapper.find('[data-field="brand.logoAssetId"] [role="alert"]').exists()).toBe(false);
		expect(fileUpload.props('disabled')).toBe(true);

		uploadB.resolve({ image: { id: 52, url: 'https://cdn.example.com/logo-b.png' } });
		await flushPromises();
		expect(wrapper.find('[data-field="brand.logoAssetId"] [role="alert"]').exists()).toBe(false);
		expect(fileUpload.props('disabled')).toBe(false);
	});

	it('ignores a pending logo upload after the editor unmounts', async () => {
		const pending = deferred<{ image: { id: number; url: string } }>();
		vi.spyOn(useNuxtApp().$api.image, 'upload').mockReturnValue(pending.promise);
		const onUpdatePath = vi.fn();
		const wrapper = await mountSuspended(BrandEditor, {
			props: {
				fields: brandFields,
				modelValue: configuration,
				inherited: {},
				'onUpdate:path': onUpdatePath,
			},
		});
		wrapper.getComponent({ name: 'UFileUpload' }).vm.$emit(
			'update:modelValue',
			new File(['a'], 'a.png', { type: 'image/png' }),
		);
		const setupState = (wrapper.vm as unknown as {
			$: { setupState: { uploading: boolean; logoPreviewUrl?: string } };
		}).$.setupState;
		wrapper.unmount();
		pending.resolve({ image: { id: 41, url: 'https://cdn.example.com/stale-a.png' } });
		await flushPromises();

		expect(onUpdatePath).not.toHaveBeenCalled();
		expect(setupState.uploading).toBe(true);
		expect(setupState.logoPreviewUrl).toBeUndefined();
	});

	it('uses the managed logo upload and persists only the returned asset ID', async () => {
		const upload = vi.spyOn(useNuxtApp().$api.image, 'upload').mockResolvedValue({
			image: { id: 42, url: 'https://cdn.example.com/merchant-logo.png' },
		});
		const wrapper = await mountSuspended(BrandEditor, {
			props: {
				fields: brandFields,
				modelValue: configuration,
				inherited: {},
			},
		});
		const file = new File(['logo'], 'logo.png', { type: 'image/png' });

		wrapper.getComponent({ name: 'UFileUpload' }).vm.$emit('update:modelValue', file);
		await flushPromises();

		expect(upload).toHaveBeenCalledWith(file, 'merchant', 'merchant-logo');
		expect(wrapper.emitted('update:path')?.[0]).toEqual(['brand.logoAssetId', 42]);
		expect(wrapper.get('[data-logo-preview]').attributes('src')).toBe('https://cdn.example.com/merchant-logo.png');
		expect(JSON.stringify(wrapper.emitted('update:path'))).not.toContain('cdn.example.com');
	});

	it('localizes unsupported logo formats in Malay', async () => {
		await useNuxtApp().$i18n.setLocale('ms');
		vi.spyOn(useNuxtApp().$api.image, 'upload').mockRejectedValue(new Error(IMAGE_FORMAT_ERROR_MESSAGE));
		const wrapper = await mountSuspended(BrandEditor, {
			props: { fields: brandFields, modelValue: configuration, inherited: {} },
		});
		wrapper.getComponent({ name: 'UFileUpload' }).vm.$emit(
			'update:modelValue',
			new File(['not-an-image'], 'notes.txt', { type: 'text/plain' }),
		);
		await flushPromises();

		const error = wrapper.get('[data-field="brand.logoAssetId"] [role="alert"]').text();
		expect(error).toBe('Pilih imej JPG, JPEG, PNG, HEIC, HEIF atau WebP.');
		expect(error).not.toContain('Unsupported image format');
	});

	it('hides raw logo upload failures behind the localized Malay fallback', async () => {
		await useNuxtApp().$i18n.setLocale('ms');
		vi.spyOn(useNuxtApp().$api.image, 'upload')
			.mockRejectedValue(new Error('Request failed with status 500: internal storage detail'));
		const wrapper = await mountSuspended(BrandEditor, {
			props: { fields: brandFields, modelValue: configuration, inherited: {} },
		});
		wrapper.getComponent({ name: 'UFileUpload' }).vm.$emit(
			'update:modelValue',
			new File(['logo'], 'logo.png', { type: 'image/png' }),
		);
		await flushPromises();

		const error = wrapper.get('[data-field="brand.logoAssetId"] [role="alert"]').text();
		expect(error).toBe('Logo templat tidak dapat dimuat naik.');
		expect(error).not.toContain('internal storage detail');
	});
});

describe('Template Studio section editor', () => {
	it('locks required sections and emits every block in catalog order with empty props', async () => {
		const wrapper = await mountSuspended(SectionEditor, {
			props: { blocks: invoiceBlocks, modelValue: configuration.blocks },
		});

		const required = wrapper.get('[data-block="orderItems"]').getComponent({ name: 'UCheckbox' });
		expect(required.props('disabled')).toBe(true);
		expect(wrapper.find('[data-drag-handle]').exists()).toBe(false);

		wrapper.get('[data-block="taxSummary"]').getComponent({ name: 'UCheckbox' }).vm.$emit('update:modelValue', true);

		expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([[
			{ id: 'merchantContact', enabled: true, props: {} },
			{ id: 'orderItems', enabled: true, props: {} },
			{ id: 'taxSummary', enabled: true, props: {} },
		]]);
	});

	it('renders Task 16 controls in Bahasa Melayu', async () => {
		await useNuxtApp().$i18n.setLocale('ms');
		const wrapper = await mountSuspended(SectionEditor, {
			props: { blocks: invoiceBlocks, modelValue: configuration.blocks },
		});

		expect(wrapper.text()).toContain('Diperlukan');
		expect(wrapper.text()).toContain('Item pesanan');
		expect(wrapper.text()).not.toContain('Required');
	});
});
