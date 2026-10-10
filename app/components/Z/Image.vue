<template>
	<div
		class="relative shrink-0 overflow-hidden rounded-sm bg-neutral-100"
		:class="{ 'h-full w-full': fill }"
		:style="fill ? undefined : { width: `${width}px`, height: `${height}px` }">
		<div
			class="absolute inset-0 scale-110 bg-cover bg-center opacity-60 blur-lg"
			:style="{ backgroundImage: `url(${displaySrc})` }" />
		<img
			:src="displaySrc"
			:alt="alt"
			class="relative z-10 block h-full w-full object-contain"
			@error="onImageError" />
	</div>
</template>

<script lang="ts" setup>
const IMAGE_FALLBACK = '/svg/product-holder.svg';

const props = withDefaults(
	defineProps<{
		src: string;
		alt?: string;
		width?: number;
		height?: number;
		/** Stretch to the parent's size instead of using width/height. */
		fill?: boolean;
	}>(),
	{
		alt: '',
		width: 32,
		height: 32,
		fill: false,
	},
);

const displaySrc = ref(props.src || IMAGE_FALLBACK);

watch(
	() => props.src,
	(url) => {
		displaySrc.value = url || IMAGE_FALLBACK;
	},
);

const onImageError = () => {
	if (displaySrc.value === IMAGE_FALLBACK) return;
	displaySrc.value = IMAGE_FALLBACK;
};
</script>
