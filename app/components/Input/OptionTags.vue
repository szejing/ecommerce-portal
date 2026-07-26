<template>
	<div ref="elementInputTags" class="relative">
		<UInput
			ref="elementInput"
			v-model="search"
			class="w-full"
			:placeholder="selectedTags.length ? '' : placeholder"
			size="md"
			:style="{ paddingLeft: paddingLeft }"
			variant="outline"
			@click="openMenu()"
			@input="openMenu()"
			@keyup.,="addTag(slugify(search))"
			@keyup.backspace="removeLastTag()"
			@keyup.down="focusFirstTag()"
			@keyup.enter="addTag(slugify(search))"
			@keyup.esc="focusInput()"
			@keyup.prevent.tab="addTag(slugify(search))"
		/>
		<ul ref="elementSelectedTags" class="wrapper-selected-tag">
			<li v-for="(selectedTag, index) in selectedTags" :key="`selected-tag-${selectedTag}`">
				<span>{{ selectedTag }}</span>
				<span class="tag-icon">
					<UIcon :name="removeIcon" class="size-5" @click="removeTag(index)" />
				</span>
			</li>
		</ul>
		<div v-if="isMenuOpen" class="section-available-tag" tabindex="0">
			<ul v-if="availableTags?.length" ref="elementAvailableTags" class="wrapper-available-tag">
				<li
					v-for="tag in availableTags"
					:key="`available-tag-${tag}`"
					tabindex="0"
					@click="addTag(tag)"
					@keyup.esc="focusInput()"
					@keyup.enter="addTag(tag)"
					@keyup.down="focusNextTag()"
					@keyup.up="focusPreviousTag()"
				>
					<span>{{ tag }}</span>
					<span class="tag-icon">
						<UIcon v-show="availableTagSelected(tag)" class="size-5" :name="selectedIcon" />
					</span>
				</li>
			</ul>
			<div v-else-if="(!availableTags || availableTags.length === 0) && search" class="text-sm">
				To add <strong>{{ slugify(search) }}</strong> press <UKbd>Enter</UKbd> key
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { ProductOptionInput } from '~/utils/types/product-option';
import { ICONS } from '~/utils/icons';

interface InputTags {
	canAdd?: boolean;
	modelValue: ProductOptionInput[] | undefined;
	name?: string;
	options?: string[];
	placeholder?: string;
	removeIcon?: string;
	selectedIcon?: string;
	showCount?: boolean;
	searchable?: boolean;
}

const props = withDefaults(defineProps<InputTags>(), {
	canAdd: true,
	name: '',
	modelValue: () => [],
	options: () => [],
	placeholder: 'Select one or more tags...',
	removeIcon: ICONS.CLOSE_ROUNDED,
	selectedIcon: ICONS.CHECK_ROUNDED,
	showCount: false,
	searchable: true,
});

const selectedTags = computed({
	get() {
		return props.modelValue.map((option: ProductOptionInput) => option.value) ?? [];
	},
	set(value) {
		const merged = value.map((strValue) => {
			const matchingOption = props.modelValue.find((opt) => opt.value === strValue);
			return matchingOption ? { id: matchingOption.id, value: strValue } : { id: undefined, value: strValue };
		});

		emit('update:modelValue', merged);
	},
});

const emit = defineEmits(['update:modelValue', 'update:newOption']);

const slugify = (str: string | undefined) => {
	if (!str) return;

	return str
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/[\s_-]+/g, '-')
		.replace(/^-+|-+$/g, '');
};

const elementInput = ref();
const elementInputTags = ref();
const elementSelectedTags = ref();
const elementAvailableTags = ref();

const search = ref<string | undefined>('');

const isMenuOpen = ref(false);

const openMenu = () => {
	if (props.searchable) isMenuOpen.value = true;
};

const paddingLeft = ref();
const existingPadding = 12;

const availableTags = computed(() =>
	search.value ? props.options.filter((option: any) => option.toLowerCase().includes(slugify(search.value)?.toLowerCase())) : props.options,
);

const tagsChanged = () => {
	paddingLeft.value = elementSelectedTags.value.clientWidth ? `${elementSelectedTags.value.clientWidth + existingPadding + 2}px` : `${existingPadding}px`;
	elementSelectedTags.value.scrollTo(elementSelectedTags.value.scrollWidth, 0);
};

watch(
	() => props.modelValue,
	() => {
		nextTick(tagsChanged);
	},
	{ deep: true },
);

const focusedIndex = ref(0);

const focusTag = (index: number) => {
	if (!availableTags.value?.length) return;

	focusedIndex.value = index;

	if (focusedIndex.value < 0) {
		focusedIndex.value = availableTags.value.length - 1;
	}

	if (focusedIndex.value > availableTags.value.length - 1) {
		focusedIndex.value = 0;
	}

	elementAvailableTags.value.children[focusedIndex.value].focus();
};

const focusFirstTag = () => {
	focusTag(0);
};

const focusNextTag = () => {
	focusTag(focusedIndex.value + 1);
};

const focusPreviousTag = () => {
	focusTag(focusedIndex.value - 1);
};

const focusInput = () => {
	isMenuOpen.value = false;
	elementInput.value.input.focus();
};

const availableTagSelected = (tag: string) => {
	if (!selectedTags.value || !selectedTags.value.length) return false;
	return selectedTags.value.some((t) => t === tag);
};

const newTags = ref<string[]>([]);

const addTag = (tag: string | undefined) => {
	if (!tag) return;

	const _existingTag = selectedTags.value.findIndex((t) => t?.toLowerCase() === tag.toLowerCase());

	if (_existingTag >= 0) return;

	selectedTags.value = [...selectedTags.value, tag];

	const _existingOption = availableTags.value.findIndex((t: string) => t.toLowerCase() === tag.toLowerCase());

	if (_existingOption < 0) {
		emit('update:newOption', tag.toLowerCase());
		newTags.value = [...newTags.value, tag.toLowerCase()];
	}

	if (search.value?.length) {
		search.value = undefined;
	}
};

onBeforeUnmount(() => {
	newTags.value = [];
});

const removeTag = (index: number) => {
	selectedTags.value = selectedTags.value.filter((tag) => tag !== selectedTags.value[index]);
};

const removeLastTag = () => {
	if (!selectedTags.value.length) return;

	if (search.value == undefined || search.value.length == 0) removeTag(selectedTags.value.length - 1);
};

useDetectClickOutside(elementInputTags, () => {
	isMenuOpen.value = false;
	addTag(slugify(search.value));
});
</script>

<style scoped>
.tag-icon {
	width: 1.25rem;
	height: 1.25rem;
	margin-left: 0.25rem;
	border-radius: 0.125rem;
	transition: background-color 100ms;
}

.tag-icon:hover {
	background-color: rgba(0, 0, 0, 0.1);
}

.wrapper-selected-tag {
	display: flex;
	gap: 0.25rem;
	align-items: center;
	position: absolute;
	top: 0.5rem;
	left: 0.5rem;
	bottom: 0.5rem;
	right: auto;
	cursor: pointer;
}

.wrapper-selected-tag li {
	padding: 0.25rem 0.5rem;
	border: 1px solid var(--color-main-200);
	border-radius: 0.375rem;
	font-size: 0.75rem;
	line-height: 1;
	display: flex;
	gap: 0.25rem;
	align-items: center;
	cursor: pointer;
	background-color: var(--color-main-50);
}

.wrapper-selected-tag li:hover {
	border-color: var(--color-main-600);
}

.section-available-tag {
	padding: 0.5rem;
	border: 1px solid var(--color-neutral-200);
	border-radius: 0.375rem;
	background-color: white;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	position: absolute;
	transform: translateY(2.5rem);
	left: 0;
	right: 0;
	top: 0;
}

.wrapper-available-tag li {
	padding: 0.25rem 0.5rem;
	border-radius: 0.375rem;
	font-size: 0.875rem;
	cursor: default;
	user-select: none;
	position: relative;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.25rem;
}

.wrapper-available-tag li:hover {
	background-color: var(--color-neutral-900);
	cursor: pointer;
}
</style>
