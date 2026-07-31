<template>
	<div class="space-y-6">
		<section
			v-for="field in editableFields"
			:key="field.path"
			:data-field="field.path"
			class="space-y-3 rounded-xl border border-default p-4"
		>
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<h3 class="text-sm font-semibold text-default">{{ fieldLabel(field) }}</h3>
				<UBadge :data-source="fieldSource(field.path)" color="neutral" variant="soft">
					{{ sourceLabel(field.path) }}
				</UBadge>
			</div>

			<div v-if="field.kind === 'asset'" class="space-y-3">
				<img
					v-if="logoPreviewUrl"
					data-logo-preview
					:src="logoPreviewUrl"
					:alt="t('components.templateStudio.logoPreviewAlt')"
					class="h-20 max-w-48 rounded-lg border border-default bg-white object-contain p-2"
				>
				<UFileUpload
					data-upload="brand.logoAssetId"
					accept="image/*,.heic,.heif"
					:disabled="uploading"
					:label="t('components.templateStudio.uploadLogo')"
					:description="t('components.templateStudio.logoUploadDescription')"
					@update:model-value="uploadLogo"
				/>
			</div>

			<div v-else-if="field.kind === 'color'" class="flex flex-col gap-3 sm:flex-row sm:items-center">
				<input
					:data-color-picker="field.path"
					type="color"
					:value="validColorValue(field.path)"
					:aria-label="fieldLabel(field)"
					class="size-11 cursor-pointer rounded-lg border border-default bg-transparent p-1"
					@input="updateColorPicker(field.path, $event)"
				>
				<UInput
					:data-color-text="field.path"
					:model-value="fieldDisplayValue(field.path)"
					:aria-label="fieldLabel(field)"
					maxlength="7"
					class="font-mono sm:max-w-40"
					@update:model-value="updateColorText(field.path, String($event ?? ''))"
				/>
			</div>

			<UInput
				v-else
				:model-value="fieldDisplayValue(field.path)"
				:aria-label="fieldLabel(field)"
				:maxlength="field.max_length"
				@update:model-value="updateText(field.path, String($event ?? ''))"
			/>

			<p
				v-if="colorErrors[field.path]"
				:data-color-error="field.path"
				class="text-sm text-error"
				role="alert"
			>
				{{ colorErrors[field.path] }}
			</p>
			<p
				v-else-if="fieldErrors[field.path]"
				:data-field-error="field.path"
				class="text-sm text-error"
				role="alert"
			>
				{{ fieldErrors[field.path] }}
			</p>
			<p v-if="field.kind === 'asset' && uploadError" class="text-sm text-error" role="alert">{{ uploadError }}</p>

			<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
				<UButton
					v-if="hasOverride(field.path)"
					:data-clear="field.path"
					type="button"
					color="neutral"
					variant="outline"
					class="min-h-11"
					@click="clearOverride(field.path)"
				>
					{{ clearLabel(field.path) }}
				</UButton>
				<UButton
					v-if="field.kind === 'merchant-info' && field.allow_blank"
					:data-hide="field.path"
					type="button"
					color="neutral"
					variant="ghost"
					class="min-h-11"
					@click="hideField(field.path)"
				>
					{{ t('components.templateStudio.hideInTemplate') }}
				</UButton>
			</div>
		</section>
	</div>
</template>

<script setup lang="ts">
import { dir } from '~/utils/constants/dir';
import { IMAGE_FORMAT_ERROR_MESSAGE } from '~/repository/modules/image/image';
import type { DocumentTemplateConfiguration, DocumentTemplateField } from '~/utils/types/document-template';

type FieldValue = string | number | undefined;

const props = withDefaults(defineProps<{
	fields: DocumentTemplateField[];
	modelValue: DocumentTemplateConfiguration;
	inherited?: DocumentTemplateConfiguration;
	systemDefaults?: DocumentTemplateConfiguration;
	fieldErrors?: Record<string, string>;
	logoUrl?: string;
}>(), {
	inherited: () => ({}),
	systemDefaults: () => ({}),
	fieldErrors: () => ({}),
	logoUrl: undefined,
});

const emit = defineEmits<{
	'update:path': [path: string, value: string | number];
	'clear:path': [path: string];
}>();

const { t, te } = useI18n();
const { $api } = useNuxtApp();
const colorPattern = /^#[0-9A-Fa-f]{6}$/;
const allowedColorFields = new Set(['brand.primaryColor', 'brand.secondaryColor']);
const allowedMerchantFields = new Set([
	'merchantInfo.companyName',
	'merchantInfo.companyAddress',
	'merchantInfo.companyPhone',
	'merchantInfo.companyEmail',
	'merchantInfo.companyWebsite',
]);
const colorValues = reactive<Record<string, string>>({});
const colorErrors = reactive<Record<string, string>>({});
const logoPreviewUrl = ref(props.logoUrl);
const transientLogoAssetId = ref<number>();
const uploading = ref(false);
const uploadError = ref('');

const editableFields = computed(() => props.fields.filter((field) => {
	if (field.kind === 'asset') return field.path === 'brand.logoAssetId';
	if (field.kind === 'color') return allowedColorFields.has(field.path);
	return field.kind === 'merchant-info' && allowedMerchantFields.has(field.path);
}));

watch(
	() => [props.modelValue, props.inherited, props.systemDefaults],
	() => {
		for (const field of editableFields.value) {
			if (field.kind !== 'color') continue;
			colorValues[field.path] = String(resolvedValue(field.path) ?? '');
			delete colorErrors[field.path];
		}
	},
	{ deep: true, immediate: true },
);

watch(() => props.modelValue.brand?.logoAssetId, (value) => {
	if (value === transientLogoAssetId.value) return;
	transientLogoAssetId.value = undefined;
	logoPreviewUrl.value = props.logoUrl;
});

watch(() => props.logoUrl, (value) => {
	transientLogoAssetId.value = undefined;
	logoPreviewUrl.value = value;
});

function pathParts(path: string): ['brand' | 'merchantInfo', string] | null {
	const [section, key, ...rest] = path.split('.');
	if (rest.length || !key || (section !== 'brand' && section !== 'merchantInfo')) return null;
	return [section, key];
}

function readPath(configuration: DocumentTemplateConfiguration, path: string): FieldValue {
	const parts = pathParts(path);
	if (!parts) return undefined;
	const [section, key] = parts;
	return (configuration[section] as Record<string, FieldValue> | undefined)?.[key];
}

function ownsPath(configuration: DocumentTemplateConfiguration, path: string): boolean {
	const parts = pathParts(path);
	if (!parts) return false;
	const [section, key] = parts;
	const values = configuration[section] as Record<string, FieldValue> | undefined;
	return Boolean(values && Object.prototype.hasOwnProperty.call(values, key));
}

function hasOverride(path: string): boolean {
	return ownsPath(props.modelValue, path);
}

function fieldSource(path: string): 'override' | 'store-profile' | 'default' {
	if (hasOverride(path)) return 'override';
	if (ownsPath(props.inherited, path)) return 'store-profile';
	return 'default';
}

function resolvedValue(path: string): FieldValue {
	return readPath(props.modelValue, path) ?? readPath(props.inherited, path) ?? readPath(props.systemDefaults, path);
}

function fieldDisplayValue(path: string): string {
	if (allowedColorFields.has(path) && Object.prototype.hasOwnProperty.call(colorValues, path)) {
		return colorValues[path] ?? '';
	}
	return String(resolvedValue(path) ?? '');
}

function validColorValue(path: string): string {
	const value = fieldDisplayValue(path);
	return colorPattern.test(value) ? value : '#000000';
}

function fieldLabel(field: DocumentTemplateField): string {
	const key = `components.templateStudio.fieldLabels.${field.path.replace('.', '_')}`;
	return te(key) ? t(key) : field.label;
}

function sourceLabel(path: string): string {
	return t(`components.templateStudio.fieldSources.${fieldSource(path)}`);
}

function clearLabel(path: string): string {
	return ownsPath(props.inherited, path)
		? t('components.templateStudio.useStoreProfile')
		: t('components.templateStudio.useSystemDefault');
}

function updateText(path: string, value: string): void {
	emit('update:path', path, value);
}

function updateColorText(path: string, value: string): void {
	colorValues[path] = value;
	if (!colorPattern.test(value)) {
		colorErrors[path] = t('components.templateStudio.hexColorError');
		return;
	}
	delete colorErrors[path];
	emit('update:path', path, value);
}

function updateColorPicker(path: string, event: Event): void {
	const target = event.target;
	if (!(target instanceof HTMLInputElement)) return;
	updateColorText(path, target.value);
}

function clearOverride(path: string): void {
	if (allowedColorFields.has(path)) {
		delete colorErrors[path];
		colorValues[path] = String(readPath(props.inherited, path) ?? readPath(props.systemDefaults, path) ?? '');
	} else {
		delete colorValues[path];
		delete colorErrors[path];
	}
	if (path === 'brand.logoAssetId') {
		transientLogoAssetId.value = undefined;
		logoPreviewUrl.value = undefined;
		uploadError.value = '';
	}
	emit('clear:path', path);
}

function hideField(path: string): void {
	emit('update:path', path, '');
}

async function uploadLogo(value: File | File[] | null | undefined): Promise<void> {
	const file = Array.isArray(value) ? value[0] : value;
	if (!file) return;
	uploading.value = true;
	uploadError.value = '';
	try {
		const { image } = await $api.image.upload(file, dir.merchant, 'merchant-logo');
		if (!(typeof image?.id === 'number' && image.id > 0)) throw new Error(t('components.templateStudio.logoUploadError'));
		transientLogoAssetId.value = image.id;
		logoPreviewUrl.value = typeof image.url === 'string' ? image.url : undefined;
		emit('update:path', 'brand.logoAssetId', image.id);
	} catch (error) {
		uploadError.value = error instanceof Error && error.message === IMAGE_FORMAT_ERROR_MESSAGE
			? t('components.templateStudio.logoUnsupportedFormatError')
			: t('components.templateStudio.logoUploadError');
	} finally {
		uploading.value = false;
	}
}
</script>
