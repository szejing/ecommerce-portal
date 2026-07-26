<template>
	<div class="space-y-4">
		<div v-for="(variation, vIdx) in localVariations" :key="vIdx" class="border border-neutral-200 rounded-lg p-4 bg-white">
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-3 flex-1">
					<span class="text-sm font-medium text-neutral-700 whitespace-nowrap">
						{{ t('components.variations.variationLabel', { index: vIdx + 1 }) }}
					</span>
					<UInput
						v-model="variation.name"
						:placeholder="t('components.variations.variationNamePlaceholder')"
						:maxlength="14"
						size="md"
						class="max-w-48"
						@update:model-value="emitUpdate"
					/>
				</div>

				<UButton :icon="ICONS.CROSS" color="neutral" variant="ghost" size="md" @click="removeVariation(vIdx)" />
			</div>

			<!-- Options as tags -->
			<div class="flex items-start gap-3">
				<span class="text-sm text-neutral-500 whitespace-nowrap pt-1.5">
					{{ t('components.variations.optionsLabel') }}
				</span>
				<UInputTags
					:model-value="getOptionValues(vIdx)"
					:placeholder="t('components.variations.optionValuePlaceholder')"
					:max-length="20"
					add-on-blur
					add-on-enter
					add-on-tab
					add-on-paste
					size="md"
					class="flex-1"
					@update:model-value="(tags: string[]) => setOptionValues(vIdx, tags)"
				/>
			</div>
		</div>

		<!-- Add Variation Button -->
		<UButton v-if="localVariations.length < MAX_VARIATIONS" :icon="ICONS.ADD" color="primary" variant="soft" size="sm" @click="addVariation">
			{{ t('components.variations.addVariation') }}
		</UButton>
	</div>
</template>

<script lang="ts" setup>
import type { ProductVariationInput } from '~/utils/types/product-variation';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const MAX_VARIATIONS = 2;

const props = defineProps({
	variations: {
		type: Array as PropType<ProductVariationInput[]>,
		default: () => [],
	},
});

const emit = defineEmits(['update:variations']);

const localVariations = ref<ProductVariationInput[]>(props.variations?.length ? JSON.parse(JSON.stringify(props.variations)) : []);

// Only sync from parent when external changes occur (e.g. loading saved data),
// not when our own emit triggers a prop update.
let emittedByUs = false;

watch(
	() => props.variations,
	(val) => {
		if (emittedByUs) {
			emittedByUs = false;
			return;
		}
		localVariations.value = val?.length ? JSON.parse(JSON.stringify(val)) : [];
	},
	{ deep: true },
);

const getOptionValues = (vIdx: number): string[] => {
	return localVariations.value[vIdx]?.options.map((o) => o.value).filter((v) => v.trim() !== '') ?? [];
};

const setOptionValues = (vIdx: number, tags: string[]) => {
	const variation = localVariations.value[vIdx];
	if (!variation) return;
	variation.options = tags.map((tag) => ({ value: tag }));
	emitUpdate();
};

const emitUpdate = () => {
	emittedByUs = true;
	// Emit all variations (including those with empty options) so the parent
	// and variant list can see the full structure. The variant list will
	// filter for valid ones on its own.
	const output = localVariations.value.map((v) => ({
		...v,
		options: v.options.filter((o) => o.value.trim() !== ''),
	}));
	emit('update:variations', JSON.parse(JSON.stringify(output)));
};

const addVariation = () => {
	if (localVariations.value.length >= MAX_VARIATIONS) return;
	localVariations.value.push({ name: '', options: [] });
};

const removeVariation = (vIdx: number) => {
	localVariations.value.splice(vIdx, 1);
	emitUpdate();
};
</script>
