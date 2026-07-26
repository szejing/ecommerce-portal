<template>
	<UModal
		:title="t('components.zModal.updateOutlet')"
		:ui="{
			content: 'w-full sm:max-w-[60%] md:max-w-[40%] lg:max-w-[30%]',
		}"
	>
		<template #body>
			<UForm ref="form" :schema="outletSchema" :state="state.outlet" class="space-y-4" @submit="onSubmit">
				<!-- *********************** General Info *********************** -->
				<ZInputOutletGeneralInfo
					v-model:code="state.outlet.code"
					v-model:description="state.outlet.description"
					v-model:dial-code="state.outlet.dial_code"
					v-model:phone-no="state.outlet.phone_no"
					is-update
				/>
				<ZInputAddress
					v-model:address1="state.outlet.address1"
					v-model:address2="state.outlet.address2"
					v-model:address3="state.outlet.address3"
					v-model:city="state.outlet.city"
					v-model:postal-code="state.outlet.postal_code"
					v-model:state-name="state.outlet.state"
					v-model:country-code="state.outlet.country_code"
					v-model:longitude="state.outlet.longitude"
					v-model:latitude="state.outlet.latitude"
					state-field-name="state"
					required-lat-lng
					class="mt-4"
				/>
				<!-- *********************** General Info *********************** -->
				<div class="mt-4">
					<h6 class="text-secondary-700 text-sm font-bold">{{ t('components.zModal.taxRule') }}</h6>
					<ZSelectMenuTaxRule :tax-rule="state.outlet.tax_rule" @update:tax-rule="updateTaxRule" />
				</div>
			</UForm>
		</template>

		<template #footer>
			<div class="flex-jbetween-icenter w-full">
				<UButton color="error" variant="ghost" class="opacity-50 hover:opacity-100" @click="onDelete">
					{{ t('components.zModal.delete') }}
				</UButton>

				<div class="flex-jend gap-4">
					<UButton color="neutral" variant="soft" @click="onCancel">{{ t('common.cancel') }}</UButton>
					<UButton color="primary" variant="solid" :loading="updating" @click="form.submit()">
						{{ t('components.zModal.update') }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>
</template>

<script lang="ts" setup>
import type { FormSubmitEvent } from '#ui/types';
import type { z } from 'zod';
import { UpdateOutletValidation } from '~/utils/schema';
import type { Outlet } from '~/utils/types/outlet';
import type { TaxRule } from '~/utils/types/tax-rule';

const { t } = useI18n();
const outletSchema = computed(() => UpdateOutletValidation(t));

type Schema = z.infer<ReturnType<typeof UpdateOutletValidation>>;

const props = defineProps({
	outlet: {
		type: Object as PropType<Outlet> | undefined,
		required: true,
	},
});
const emit = defineEmits(['update', 'delete', 'cancel']);

const form = ref();

const state = reactive({
	outlet: {
		code: props.outlet.code,
		description: props.outlet.description,
		dial_code: props.outlet.dial_code,
		phone_no: props.outlet.phone_no,
		address1: props.outlet.address1,
		address2: props.outlet.address2,
		address3: props.outlet.address3,
		city: props.outlet.city,
		country_code: props.outlet.country_code,
		state: props.outlet.state,
		postal_code: props.outlet.postal_code,
		longitude: props.outlet.longitude,
		latitude: props.outlet.latitude,
		tax_rule: props.outlet.tax_rule?.code,
	},
});

const tagStore = useProductTagStore();
const { updating } = storeToRefs(tagStore);

const updateTaxRule = (tax_rule: TaxRule | undefined) => {
	state.outlet.tax_rule = tax_rule?.code;
};

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	const { code, description, dial_code, phone_no, address1, address2, address3, city, country_code, state, postal_code, longitude, latitude, tax_rule } =
		event.data;

	emit('update', {
		code,
		description,
		dial_code,
		phone_no,
		address1,
		address2,
		address3,
		city,
		country_code,
		state,
		postal_code,
		longitude,
		latitude,
		tax_rule,
	});
};

const onDelete = () => {
	emit('delete');
};

const onCancel = () => {
	emit('cancel');
};
</script>

<style scoped></style>
