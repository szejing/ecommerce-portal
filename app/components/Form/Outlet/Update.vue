<template>
	<div class="w-full">
		<UForm ref="formRef" :schema="outletSchema" :state="formState" class="grid grid-cols-1 lg:grid-cols-12 gap-6" @submit="onSubmit">
			<div class="lg:col-span-9 space-y-6">
				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<UIcon :name="ICONS.OUTLET" class="w-5 h-5 text-primary-500" />
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('components.productForm.generalInformation') }}</h3>
					</div>
					<div class="pl-7">
						<ZInputOutletGeneralInfo
							v-model:code="formState.code"
							v-model:description="formState.description"
							v-model:dial-code="formState.dial_code"
							v-model:phone-no="formState.phone_no"
							is-update
						/>
					</div>
				</div>

				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<UIcon name="i-heroicons-map-pin" class="w-5 h-5 text-primary-500" />
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('components.outletForm.addressAndLocation') }}</h3>
					</div>
					<div class="pl-7">
						<ZInputAddress
							v-model:address1="formState.address1"
							v-model:address2="formState.address2"
							v-model:address3="formState.address3"
							v-model:city="formState.city"
							v-model:postal-code="formState.postal_code"
							v-model:state-name="formState.state"
							v-model:country-code="formState.country_code"
							v-model:longitude="formState.longitude"
							v-model:latitude="formState.latitude"
							state-field-name="state"
							required-lat-lng
						/>
					</div>
				</div>

				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<UIcon :name="ICONS.TAX" class="w-5 h-5 text-primary-500" />
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('components.outletForm.taxConfiguration') }}</h3>
					</div>
					<div class="pl-7">
						<ZSelectMenuTaxRule :tax-rule="formState.tax_rule" class="sm:w-[50%] w-full" @update:tax-rule="updateTaxRule" />
					</div>
				</div>
			</div>

			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-4">
					<FormOutletReviewSummary :summary="reviewSummary" />
				</div>
			</div>
		</UForm>
	</div>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { UpdateOutletValidation } from '~/utils/schema';
import { ICONS } from '~/utils/icons';
import type { Outlet } from '~/utils/types/outlet';
import type { TaxRule } from '~/utils/types/tax-rule';
import { formatOutletCoordinatesLabel, isOutletCoordPairAtOrigin, parseOutletMapCoords } from '~/utils/outlet-review-map';
import type { OutletReviewSummary } from './ReviewSummary.vue';

const props = defineProps<{
	outletCode: string;
	initialOutlet: Outlet;
}>();

const emit = defineEmits<{
	saved: [];
}>();

const { t } = useI18n();
const outletSchema = computed(() => UpdateOutletValidation(t));
type Schema = z.infer<ReturnType<typeof UpdateOutletValidation>>;

const outletStore = useOutletStore();

const formRef = ref<{ submit: () => void } | null>(null);

const emptyState = () => ({
	code: '',
	description: '',
	dial_code: '+60',
	phone_no: '',
	address1: '',
	address2: '' as string | undefined,
	address3: '' as string | undefined,
	city: '',
	country_code: '',
	state: '',
	postal_code: '',
	longitude: undefined as number | string | undefined,
	latitude: undefined as number | string | undefined,
	tax_rule: undefined as string | undefined,
});

const formState = reactive(emptyState());

const applyFromOutlet = (o: Outlet) => {
	Object.assign(formState, emptyState());
	formState.code = o.code;
	formState.description = o.description;
	formState.dial_code = o.dial_code;
	formState.phone_no = o.phone_no;
	formState.address1 = o.address1;
	formState.address2 = o.address2;
	formState.address3 = o.address3;
	formState.city = o.city;
	formState.country_code = o.country_code;
	formState.state = o.state;
	formState.postal_code = o.postal_code;
	formState.longitude = o.longitude ?? undefined;
	formState.latitude = o.latitude ?? undefined;
	formState.tax_rule = o.tax_rule?.code;
};

watch(
	() => props.initialOutlet,
	(v) => {
		applyFromOutlet(v);
	},
	{ immediate: true },
);

const buildAddressBlock = (o: { address1: string; address2?: string | null; address3?: string | null; city: string; state: string; postal_code: string }) => {
	const lines = [o.address1, o.address2, o.address3].map((s) => s?.trim()).filter(Boolean) as string[];
	const tail = [o.city, o.state, o.postal_code]
		.map((s) => s?.trim())
		.filter(Boolean)
		.join(', ');
	return [...lines, tail].filter(Boolean).join('\n');
};

const reviewSummary = computed((): OutletReviewSummary => {
	const o = formState;
	const map = parseOutletMapCoords(o.latitude, o.longitude);
	return {
		code: o.code?.trim() ?? '',
		description: o.description?.trim() ?? '',
		phoneLabel: [o.dial_code, o.phone_no].filter(Boolean).join(' ').trim(),
		taxRuleLabel: o.tax_rule?.trim() ?? '',
		addressBlock: buildAddressBlock(o as Parameters<typeof buildAddressBlock>[0]),
		countryLabel: o.country_code?.trim().toUpperCase() ?? '',
		coordinatesLabel: formatOutletCoordinatesLabel(o.latitude, o.longitude),
		hideCoordinatesAtOrigin: isOutletCoordPairAtOrigin(o.latitude, o.longitude),
		...map,
	};
});

const updateTaxRule = (tax_rule: TaxRule | undefined) => {
	formState.tax_rule = tax_rule?.code;
};

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { code, description, dial_code, phone_no, address1, address2, address3, city, country_code, state, postal_code, longitude, latitude, tax_rule } =
		event.data;

	const payload = {
		code,
		description,
		dial_code,
		phone_no,
		address1,
		address2: address2 || undefined,
		address3: address3 || undefined,
		city,
		country_code,
		state,
		postal_code,
		longitude,
		latitude,
		tax_rule: tax_rule as Outlet['tax_rule'],
	} as Outlet;

	const ok = await outletStore.updateOutlet(props.outletCode, payload);
	if (ok) {
		emit('saved');
	}
};

const submit = () => {
	formRef.value?.submit();
};

defineExpose({ submit });
</script>
