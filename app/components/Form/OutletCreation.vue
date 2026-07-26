<template>
	<div class="w-full">
		<UForm ref="formRef" :schema="outletSchema" :state="new_outlet" class="grid grid-cols-1 lg:grid-cols-12 gap-6" @submit="onSubmit">
			<div class="lg:col-span-9 space-y-6">
				<div class="space-y-3">
					<div class="flex items-center gap-2">
						<UIcon :name="ICONS.OUTLET" class="w-5 h-5 text-primary-500" />
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ t('components.productForm.generalInformation') }}</h3>
					</div>
					<div class="pl-7">
						<ZInputOutletGeneralInfo
							v-model:code="new_outlet.code"
							v-model:description="new_outlet.description"
							v-model:dial-code="new_outlet.dial_code"
							v-model:phone-no="new_outlet.phone_no"
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
							v-model:address1="new_outlet.address1"
							v-model:address2="new_outlet.address2"
							v-model:address3="new_outlet.address3"
							v-model:city="new_outlet.city"
							v-model:postal-code="new_outlet.postal_code"
							v-model:state-name="new_outlet.state"
							v-model:country-code="new_outlet.country_code"
							v-model:longitude="new_outlet.longitude"
							v-model:latitude="new_outlet.latitude"
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
						<ZSelectMenuTaxRule v-model:tax-rule="new_outlet.tax_rule_code" class="sm:w-[50%] w-full" @update:tax-rule="updateTaxRule" />
					</div>
				</div>
			</div>

			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-4">
					<FormOutletReviewSummary :summary="reviewSummary" subtitle-key="components.outletForm.reviewSubtitleCreate" />
				</div>
			</div>
		</UForm>
	</div>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { CreateOutletValidation } from '~/utils/schema';
import { ICONS } from '~/utils/icons';
import type { Outlet } from '~/utils/types/outlet';
import type { TaxRule } from '~/utils/types/tax-rule';
import { formatOutletCoordinatesLabel, isOutletCoordPairAtOrigin, parseOutletMapCoords } from '~/utils/outlet-review-map';
import type { OutletReviewSummary } from '~/components/Form/Outlet/ReviewSummary.vue';

const emit = defineEmits<{
	saved: [outlet: Outlet];
}>();

const { t } = useI18n();
const outletSchema = computed(() => CreateOutletValidation(t));

type Schema = z.infer<ReturnType<typeof CreateOutletValidation>>;

const outletStore = useOutletStore();
const { adding, new_outlet } = storeToRefs(outletStore);

const formRef = ref<{ submit: () => void } | null>(null);

onMounted(() => {
	outletStore.resetNewOutlet();
});

const buildAddressBlock = (o: { address1: string; address2?: string | null; address3?: string | null; city: string; state: string; postal_code: string }) => {
	const lines = [o.address1, o.address2, o.address3].map((s) => s?.trim()).filter(Boolean) as string[];
	const tail = [o.city, o.state, o.postal_code]
		.map((s) => s?.trim())
		.filter(Boolean)
		.join(', ');
	return [...lines, tail].filter(Boolean).join('\n');
};

const reviewSummary = computed((): OutletReviewSummary => {
	const o = new_outlet.value;
	const map = parseOutletMapCoords(o.latitude, o.longitude);
	return {
		code: o.code?.trim() ?? '',
		description: o.description?.trim() ?? '',
		phoneLabel: [o.dial_code, o.phone_no].filter(Boolean).join(' ').trim(),
		taxRuleLabel: o.tax_rule_code?.trim() ?? '',
		addressBlock: buildAddressBlock(o as Parameters<typeof buildAddressBlock>[0]),
		countryLabel: o.country_code?.trim().toUpperCase() ?? '',
		coordinatesLabel: formatOutletCoordinatesLabel(o.latitude, o.longitude),
		hideCoordinatesAtOrigin: isOutletCoordPairAtOrigin(o.latitude, o.longitude),
		...map,
	};
});

const updateTaxRule = (tax_rule: TaxRule | undefined) => {
	new_outlet.value.tax_rule_code = tax_rule?.code;
};

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { code, description, dial_code, phone_no, address1, address2, address3, city, country_code, state, postal_code, longitude, latitude } = event.data;
	const taxCode = event.data.tax_rule ?? new_outlet.value.tax_rule_code;

	new_outlet.value = {
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
		longitude: Number(longitude) || undefined,
		latitude: Number(latitude) || undefined,
		tax_rule_code: taxCode || undefined,
	};

	const outlet = await outletStore.createOutlet();

	if (outlet) {
		emit('saved', outlet);
	}
};

const submit = () => {
	formRef.value?.submit();
};

defineExpose({ submit });
</script>

<style scoped></style>
