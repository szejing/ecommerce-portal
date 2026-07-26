<template>
	<div class="dropzone-wrapper relative">
		<div v-if="isProcessing" class="processing-overlay" aria-hidden="true">
			<UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-main-500 animate-spin" />
		</div>
		<UFileUpload
			v-model="files"
			:multiple="multiple"
			:accept="DROPZONE_ACCEPT"
			:disabled="disabled || (multiple && totalImageCount >= maxImages)"
			:icon="ICONS.UPLOAD"
			:label="multiple ? 'Drop files here or click to upload' : 'Drop a file here or click to upload'"
			description="Square images are recommended"
			class="dropzone-upload"
			:ui="{
				base: 'border-2 border-dashed border-neutral-300 rounded-xl p-4 min-h-[120px] transition-all duration-200 hover:bg-main-50 hover:border-main-500 data-[dragging=true]:bg-main-100 data-[dragging=true]:border-main-500',
				wrapper: 'flex flex-col items-center justify-center text-center gap-2',
				icon: 'w-6 h-6 text-neutral-600',
				label: 'text-neutral-600 font-normal',
				description: 'text-xs text-neutral-400',
			}"
			@update:model-value="handleFilesUpdate"
		>
			<template #default="{ open, files }">
				<div v-if="previews.length > 0 || (currentImages != null && currentImages.length > 0)" class="custom-dropzone has-content" @click="open()">
					<!-- Previews section for new files -->
					<div v-if="previews.length > 0" class="preview-section">
						<div class="preview-grid">
							<div v-for="(preview, index) in previews" :key="`preview-${index}`" class="preview-item">
								<div class="preview-item-container group">
									<ZImage :src="preview" alt="Preview image" fill />
									<button class="delete-button" type="button" @click.stop="removePreview(index)">
										<UIcon name="i-heroicons-trash" class="w-4 h-4 text-white" />
									</button>
								</div>
							</div>
						</div>
					</div>

					<!-- Previews section for existing images -->
					<div v-else-if="currentImages != null && currentImages.length > 0" class="preview-section">
						<div class="preview-grid">
							<div v-for="(preview, index) in currentImages" :key="`existing-${index}`" class="preview-item">
								<div class="preview-item-container group">
									<ZImage v-if="preview != null" :src="preview.url || preview" alt="Preview image" fill />
									<button class="delete-button" type="button" @click.stop="removeExistingImage(index)">
										<UIcon name="i-heroicons-trash" class="w-4 h-4 text-white" />
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</template>
		</UFileUpload>
		<div v-if="rejectedMessage" class="upload-limit-warning" role="alert">
			<UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 shrink-0" />
			<span>{{ rejectedMessage }}</span>
		</div>
	</div>
</template>

<script setup>
import { ICONS } from '~/utils/icons';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB - files over this are rejected
const HEIC_EXTENSIONS_PATTERN = /\.(heic|heif)$/i;
const HEIC_MIME_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
const DROPZONE_ACCEPT = ['image/*', '.heic', '.heif', ...HEIC_MIME_TYPES].join(',');

const props = defineProps({
	multiple: {
		type: Boolean,
		default: false,
	},
	disabled: {
		type: Boolean,
		default: false,
	},
	existingImages: {
		type: Array,
		default: () => [],
	},
	maxImages: {
		type: Number,
		default: 10, // Default maximum of 10 images
	},
});

const emit = defineEmits(['files-selected', 'delete-image']);

const previews = ref([]);
const files = ref(props.multiple ? [] : null);
const currentImages = ref([]);
const isProcessing = ref(false);
const isUpdatingProgrammatically = ref(false);
const rejectedMessage = ref('');

/** Returns true if file is an image (including HEIC/HEIF). */
function isImageFile(file) {
	return file.type.startsWith('image/') || HEIC_EXTENSIONS_PATTERN.test(file.name);
}

/** Returns true if file is HEIC/HEIF format (browsers cannot display these natively). */
function isHeicFile(file) {
	return HEIC_MIME_TYPES.includes(file.type) || HEIC_EXTENSIONS_PATTERN.test(file.name);
}

const HEIC_PLACEHOLDER_DATA_URL =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect fill='%23e5e7eb' width='120' height='120'/%3E%3Ctext x='50%25' y='50%25' fill='%236b7280' font-size='12' text-anchor='middle' dy='.3em'%3EHEIC%3C/text%3E%3C/svg%3E";

/** Converts HEIC to JPEG blob for preview; returns object URL. Browsers cannot display HEIC in img tags. */
async function createPreviewUrl(file) {
	if (isHeicFile(file)) {
		if (import.meta.client) {
			try {
				const heic2any = (await import('heic2any')).default;
				const result = await heic2any({ blob: file, toType: 'image/jpeg' });
				const blob = Array.isArray(result) ? result[0] : result;
				return blob ? URL.createObjectURL(blob) : HEIC_PLACEHOLDER_DATA_URL;
			} catch {
				return HEIC_PLACEHOLDER_DATA_URL;
			}
		}
		return HEIC_PLACEHOLDER_DATA_URL;
	}
	return URL.createObjectURL(file);
}

onMounted(async () => {
	// Check if existingImages contains File objects or URL strings
	if (props.existingImages && props.existingImages.length > 0) {
		const fileObjects = [];
		const urlStrings = [];

		props.existingImages.forEach((image) => {
			if (image instanceof File) {
				// If it's a File object, add to files and create preview
				fileObjects.push(image);
			} else if (typeof image === 'string' || (image && image.url)) {
				// If it's a URL string or object with url property, add to currentImages
				urlStrings.push(image);
			}
		});

		// Set File objects to files and previews
		if (fileObjects.length > 0) {
			files.value = props.multiple ? fileObjects : fileObjects[0];
			await previewFiles(fileObjects);
		}

		// Set URL strings/objects to currentImages
		if (urlStrings.length > 0) {
			currentImages.value = urlStrings;
		}
	}
});

// Watch for external changes to existingImages
watch(
	() => props.existingImages,
	(newImages) => {
		// Don't update if we're programmatically updating
		if (isUpdatingProgrammatically.value) {
			return;
		}

		if (newImages && newImages.length > 0) {
			const urlStrings = newImages.filter((image) => typeof image === 'string' || (image && image.url));
			currentImages.value = urlStrings;
		} else {
			currentImages.value = [];
		}
	},
	{ deep: true },
);

// Computed property to track total image count
const totalImageCount = computed(() => {
	return previews.value.length + (currentImages.value?.length || 0);
});

const handleFilesUpdate = async (selectedFiles) => {
	// Ignore updates if we're programmatically updating files
	if (isUpdatingProgrammatically.value) {
		return;
	}

	rejectedMessage.value = '';

	if (!selectedFiles) {
		files.value = props.multiple ? [] : null;
		previews.value = [];
		emit('files-selected', []);
		return;
	}

	// Convert to array for consistent handling
	const filesArray = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];

	// Filter image files (including HEIC/HEIF) and reject those over 5 MB
	const oversized = filesArray.filter((f) => isImageFile(f) && f.size > MAX_FILE_SIZE_BYTES);
	const validFiles = filesArray.filter((f) => isImageFile(f) && f.size <= MAX_FILE_SIZE_BYTES);

	if (oversized.length > 0) {
		const names = oversized.map((f) => f.name).join(', ');
		rejectedMessage.value = `File(s) over 5 MB not allowed: ${names}`;
	}

	if (validFiles.length === 0) {
		files.value = props.multiple ? [] : null;
		previews.value = [];
		emit('files-selected', []);
		return;
	}

	if (!props.multiple) {
		files.value = validFiles[0];
		await previewFiles([validFiles[0]]);
		emit('files-selected', [validFiles[0]]);
	} else {
		const availableSlots = props.maxImages - (currentImages.value?.length || 0);
		const filesToAdd = validFiles.slice(0, availableSlots);

		files.value = filesToAdd;
		await previewFiles(filesToAdd);
		emit('files-selected', filesToAdd);
	}
};

const removePreview = (index) => {
	// Ensure index is valid
	if (index < 0 || index >= previews.value.length) {
		return;
	}

	// Set flag to prevent handleFilesUpdate from being triggered
	isUpdatingProgrammatically.value = true;

	try {
		// Revoke the object URL to prevent memory leaks (blob URLs only)
		const urlToRevoke = previews.value[index];
		if (urlToRevoke && typeof urlToRevoke === 'string' && urlToRevoke.startsWith('blob:')) {
			URL.revokeObjectURL(urlToRevoke);
		}

		// Remove the preview first
		previews.value.splice(index, 1);

		if (props.multiple) {
			// Ensure files array exists and is an array
			const currentFiles = Array.isArray(files.value) ? [...files.value] : [];

			// Remove the corresponding file at the same index
			if (index < currentFiles.length) {
				currentFiles.splice(index, 1);
				files.value = currentFiles;
				emit('files-selected', currentFiles);
			} else {
				// If arrays are out of sync, just update files to match previews length
				files.value = currentFiles.slice(0, previews.value.length);
				emit('files-selected', files.value);
			}
		} else {
			// Single file mode - clear everything
			files.value = null;
			previews.value = [];
			emit('files-selected', []);
		}
	} finally {
		// Always clear flag after update, even if there's an error
		nextTick(() => {
			isUpdatingProgrammatically.value = false;
		});
	}
};

const removeExistingImage = (index) => {
	// Ensure index is valid
	if (!currentImages.value || index < 0 || index >= currentImages.value.length) {
		return;
	}

	// Set flag to prevent handleFilesUpdate from being triggered
	isUpdatingProgrammatically.value = true;

	try {
		// Remove from currentImages at the specified index
		currentImages.value.splice(index, 1);

		// Also handle removing preview images by index if they exist (for consistency)
		if (previews.value && previews.value.length > index) {
			// Revoke the object URL to prevent memory leaks (blob URLs only)
			const urlToRevoke = previews.value[index];
			if (urlToRevoke && typeof urlToRevoke === 'string' && urlToRevoke.startsWith('blob:')) {
				URL.revokeObjectURL(urlToRevoke);
			}
			previews.value.splice(index, 1);

			// Update files array
			if (props.multiple) {
				const updatedFiles = [...(files.value || [])];
				if (index < updatedFiles.length) {
					updatedFiles.splice(index, 1);
					files.value = updatedFiles;
				}
			} else {
				files.value = null;
			}
		}

		// Emit the updated files to parent
		emit('delete-image', currentImages.value[index]);
	} finally {
		// Always clear flag after update, even if there's an error
		nextTick(() => {
			isUpdatingProgrammatically.value = false;
		});
	}
};

const previewFiles = async (filesList) => {
	// Don't regenerate previews if we're programmatically updating
	if (isUpdatingProgrammatically.value) {
		return;
	}

	isProcessing.value = true;
	try {
		// Revoke previous previews (blob URLs only; data URLs are not revokable)
		previews.value.forEach((url) => {
			if (typeof url === 'string' && url.startsWith('blob:')) {
				URL.revokeObjectURL(url);
			}
		});

		const imageFiles = filesList.filter(isImageFile);
		previews.value = await Promise.all(imageFiles.map((file) => createPreviewUrl(file)));
	} finally {
		isProcessing.value = false;
	}
};

// Cleanup on unmount
onBeforeUnmount(() => {
	previews.value.forEach((url) => {
		if (typeof url === 'string' && url.startsWith('blob:')) {
			URL.revokeObjectURL(url);
		}
	});
});
</script>

<style scoped>
.dropzone-wrapper {
	width: 100%;
}

.processing-overlay {
	position: absolute;
	inset: 0;
	z-index: 10;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: rgba(255, 255, 255, 0.7);
	border-radius: 0.75rem;
	pointer-events: none;
}

.dropzone-container {
	display: flex;
	flex-direction: column;
	width: 100%;
}

/* Custom dropzone for preview state */
.custom-dropzone {
	border: 2px dashed var(--color-neutral-300);
	border-radius: 0.75rem;
	padding: 0.5rem;
	transition: all 200ms;
	cursor: pointer;
}

.custom-dropzone.has-content {
	border-color: var(--color-neutral-300);
}

.custom-dropzone.has-content:hover {
	border-color: var(--color-primary-600);
	background-color: var(--color-main-50);
}

/* NuxtUI FileUpload styling */
.dropzone-upload {
	width: 100%;
}

/* Enhanced hover effects for text elements */
.dropzone-container :deep(.dropzone-upload:hover) p,
.dropzone-container :deep(.dropzone-upload:hover) span {
	color: var(--color-main) !important;
	font-weight: 700;
	transition: color 200ms;
}

/* Enhanced dragging state text effects */
.dropzone-container :deep(.dropzone-upload[data-dragging='true']) p,
.dropzone-container :deep(.dropzone-upload[data-dragging='true']) span {
	color: var(--color-main) !important;
	font-weight: 700;
}

.upload-limit-warning {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: rgb(217 119 6);
	background-color: rgb(254 252 232);
	padding: 0.75rem;
	border-radius: 0.5rem;
	border: 1px solid rgb(252 211 77);
	font-size: 0.875rem;
	line-height: 1.25rem;
	margin-top: 0.5rem;
}

.dropzone-message {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.5rem;
	padding: 1rem;
}

.preview-section {
	width: 100%;
}

.preview-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	font-size: 0.875rem;
	line-height: 1.25rem;
	color: var(--color-neutral-600);
	margin-bottom: 0.5rem;
	padding: 0 0.25rem;
}

.preview-count {
	font-weight: 500;
}

.preview-grid {
	display: flex;
	gap: 1rem;
	overflow-x: auto;
	overflow-y: hidden;
	scrollbar-width: thin;
	scrollbar-color: rgb(209 213 219) transparent;
	/* Ensure smooth scrolling on mobile */
	-webkit-overflow-scrolling: touch;
}

.preview-grid::-webkit-scrollbar {
	height: 0.5rem;
}

.preview-grid::-webkit-scrollbar-track {
	background-color: transparent;
}

.preview-grid::-webkit-scrollbar-thumb {
	background-color: var(--color-neutral-300);
	border-radius: 9999px;
}

.preview-item {
	position: relative;
	min-width: 120px;
	flex-shrink: 0;
}

/* Mobile responsive sizing */
@media (max-width: 640px) {
	.preview-item {
		min-width: 100px;
	}
}

.preview-item-container {
	position: relative;
	width: 120px;
	height: 120px;
	display: block;
	border: 1px solid var(--color-main-300);
	border-radius: 0.5rem;
	overflow: hidden;
	cursor: pointer;
}

/* Mobile responsive sizing */
@media (max-width: 640px) {
	.preview-item-container {
		width: 100px;
		height: 100px;
	}
}

/* Add overlay effect on hover */
.preview-item-container::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0);
	transition: background-color 200ms ease-in-out;
	/* Above the preview image's own stacking layers, below the delete button. */
	z-index: 15;
	border-radius: 0.5rem;
	pointer-events: none;
}

.preview-item-container:hover::before {
	background-color: rgba(0, 0, 0, 0.4);
}

.delete-button {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	background-color: rgb(239 68 68);
	color: white;
	border: none;
	border-radius: 9999px;
	padding: 0.5rem;
	cursor: pointer;
	opacity: 0;
	transition: all 200ms ease-in-out;
	z-index: 20;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	display: flex;
	align-items: center;
	justify-content: center;
}

.delete-button:hover {
	background-color: rgb(220 38 38);
	transform: translate(-50%, -50%) scale(1.1);
}

/* Show delete button on hover for desktop */
.preview-item-container:hover .delete-button {
	opacity: 1;
}

/* Always show delete button on mobile/touch devices */
@media (hover: none) and (pointer: coarse) {
	.delete-button {
		opacity: 0.95;
		top: 0.5rem;
		left: auto;
		right: 0.5rem;
		transform: none;
	}

	.delete-button:hover {
		transform: scale(1.1);
	}
}
</style>
