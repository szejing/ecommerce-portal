<template>
	<div class="w-full">
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			<p v-if="customer?.customer_no" class="customer-detail-item">
				<span>{{ t('components.orderDetail.customerNo') }}</span>
				<span>{{ customer?.customer_no }}</span>
			</p>
			<p v-if="customer?.name" class="customer-detail-item">
				<span>{{ t('common.name') }}</span>
				<span>{{ customer?.name }}</span>
			</p>
			<p v-if="customer?.email_address" class="customer-detail-item">
				<span>{{ t('components.orderDetail.emailAddress') }}</span>
				<span>{{ customer?.email_address }}</span>
			</p>
			<p v-if="customer?.phone_no" class="customer-detail-item">
				<span>{{ t('components.orderDetail.phoneNo') }}</span>
				<span>{{ customer?.phone_no }}</span>
			</p>
			<p v-if="customer?.ref_no1" class="customer-detail-item">
				<span>{{ t('components.orderDetail.refNo1') }}</span>
				<span>{{ customer?.ref_no1 }}</span>
			</p>
			<p v-if="customer?.ref_no2" class="customer-detail-item">
				<span>{{ t('components.orderDetail.refNo2') }}</span>
				<span>{{ customer?.ref_no2 }}</span>
			</p>
		</div>
		<div v-if="hasAddressValue(customer?.shipping_address) || hasAddressValue(customer?.billing_address)" class="grid sm:grid-cols-2 gap-4 mt-6">
			<div v-if="hasAddressValue(customer?.shipping_address)" class="flex flex-col gap-4">
				<div class="flex flex-row flex-nowrap items-center justify-between gap-2 min-w-0">
					<p class="customer-detail-item min-w-0 flex-1 m-0">
						<span>{{ t('components.orderDetail.shippingAddress') }}</span>
						<span class="hidden" aria-hidden="true"></span>
					</p>
					<div class="flex shrink-0 items-center gap-1">
						<UButton
							color="primary"
							variant="ghost"
							size="sm"
							square
							icon="i-heroicons-clipboard-document"
							:aria-label="t('components.orderDetail.copyShippingAddress')"
							@click="copyShippingAddress"
						/>
					</div>
				</div>
				<component
					:is="shippingMapsHref ? 'a' : 'div'"
					v-bind="shippingMapsHref ? { href: shippingMapsHref, target: '_blank', rel: 'noopener noreferrer' } : {}"
					:aria-label="shippingMapsHref ? t('components.orderDetail.openShippingDirections') : undefined"
					:class="
						[
							'block rounded-lg border border-primary/20 bg-primary/5 px-3 py-3 text-sm text-neutral-600 transition-colors dark:border-primary/30 dark:bg-primary/10 dark:text-neutral-300 space-y-0.5 [&_p]:m-0',
							shippingMapsHref &&
								'cursor-pointer hover:bg-primary/10 hover:border-primary/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:bg-primary/15',
						].filter(Boolean)
					"
				>
					<p v-for="(line, idx) in shippingAddressLines" :key="idx">{{ line }}</p>
				</component>
			</div>

			<div v-if="hasAddressValue(customer?.billing_address)" class="flex flex-col gap-4">
				<h3>{{ t('components.orderDetail.billingAddress') }}</h3>
				<div class="text-neutral-400">
					<p v-if="customer?.billing_address?.address1">{{ customer?.billing_address?.address1 }}</p>
					<p v-if="customer?.billing_address?.address2">{{ customer?.billing_address?.address2 }}</p>
					<p v-if="customer?.billing_address?.address3">{{ customer?.billing_address?.address3 }}</p>
					<p v-if="joinAddress(customer?.billing_address)">{{ joinAddress(customer?.billing_address) }}</p>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import type { AddressModel, CustomerModel } from '~/utils/models/customer.model';
import { formatOrderAddressMultiline, orderAddressGoogleMapsUrl } from '~/utils/order-customer-address';

const props = defineProps<{
	customer: CustomerModel | undefined;
}>();

const { t } = useI18n();
const toast = useToast();

const joinAddress = (address: AddressModel | undefined) => {
	return [address?.city, address?.state, address?.postal_code, address?.country_code].filter(Boolean).join(', ');
};

const shippingMapsHref = computed(() => orderAddressGoogleMapsUrl(props.customer?.shipping_address));

const shippingAddressLines = computed(() => {
	const a = props.customer?.shipping_address;
	if (!a) return [];
	const lines: string[] = [];
	const push = (s: string | undefined) => {
		const trimmed = s?.trim();
		if (trimmed) lines.push(trimmed);
	};
	push(a.address1);
	push(a.address2);
	push(a.address3);
	const tail = joinAddress(a);
	if (tail) lines.push(tail);
	return lines;
});

const copyShippingAddress = async () => {
	const text = formatOrderAddressMultiline(props.customer?.shipping_address);
	if (!text) {
		toast.add({ title: t('components.orderDetail.copyShippingAddressFailed'), color: 'warning' });
		return;
	}
	try {
		await navigator.clipboard.writeText(text);
		toast.add({ title: t('components.orderDetail.copyShippingAddressSuccess'), color: 'success' });
	} catch {
		toast.add({ title: t('components.orderDetail.copyShippingAddressFailed'), color: 'error' });
	}
};

const hasAddressValue = (address: AddressModel | undefined) => {
	if (!address) return false;
	return !!(address.address1 || address.address2 || address.address3 || address.city || address.state || address.postal_code || address.country_code);
};
</script>

<style scoped>
.customer-detail-item {
	display: flex;
	flex-direction: column;
	font-size: 0.875rem;
	line-height: 1.25rem;
}

.customer-detail-item span:first-child {
	color: var(--color-neutral-400);
	font-weight: 300;
	margin-bottom: 0.25rem;
}

.customer-detail-item span:last-child {
	font-weight: 700;
	color: var(--color-neutral-800);
}
</style>
