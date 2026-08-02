<template>
	<div
		class="border border-default rounded-md px-2.5 py-1.5 min-h-9 w-full bg-default text-sm focus-within:ring-2 focus-within:ring-primary"
		:class="{ 'text-muted': showPlaceholder }"
	>
		<div
			:key="domSyncKey"
			ref="editableRef"
			data-testid="token-plain-text-input"
			role="textbox"
			aria-multiline="false"
			contenteditable="true"
			class="w-full outline-none whitespace-nowrap overflow-x-auto empty:before:content-[attr(data-placeholder)] empty:before:text-muted"
			:aria-label="ariaLabel"
			:data-placeholder="placeholder || ''"
			@keydown="onKeyDown"
			@beforeinput="onBeforeInput"
			@input="onInput"
			@click="syncSelectionFromDom"
			@keyup="syncSelectionFromDom"
			@mouseup="syncSelectionFromDom"
			@selectstart="syncSelectionFromDom"
		>
			<template v-for="(segment, index) in segments" :key="segmentKey(segment, index)">
				<!--
					v-text / {{ }} rewrite textContent on every keystroke and reset the caret to 0.
					vTextStable only writes when the DOM text actually differs.
				-->
				<span v-if="segment.type === 'text'" v-text-stable="segment.value"></span>
				<ZTemplateStudioTokenChip v-else :token="segment.value" />
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Directive } from 'vue';
import {
	normalizeTemplateToken,
	removeTemplateTokenAt,
	splitTemplateTokenSegments,
	templateTokenBoundsForDelete,
	type TemplateTokenSegment,
} from '~/utils/document-template';

const props = withDefaults(
	defineProps<{
		modelValue: string;
		allowedTokens: readonly string[];
		maxLength?: number;
		placeholder?: string;
		ariaLabel?: string;
	}>(),
	{
		maxLength: undefined,
		placeholder: undefined,
		ariaLabel: undefined,
	},
);

const emit = defineEmits<{
	'update:modelValue': [value: string];
	'selection-change': [selection: { start: number; end: number }];
}>();

const editableRef = ref<HTMLElement | null>(null);
const selectionStart = ref(0);
const selectionEnd = ref(0);
const domSyncKey = ref(0);
const renderedValue = ref(props.modelValue);
let applyingExternalValue = false;
let pendingCaret: { start: number; end: number } | null = null;
let lastEmittedValue: string | null = null;

const segments = computed(() => splitTemplateTokenSegments(renderedValue.value, props.allowedTokens));
const showPlaceholder = computed(() => !renderedValue.value && !!props.placeholder);

/** Avoid caret reset: browsers move selection to 0 when textContent is assigned, even to the same string. */
const vTextStable: Directive<HTMLElement, string> = {
	mounted(el, binding) {
		el.textContent = binding.value ?? '';
	},
	updated(el, binding) {
		const next = binding.value ?? '';
		if (el.textContent === next) return;
		el.textContent = next;
	},
};

function segmentKey(segment: TemplateTokenSegment, index: number): string {
	// Stable keys — length/start in the key remounts nodes on every keystroke and drops the caret.
	if (segment.type === 'token') return `token:${index}:${segment.value}`;
	return `text:${index}`;
}

function tokenStructureKey(value: string): string {
	return splitTemplateTokenSegments(value, props.allowedTokens)
		.map((segment) => (segment.type === 'token' ? `T:${segment.value}` : 't'))
		.join('|');
}

function clampSelection(start: number, end: number, length: number): { start: number; end: number } {
	const nextStart = Math.max(0, Math.min(start, length));
	const nextEnd = Math.max(nextStart, Math.min(end, length));
	return { start: nextStart, end: nextEnd };
}

function emitSelection(start: number, end: number): void {
	const clamped = clampSelection(start, end, renderedValue.value.length);
	selectionStart.value = clamped.start;
	selectionEnd.value = clamped.end;
	emit('selection-change', { start: clamped.start, end: clamped.end });
}

function setSelection(start: number, end: number = start): void {
	// Keep the requested caret even when modelValue is still stale (TokenPicker
	// emits update:modelValue then inserted in the same turn). Clamping here
	// would emit selection-change and clobber parent setCursor offsets.
	const nextStart = Math.max(0, start);
	const nextEnd = Math.max(nextStart, end);
	pendingCaret = { start: nextStart, end: nextEnd };
	selectionStart.value = nextStart;
	selectionEnd.value = nextEnd;
	emit('selection-change', { start: nextStart, end: nextEnd });
	void nextTick(() => restoreCaret());
}

function removeAt(start: number, end: number): void {
	const result = removeTemplateTokenAt(renderedValue.value, start, end);
	commitValue(result.value, result.cursor, result.cursor);
}

function commitValue(value: string, start: number, end: number): void {
	value = flattenSingleLine(value);
	if (props.maxLength !== undefined && value.length > props.maxLength) {
		// Contenteditable already mutated — remount from rendered value so excess text is not left in the DOM.
		applyingExternalValue = true;
		domSyncKey.value += 1;
		pendingCaret = { start: selectionStart.value, end: selectionEnd.value };
		void nextTick(() => {
			restoreCaret();
			applyingExternalValue = false;
		});
		return;
	}
	// Clamp against the value being committed, not the stale modelValue length.
	const clamped = clampSelection(start, end, value.length);
	selectionStart.value = clamped.start;
	selectionEnd.value = clamped.end;
	emit('selection-change', { start: clamped.start, end: clamped.end });
	pendingCaret = { start: clamped.start, end: clamped.end };

	const structureChanged = tokenStructureKey(renderedValue.value) !== tokenStructureKey(value);
	renderedValue.value = value;

	if (value !== props.modelValue) {
		lastEmittedValue = value;
		emit('update:modelValue', value);
	}

	if (structureChanged) {
		// Token chips changed — remount segment DOM then restore caret.
		domSyncKey.value += 1;
		void nextTick(() => restoreCaret());
		return;
	}

	// Plain-text typing: vTextStable skips identical textContent writes, so the caret stays put.
	// Still restore after programmatic text changes where the directive did write.
	void nextTick(() => {
		if (pendingCaret) restoreCaret();
	});
}

function serializeEditable(): string {
	const root = editableRef.value;
	if (!root) return renderedValue.value;

	let result = '';
	const walk = (node: Node) => {
		if (node.nodeType === Node.TEXT_NODE) {
			result += node.textContent ?? '';
			return;
		}
		if (node.nodeType !== Node.ELEMENT_NODE) return;
		const el = node as HTMLElement;
		const chipName = el.getAttribute('data-token-chip');
		if (chipName) {
			result += normalizeTemplateToken(chipName);
			return;
		}
		for (const child of Array.from(node.childNodes)) walk(child);
	};

	for (const child of Array.from(root.childNodes)) walk(child);
	return result;
}

function measureNodeLength(node: Node): number {
	if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length ?? 0;
	if (node.nodeType !== Node.ELEMENT_NODE) return 0;
	const el = node as HTMLElement;
	const chipName = el.getAttribute('data-token-chip');
	if (chipName) return normalizeTemplateToken(chipName).length;
	let total = 0;
	for (const child of Array.from(node.childNodes)) total += measureNodeLength(child);
	return total;
}

function offsetFromDom(targetNode: Node, targetOffset: number): number {
	const root = editableRef.value;
	if (!root) return 0;

	let offset = 0;
	const visit = (node: Node): boolean => {
		if (node === targetNode) {
			if (node.nodeType === Node.TEXT_NODE) {
				offset += Math.max(0, Math.min(targetOffset, node.textContent?.length ?? 0));
				return true;
			}
			if (node.nodeType === Node.ELEMENT_NODE) {
				const el = node as HTMLElement;
				if (el.getAttribute('data-token-chip')) {
					offset += targetOffset > 0 ? measureNodeLength(node) : 0;
					return true;
				}
				const children = Array.from(node.childNodes);
				const limit = Math.max(0, Math.min(targetOffset, children.length));
				for (let i = 0; i < limit; i++) offset += measureNodeLength(children[i]!);
				return true;
			}
		}

		if (node.nodeType === Node.ELEMENT_NODE) {
			const el = node as HTMLElement;
			if (el.getAttribute('data-token-chip')) {
				if (el.contains(targetNode)) {
					offset += measureNodeLength(node);
					return true;
				}
				offset += measureNodeLength(node);
				return false;
			}
		}

		if (node.nodeType === Node.TEXT_NODE) {
			offset += node.textContent?.length ?? 0;
			return false;
		}

		for (const child of Array.from(node.childNodes)) {
			if (visit(child)) return true;
		}
		return false;
	};

	for (const child of Array.from(root.childNodes)) {
		if (visit(child)) break;
	}
	return offset;
}

function domPointFromOffset(offset: number): { node: Node; offset: number } | null {
	const root = editableRef.value;
	if (!root) return null;

	let remaining = Math.max(0, offset);
	const children = Array.from(root.childNodes);
	if (!children.length) return { node: root, offset: 0 };

	for (const child of children) {
		const length = measureNodeLength(child);
		if (remaining > length) {
			remaining -= length;
			continue;
		}

		if (child.nodeType === Node.TEXT_NODE) {
			return { node: child, offset: remaining };
		}

		if (child.nodeType === Node.ELEMENT_NODE) {
			const el = child as HTMLElement;
			if (el.getAttribute('data-token-chip')) {
				const parent = el.parentNode ?? root;
				const index = Array.from(parent.childNodes).indexOf(el);
				return { node: parent, offset: remaining === 0 ? index : index + 1 };
			}

			const nested = Array.from(child.childNodes);
			if (!nested.length) return { node: child, offset: 0 };
			for (const nestedChild of nested) {
				const nestedLength = measureNodeLength(nestedChild);
				if (remaining > nestedLength) {
					remaining -= nestedLength;
					continue;
				}
				if (nestedChild.nodeType === Node.TEXT_NODE) {
					return { node: nestedChild, offset: remaining };
				}
				if (nestedChild.nodeType === Node.ELEMENT_NODE) {
					const nestedEl = nestedChild as HTMLElement;
					if (nestedEl.getAttribute('data-token-chip')) {
						const index = Array.from(child.childNodes).indexOf(nestedChild);
						return { node: child, offset: remaining === 0 ? index : index + 1 };
					}
				}
			}
			return { node: child, offset: nested.length };
		}
	}

	const last = children.at(-1)!;
	if (last.nodeType === Node.TEXT_NODE) {
		return { node: last, offset: last.textContent?.length ?? 0 };
	}
	return { node: root, offset: children.length };
}

function restoreCaret(): void {
	const root = editableRef.value;
	const caret = pendingCaret ?? { start: selectionStart.value, end: selectionEnd.value };
	if (!root) return;

	const selection = window.getSelection();
	if (!selection) return;

	const startPoint = domPointFromOffset(caret.start);
	const endPoint = domPointFromOffset(caret.end);
	if (!startPoint || !endPoint) return;

	const range = document.createRange();
	try {
		range.setStart(startPoint.node, startPoint.offset);
		range.setEnd(endPoint.node, endPoint.offset);
		selection.removeAllRanges();
		selection.addRange(range);
	} catch {
		// Ignore invalid ranges while Vue is mid-render.
	}
}

function syncSelectionFromDom(): void {
	if (applyingExternalValue) return;
	const selection = window.getSelection();
	const root = editableRef.value;
	if (!selection || !root || selection.rangeCount === 0) return;
	const range = selection.getRangeAt(0);
	if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;

	const start = offsetFromDom(range.startContainer, range.startOffset);
	const end = offsetFromDom(range.endContainer, range.endOffset);
	emitSelection(Math.min(start, end), Math.max(start, end));
}

function measureDomSelection(): { start: number; end: number } | null {
	const selection = window.getSelection();
	const root = editableRef.value;
	if (!selection || !root || selection.rangeCount === 0) return null;
	const range = selection.getRangeAt(0);
	if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

	const start = offsetFromDom(range.startContainer, range.startOffset);
	const end = offsetFromDom(range.endContainer, range.endOffset);
	return { start: Math.min(start, end), end: Math.max(start, end) };
}

function flattenSingleLine(value: string): string {
	return value.replace(/\r\n|\r|\n/g, ' ');
}

function onKeyDown(event: KeyboardEvent): void {
	if (event.key !== 'Enter') return;
	event.preventDefault();
}

function onBeforeInput(event: Event): void {
	const inputEvent = event as InputEvent;
	if (inputEvent.isComposing) return;

	// Subject is single-line — block soft/hard breaks from Enter or IME.
	if (inputEvent.inputType === 'insertParagraph' || inputEvent.inputType === 'insertLineBreak') {
		event.preventDefault();
		return;
	}

	const collapsed = selectionStart.value === selectionEnd.value;
	if (!collapsed) return;

	const key = inputEvent.inputType === 'deleteContentBackward' ? 'Backspace' : inputEvent.inputType === 'deleteContentForward' ? 'Delete' : null;
	if (!key) return;

	const bounds = templateTokenBoundsForDelete(renderedValue.value, selectionStart.value, key, props.allowedTokens);
	if (!bounds) return;

	event.preventDefault();
	removeAt(bounds.start, bounds.end);
}

function onInput(): void {
	if (applyingExternalValue) {
		void nextTick(() => {
			if (applyingExternalValue) return;
			onInput();
		});
		return;
	}
	const nextValue = flattenSingleLine(serializeEditable());
	// Read caret from the live DOM without clamping to the stale modelValue length.
	const measured = measureDomSelection();
	const start = measured ? Math.min(measured.start, nextValue.length) : nextValue.length;
	const end = measured ? Math.min(measured.end, nextValue.length) : nextValue.length;
	commitValue(nextValue, start, end);
}

watch(
	() => props.modelValue,
	async (next) => {
		// Self-echo from our emit — do not remount; vTextStable keeps the caret when text matches.
		if (lastEmittedValue !== null && next === lastEmittedValue) {
			lastEmittedValue = null;
			const live = serializeEditable();
			if (live !== next) {
				const measured = measureDomSelection();
				const start = measured ? Math.min(measured.start, live.length) : live.length;
				const end = measured ? Math.min(measured.end, live.length) : live.length;
				commitValue(live, start, end);
			} else if (renderedValue.value !== next) {
				renderedValue.value = next;
			}
			return;
		}

		lastEmittedValue = null;
		if (renderedValue.value === next && serializeEditable() === next) {
			return;
		}

		renderedValue.value = next;
		applyingExternalValue = true;
		domSyncKey.value += 1;
		await nextTick();
		if (pendingCaret) {
			const clamped = clampSelection(pendingCaret.start, pendingCaret.end, renderedValue.value.length);
			pendingCaret = clamped;
			selectionStart.value = clamped.start;
			selectionEnd.value = clamped.end;
			emit('selection-change', { start: clamped.start, end: clamped.end });
		} else {
			pendingCaret = {
				start: renderedValue.value.length,
				end: renderedValue.value.length,
			};
		}
		restoreCaret();
		applyingExternalValue = false;
		pendingCaret = null;
	},
);

onMounted(() => {
	selectionStart.value = renderedValue.value.length;
	selectionEnd.value = renderedValue.value.length;
});

defineExpose({
	setSelection,
	selectionStart,
	selectionEnd,
});
</script>
