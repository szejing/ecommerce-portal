<template>
	<div class="space-y-6">
		<!-- Contact details -->
		<UCard class="card">
			<template #header>
				<div class="flex items-center gap-2">
					<UIcon :name="ICONS.CUSTOMER_GROUP_ROUNDED" class="w-5 h-5 text-muted" />
					<h2 class="text-base font-semibold text-default">{{ t('components.orderDetail.customerInformation') }}</h2>
				</div>
			</template>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<UFormField v-slot="{ error }" :label="t('components.orderInput.customerName')" name="customer_name" required>
					<UInput v-model="name" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.orderInput.customerNamePlaceholder')" />
				</UFormField>

				<UFormField v-slot="{ error }" :label="t('components.orderDetail.emailAddress')" name="email_address" required>
					<UInput
						v-model="email_address"
						type="email"
						autocomplete="email"
						:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
						:placeholder="t('components.orderInput.emailAddressPlaceholder')"
					/>
				</UFormField>

				<UFormField v-slot="{ error }" :label="t('components.orderDetail.phoneNo')" name="phone_no" required>
					<UInput
						v-model="phone_no"
						type="tel"
						autocomplete="tel"
						:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
						:placeholder="t('components.orderInput.phoneNoPlaceholder')"
					/>
				</UFormField>
			</div>
		</UCard>

		<!-- Addresses -->
		<template v-if="shipping_address || billing_address">
			<UCard v-if="shipping_address" class="card">
				<template #header>
					<h2 class="text-base font-semibold text-default">{{ t('components.orderInput.shippingAddress') }}</h2>
				</template>
				<ZInputAddress
					v-model:address1="shipping_address.address1"
					v-model:address2="shipping_address.address2"
					v-model:address3="shipping_address.address3"
					v-model:city="shipping_address.city"
					v-model:postal-code="shipping_address.postal_code"
					v-model:state-name="shipping_address.state"
					v-model:country-code="shipping_address.country_code"
					class="mt-1"
				/>
			</UCard>

			<UCard v-if="billing_address" class="card">
				<template #header>
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
						<h2 class="text-base font-semibold text-default">{{ t('components.orderInput.billingAddress') }}</h2>
						<UCheckbox
							v-model="same_as_shipping_address"
							:ui="{ label: 'text-sm font-normal text-muted' }"
							:label="t('components.orderInput.sameAsShippingAddress')"
							@change="onChangeSameAsShippingAddress"
						/>
					</div>
				</template>
				<ZInputAddress
					v-model:address1="billing_address.address1"
					v-model:address2="billing_address.address2"
					v-model:address3="billing_address.address3"
					v-model:city="billing_address.city"
					v-model:postal-code="billing_address.postal_code"
					v-model:state-name="billing_address.state"
					v-model:country-code="billing_address.country_code"
					class="mt-1"
				/>
			</UCard>
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

<style scoped>
/* Cards */
.card {
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	transition: box-shadow 0.2s ease;
}

.card:hover {
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
