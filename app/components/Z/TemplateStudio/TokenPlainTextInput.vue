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
			contenteditable="true"
			class="w-full outline-none whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-muted"
			:aria-label="ariaLabel"
			:data-placeholder="placeholder || ''"
			@beforeinput="onBeforeInput"
			@input="onInput"
			@click="syncSelectionFromDom"
			@keyup="syncSelectionFromDom"
			@mouseup="syncSelectionFromDom"
			@selectstart="syncSelectionFromDom"
		>
			<template v-for="(segment, index) in segments" :key="segmentKey(segment, index)">
				<span v-if="segment.type === 'text'">{{ segment.value }}</span>
				<ZTemplateStudioTokenChip
					v-else
					:token="segment.value"
					@remove="removeAt(segment.start, segment.end)"
				/>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
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
let applyingExternalValue = false;
let pendingCaret: { start: number; end: number } | null = null;

const segments = computed(() => splitTemplateTokenSegments(props.modelValue, props.allowedTokens));
const showPlaceholder = computed(() => !props.modelValue && !!props.placeholder);

function segmentKey(segment: TemplateTokenSegment, index: number): string {
	if (segment.type === 'token') return `token:${segment.start}:${segment.value}`;
	return `text:${index}:${segment.value.length}`;
}

function emitSelection(start: number, end: number): void {
	const length = props.modelValue.length;
	const nextStart = Math.max(0, Math.min(start, length));
	const nextEnd = Math.max(nextStart, Math.min(end, length));
	selectionStart.value = nextStart;
	selectionEnd.value = nextEnd;
	emit('selection-change', { start: nextStart, end: nextEnd });
}

function setSelection(start: number, end: number = start): void {
	emitSelection(start, end);
	pendingCaret = { start: selectionStart.value, end: selectionEnd.value };
	void nextTick(() => restoreCaret());
}

function removeAt(start: number, end: number): void {
	const result = removeTemplateTokenAt(props.modelValue, start, end);
	commitValue(result.value, result.cursor, result.cursor);
}

function commitValue(value: string, start: number, end: number): void {
	if (props.maxLength !== undefined && value.length > props.maxLength) {
		// Contenteditable already mutated — remount from modelValue so excess text is not left in the DOM.
		applyingExternalValue = true;
		domSyncKey.value += 1;
		pendingCaret = { start: selectionStart.value, end: selectionEnd.value };
		void nextTick(() => {
			restoreCaret();
			applyingExternalValue = false;
		});
		return;
	}
	emitSelection(start, end);
	pendingCaret = { start, end };
	if (value !== props.modelValue) {
		emit('update:modelValue', value);
	} else {
		void nextTick(() => restoreCaret());
	}
}

function serializeEditable(): string {
	const root = editableRef.value;
	if (!root) return props.modelValue;

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

function onBeforeInput(event: Event): void {
	const inputEvent = event as InputEvent;
	if (inputEvent.isComposing) return;

	const collapsed = selectionStart.value === selectionEnd.value;
	if (!collapsed) return;

	const key
		= inputEvent.inputType === 'deleteContentBackward'
			? 'Backspace'
			: inputEvent.inputType === 'deleteContentForward'
				? 'Delete'
				: null;
	if (!key) return;

	const bounds = templateTokenBoundsForDelete(
		props.modelValue,
		selectionStart.value,
		key,
		props.allowedTokens,
	);
	if (!bounds) return;

	event.preventDefault();
	removeAt(bounds.start, bounds.end);
}

function onInput(): void {
	if (applyingExternalValue) return;
	syncSelectionFromDom();
	const nextValue = serializeEditable();
	const caret = Math.min(selectionStart.value, nextValue.length);
	commitValue(nextValue, caret, caret);
}

watch(
	() => props.modelValue,
	async () => {
		applyingExternalValue = true;
		await nextTick();
		// Prefer pendingCaret set by setSelection (e.g. TokenPicker insert) over stale selectionStart/End.
		restoreCaret();
		applyingExternalValue = false;
		pendingCaret = null;
	},
);

onMounted(() => {
	selectionStart.value = props.modelValue.length;
	selectionEnd.value = props.modelValue.length;
});

defineExpose({
	setSelection,
	selectionStart,
	selectionEnd,
});
</script>
