<template>
	<div v-for="template in templates" :key="template.set_code" class="py-3">
		<div
			class="flex gap-2"
			:class="
				getInputType(template) === InputTypeEnum.BOOLEAN ? 'flex-row items-center justify-between' : 'flex-col sm:flex-row sm:items-center sm:justify-between'
			"
		>
			<h6 class="setting-templs-title min-w-0 flex-1">{{ template.set_desc }}</h6>

			<div :class="getInputType(template) === InputTypeEnum.BOOLEAN ? 'w-auto shrink-0' : 'w-full sm:min-w-[50%] sm:w-auto sm:text-end'">
				<UInput
					v-if="getInputType(template) === InputTypeEnum.TEXT"
					type="text"
					:model-value="getTextSettingValue(template)"
					:disabled="template.is_disabled"
					:placeholder="getTextSettingPlaceholder(template)"
					@update:model-value="(value) => updateSettingValue(template, value)"
				/>
				<UInput
					v-if="getInputType(template) === InputTypeEnum.NUMBER"
					type="number"
					:model-value="getTextSettingValue(template)"
					:disabled="template.is_disabled"
					:placeholder="template.default_val"
					@update:model-value="(value) => updateSettingValue(template, value)"
				/>
				<USwitch
					v-if="getInputType(template) === InputTypeEnum.BOOLEAN"
					:model-value="getBooleanSettingValue(template)"
					:disabled="template.is_disabled"
					@update:model-value="(value) => updateSettingValue(template, value)"
				/>
				<UTextarea
					v-if="getInputType(template) === InputTypeEnum.TEXTAREA"
					:model-value="getTextSettingValue(template)"
					:disabled="template.is_disabled"
					:placeholder="template.default_val"
					:rows="4"
					@update:model-value="(value) => updateSettingValue(template, value)"
				/>
				<UInput
					v-if="getInputType(template) === InputTypeEnum.MASKEDTEXTBOX"
					type="text"
					:model-value="getTextSettingValue(template)"
					:disabled="template.is_disabled"
					:placeholder="template.default_val"
					@update:model-value="(value) => updateSettingValue(template, value)"
				/>
				<div v-if="getInputType(template) === InputTypeEnum.GETFILENAME" class="space-y-1">
					<UInput type="file" :disabled="template.is_disabled" @change="handleFileChange(template, $event)" />
					<p v-if="getTextSettingValue(template)" class="text-xs text-gray-500">Current: {{ getTextSettingValue(template) }}</p>
				</div>
				<USelect
					v-if="getInputType(template) === InputTypeEnum.SELECT"
					:model-value="getTextSettingValue(template)"
					:items="getSelectItems(template)"
					value-key="value"
					label-key="label"
					:disabled="template.is_disabled"
					class="w-full"
					@update:model-value="(value) => updateSingleSelectSettingValue(template, value)"
				>
					<template #default>
						<UBadge v-if="getTextSettingValue(template)" color="primary" variant="subtle" class="truncate">
							{{ getSelectLabel(template, getTextSettingValue(template)) }}
						</UBadge>
					</template>
				</USelect>
				<USelect
					v-if="getInputType(template) === InputTypeEnum.SELECT_MULTI"
					multiple
					:model-value="getMultiSelectSettingValue(template)"
					:items="getSelectItems(template)"
					value-key="value"
					label-key="label"
					:disabled="template.is_disabled"
					class="w-full"
					:ui="{
						base: 'h-auto min-h-9',
						value: 'flex min-w-0 flex-wrap gap-1 whitespace-normal pointer-events-none',
					}"
					@update:model-value="(value) => updateMultiSelectSettingValue(template, value)"
				>
					<template #default>
						<UBadge v-for="value in getMultiSelectSettingValue(template)" :key="value" color="primary" variant="subtle" class="truncate">
							{{ getSelectLabel(template, value) }}
						</UBadge>
					</template>
				</USelect>
				<div v-if="getInputType(template) === InputTypeEnum.OAUTH" class="flex justify-end gap-2">
					<UButton
						v-if="!isOauthConnected(template)"
						data-testid="oauth-connect"
						color="primary"
						:to="template.is_disabled ? undefined : `/merchant/oauth/${oauthProviderSlug(template)}/start`"
						:external="!template.is_disabled"
						:disabled="template.is_disabled"
					>
						{{ t('components.settings.connectNow') }}
					</UButton>
					<template v-else>
						<UButton data-testid="oauth-connected" color="neutral" variant="soft" disabled>
							{{ t('components.settings.connected') }}
						</UButton>
						<UButton
							data-testid="oauth-disconnect"
							color="error"
							variant="outline"
							:disabled="template.is_disabled || updating"
							@click="requestOauthDisconnect(template)"
						>
							{{ t('components.settings.disconnect') }}
						</UButton>
					</template>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import type { SettingTempl } from '~/utils/types/setting-templ';
import { GROUP_CODE, InputType as InputTypeEnum, MERCHANT, SOCIALMEDIA } from 'yeppi-common';
import { Setting } from '~/utils/types/setting';
import { getOrderCompletionValidationItems } from '~/utils/options/order-completion-validation';
import { getAdminReceiveEmailUpdateItems } from '~/utils/options/admin-receive-email-update';
import { getCourierHandoverItems } from '~/utils/options/courier-handover';
import { getProductLineIdentityItems } from '~/utils/options/product-line-identity';
import { getVariantLineIdentityItems } from '~/utils/options/variant-line-identity';
import { buildWhatsAppMeUrl } from '~/utils/whatsapp-me-url';
import { ZModalConfirmation } from '#components';
import { successNotification } from '~/stores/AppUi/AppUi';

const props = defineProps({
	templates: {
		type: Array as PropType<SettingTempl[]>,
		required: true,
	},
});

const { templates } = toRefs(props);
const { t } = useI18n();
const overlay = useOverlay();

const settingsStore = useSettingStore();
const merchantInfoStore = useMerchantInfoStore();
const { settings, updatedSettings, updating } = storeToRefs(settingsStore);

const WHATSAPP_URL_PLACEHOLDER = 'https://wa.me/60xxxxxxxxx';
const prefilledWhatsAppSetCodes = ref(new Set<string>());

type SelectSettingItem = {
	value: string | number;
	label: string;
};

const getInputType = (template: SettingTempl) => Number(template.input_type);

const isWhatsAppUrlTemplate = (template: SettingTempl): boolean =>
	template.group_code === GROUP_CODE.SOCIALMEDIA && template.set_code === SOCIALMEDIA.WHATSAPP_URL;

const getRawSettingValue = (template: SettingTempl): string | undefined => {
	const pending = updatedSettings.value.find((setting: Setting) => setting.set_code === template.set_code);
	if (pending) {
		return pending.set_value;
	}

	return settings.value.find((setting: Setting) => setting.set_code === template.set_code)?.set_value ?? template.default_val;
};

const getTextSettingValue = (template: SettingTempl): string => getRawSettingValue(template) ?? template.default_val ?? '';

const getContactInfoValue = (setCode: string): string | null => merchantInfoStore.getMerchantInfo(GROUP_CODE.CONTACT, setCode)?.getString() ?? null;

const getWhatsAppMeUrlCandidate = (): string | null => buildWhatsAppMeUrl(getContactInfoValue(MERCHANT.DIAL_CODE), getContactInfoValue(MERCHANT.PHONE_NO));

const getTextSettingPlaceholder = (template: SettingTempl): string | undefined => {
	if (!isWhatsAppUrlTemplate(template)) {
		return template.default_val;
	}

	return getWhatsAppMeUrlCandidate() ?? WHATSAPP_URL_PLACEHOLDER;
};

const getBooleanSettingValue = (template: SettingTempl): boolean => {
	const value = getRawSettingValue(template);
	return value === 'true' || value === '1';
};

const getSelectItems = (template: SettingTempl) => {
	const orderCompletionItems = getOrderCompletionValidationItems(template.data_source);
	if (orderCompletionItems.length) {
		return orderCompletionItems.map((item): SelectSettingItem => ({ ...item }));
	}

	const courierHandoverItems = getCourierHandoverItems(template.data_source);
	if (courierHandoverItems.length) {
		return courierHandoverItems.map((item): SelectSettingItem => ({ ...item }));
	}

	const productLineIdentityItems = getProductLineIdentityItems(template.data_source);
	if (productLineIdentityItems.length) {
		return productLineIdentityItems.map((item): SelectSettingItem => ({ ...item }));
	}

	const variantLineIdentityItems = getVariantLineIdentityItems(template.data_source);
	if (variantLineIdentityItems.length) {
		return variantLineIdentityItems.map((item): SelectSettingItem => ({ ...item }));
	}

	return getAdminReceiveEmailUpdateItems(template.data_source).map((item): SelectSettingItem => ({ ...item }));
};

const getSelectLabel = (template: SettingTempl, value: unknown): string => {
	const stringValue = String(value ?? '');
	return getSelectItems(template).find((item) => String(item.value) === stringValue)?.label ?? stringValue;
};

const isOauthConnected = (template: SettingTempl): boolean => getTextSettingValue(template).trim().length > 0;

const oauthProviderSlug = (template: SettingTempl): string => (template.data_source ?? '').trim().toLowerCase() || 'easyparcel';

const requestOauthDisconnect = (template: SettingTempl) => {
	if (template.is_disabled || updating.value) {
		return;
	}

	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			title: t('components.settings.disconnectTitle'),
			message: t('components.settings.disconnectMessage'),
			titleVariant: 'danger',
			action: 'delete',
			onConfirm: async () => {
				try {
					const disconnected = await settingsStore.disconnectOauth(oauthProviderSlug(template));
					if (disconnected) {
						successNotification(t('components.settings.disconnected'));
					}
				} finally {
					confirmModal.close();
				}
			},
			onCancel: () => confirmModal.close(),
		},
	});
	confirmModal.open();
};

const getMultiSelectSettingValue = (template: SettingTempl): string[] => {
	const raw = getRawSettingValue(template) ?? template.default_val ?? '';
	return raw
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);
};

const serializeSettingValue = (template: SettingTempl, value: string | number | boolean | string[]): string => {
	if (getInputType(template) === InputTypeEnum.BOOLEAN) {
		return value === true || value === 'true' || value === '1' ? '1' : '0';
	}

	if (Array.isArray(value)) {
		return value.join(',');
	}

	return String(value);
};

const updateSettingValue = (template: SettingTempl, value: string | number | boolean | string[]) => {
	const settingData = {
		group_code: template.group_code,
		set_code: template.set_code,
		set_value: serializeSettingValue(template, value),
		value_type: template.input_type,
	};
	const updatedSetting = new Setting(settingData as unknown as Setting);
	settingsStore.addToUpdatedSettings(updatedSetting);
};

const updateSingleSelectSettingValue = (template: SettingTempl, value: unknown) => {
	if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
		updateSettingValue(template, value);
		return;
	}

	updateSettingValue(template, value == null ? '' : String(value));
};

const updateMultiSelectSettingValue = (template: SettingTempl, value: unknown) => {
	const list = (Array.isArray(value) ? value : value ? [value] : [])
		.filter((item): item is string | number | boolean => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
		.map(String);

	updateSettingValue(template, list.join(','));
};

const handleFileChange = (template: SettingTempl, event: Event) => {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	if (file) {
		updateSettingValue(template, file.name);
	}
};

watchEffect(() => {
	for (const template of templates.value) {
		if (getInputType(template) !== InputTypeEnum.TEXT || !isWhatsAppUrlTemplate(template)) {
			continue;
		}

		if (prefilledWhatsAppSetCodes.value.has(template.set_code) || getTextSettingValue(template).trim()) {
			continue;
		}

		const candidate = getWhatsAppMeUrlCandidate();
		if (!candidate) {
			continue;
		}

		prefilledWhatsAppSetCodes.value.add(template.set_code);
		updateSettingValue(template, candidate);
	}
});
</script>

<style scoped>
.setting-templs-title {
	font-size: 0.875rem;
	line-height: 1.25rem;
	font-weight: 500;
	color: var(--color-neutral-400);
	overflow-wrap: anywhere;
}
</style>
