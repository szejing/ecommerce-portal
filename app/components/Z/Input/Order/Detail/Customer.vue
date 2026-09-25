<template>
	<div class="space-y-6">
		<div class="grid grid-cols-1 gap-4">
			<UFormField v-slot="{ error }" :label="t('components.orderInput.customerName')" name="name" required>
				<UInput
					v-model="name"
					autocomplete="name"
					leading-icon="i-heroicons-user"
					:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
					:placeholder="t('components.orderInput.customerNamePlaceholder')"
				/>
			</UFormField>

			<UFormField v-slot="{ error }" :label="t('components.orderDetail.emailAddress')" name="email_address" required>
				<UInput
					v-model="email_address"
					type="email"
					autocomplete="email"
					leading-icon="i-heroicons-envelope"
					:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
					:placeholder="t('components.orderInput.emailAddressPlaceholder')"
				/>
			</UFormField>

			<UFormField v-slot="{ error }" :label="t('components.orderDetail.phoneNo')" name="phone_no" required>
				<UInput
					v-model="phone_no"
					type="tel"
					autocomplete="tel"
					leading-icon="i-heroicons-phone"
					:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
					:placeholder="t('components.orderInput.phoneNoPlaceholder')"
				/>
			</UFormField>
		</div>

		<template v-if="shipping_address || billing_address">
			<section v-if="shipping_address" class="space-y-4 border-t border-default pt-6">
				<h2 class="text-sm font-semibold text-highlighted">{{ t('components.orderInput.shippingAddress') }}</h2>
				<ZInputAddress
					v-model:address1="shipping_address.address1"
					v-model:address2="shipping_address.address2"
					v-model:address3="shipping_address.address3"
					v-model:city="shipping_address.city"
					v-model:postal-code="shipping_address.postal_code"
					v-model:state-name="shipping_address.state"
					v-model:country-code="shipping_address.country_code"
				/>
			</section>

			<section v-if="billing_address" class="space-y-4 border-t border-default pt-6">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<h2 class="text-sm font-semibold text-highlighted">{{ t('components.orderInput.billingAddress') }}</h2>
					<UCheckbox
						v-model="same_as_shipping_address"
						:ui="{ label: 'text-sm font-normal text-muted' }"
						:label="t('components.orderInput.sameAsShippingAddress')"
						@change="onChangeSameAsShippingAddress"
					/>
				</div>
				<ZInputAddress
					v-model:address1="billing_address.address1"
					v-model:address2="billing_address.address2"
					v-model:address3="billing_address.address3"
					v-model:city="billing_address.city"
					v-model:postal-code="billing_address.postal_code"
					v-model:state-name="billing_address.state"
					v-model:country-code="billing_address.country_code"
				/>
			</section>
		</template>
	</div>
</template>

<script lang="ts" setup>
import type { AddressModel } from '~/utils/models/customer.model';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const same_as_shipping_address = ref(false);
const props = defineProps({
	name: String,
	emailAddress: String,
	phoneNo: String,
	shippingAddress: Object as PropType<AddressModel>,
	billingAddress: Object as PropType<AddressModel>,
});

const emit = defineEmits(['update:name', 'update:emailAddress', 'update:phoneNo', 'update:shippingAddress', 'update:billingAddress']);

const name = computed({
	get() {
		return props.name;
	},
	set(value) {
		emit('update:name', value);
	},
});

const email_address = computed({
	get() {
		return props.emailAddress;
	},
	set(value) {
		emit('update:emailAddress', value);
	},
});

const phone_no = computed({
	get() {
		return props.phoneNo;
	},
	set(value) {
		emit('update:phoneNo', value);
	},
});

const shipping_address = computed({
	get() {
		return props.shippingAddress;
	},
	set(value) {
		emit('update:shippingAddress', value);
	},
});

const billing_address = computed({
	get() {
		return props.billingAddress;
	},
	set(value) {
		emit('update:billingAddress', value);
	},
});

const onChangeSameAsShippingAddress = () => {
	if (same_as_shipping_address.value) {
		billing_address.value = JSON.parse(JSON.stringify(shipping_address.value));
	}
};
</script>
