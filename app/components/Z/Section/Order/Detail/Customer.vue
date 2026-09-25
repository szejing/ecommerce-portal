<template>
	<UCard>
		<template #header>
			<div class="flex items-center justify-between gap-3">
				<h2 class="flex min-w-0 items-center gap-2 text-base font-semibold text-highlighted">
					<UIcon :name="showAddresses ? 'i-heroicons-map-pin' : ICONS.CUSTOMER_GROUP_ROUNDED" class="size-5 shrink-0" aria-hidden="true" />
					<span class="truncate">{{ customerContextTitle }}</span>
				</h2>
				<UButton
					v-if="canEdit"
					variant="soft"
					size="sm"
					icon="i-heroicons-pencil-square"
					class="shrink-0"
					:aria-label="t('components.orderDetail.editCustomer')"
					@click="editCustomerDetail"
				>
					{{ t('components.orderDetail.edit') }}
				</UButton>
			</div>
		</template>

		<dl class="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
			<div v-for="field in contactFields" :key="field.key" class="min-w-0">
				<dt class="text-xs font-medium text-muted">{{ field.label }}</dt>
				<dd class="mt-1 text-sm font-semibold break-all">
					<span v-if="!field.value" class="font-normal text-muted italic">{{ t('common.notSet') }}</span>
					<a
						v-else-if="field.href"
						:href="field.href"
						class="text-highlighted underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
					>
						{{ field.value }}
					</a>
					<span v-else class="text-highlighted">{{ field.value }}</span>
				</dd>
			</div>
		</dl>

		<div v-if="showAddresses" class="mt-6 grid gap-4 sm:grid-cols-2">
			<section class="flex min-w-0 flex-col gap-2">
				<div class="flex items-center justify-between gap-2">
					<h3 class="text-xs font-medium text-muted">{{ t('components.orderDetail.shippingAddress') }}</h3>
					<UButton
						v-if="hasAddressValue(customer?.shipping_address)"
						color="primary"
						variant="ghost"
						size="sm"
						square
						icon="i-heroicons-clipboard-document"
						:aria-label="t('components.orderDetail.copyShippingAddress')"
						@click="copyAddress(customer?.shipping_address)"
					/>
				</div>
				<component
					:is="shippingMapsHref ? 'a' : 'div'"
					v-if="shippingAddressLines.length"
					v-bind="shippingMapsHref ? { href: shippingMapsHref, target: '_blank', rel: 'noopener noreferrer' } : {}"
					:aria-label="shippingMapsHref ? t('components.orderDetail.openShippingDirections') : undefined"
					:class="addressPanelClass(!!shippingMapsHref)"
				>
					<p v-for="(line, idx) in shippingAddressLines" :key="idx">{{ line }}</p>
				</component>
				<p v-else class="rounded-lg border border-dashed border-default px-3 py-3 text-sm text-muted italic">
					{{ t('common.notSet') }}
				</p>
			</section>

			<section class="flex min-w-0 flex-col gap-2">
				<div class="flex items-center justify-between gap-2">
					<h3 class="text-xs font-medium text-muted">{{ t('components.orderDetail.billingAddress') }}</h3>
					<UButton
						v-if="hasAddressValue(customer?.billing_address)"
						color="neutral"
						variant="ghost"
						size="sm"
						square
						icon="i-heroicons-clipboard-document"
						:aria-label="t('components.orderDetail.copyBillingAddress')"
						@click="copyAddress(customer?.billing_address)"
					/>
				</div>
				<div v-if="billingAddressLines.length" :class="addressPanelClass(false)">
					<p v-for="(line, idx) in billingAddressLines" :key="idx">{{ line }}</p>
				</div>
				<p v-else class="rounded-lg border border-dashed border-default px-3 py-3 text-sm text-muted italic">
					{{ t('common.notSet') }}
				</p>
			</section>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { ZModalOrderDetailCustomer } from '#components';
import type { AddressModel, CustomerModel } from '~/utils/models/customer.model';
import { ICONS } from '~/utils/icons';
import { formatOrderAddressMultiline, orderAddressGoogleMapsUrl } from '~/utils/order-customer-address';

const props = defineProps<{
	customer: CustomerModel | undefined;
	showAddresses?: boolean;
	orderNo?: string;
}>();

const emit = defineEmits<{
	refresh: [];
}>();

const { t } = useI18n();
const toast = useToast();
const overlay = useOverlay();

const showAddresses = computed(() => props.showAddresses !== false);
const canEdit = computed(() => !!props.customer && !!props.orderNo);
const customerContextTitle = computed(() => (showAddresses.value ? t('components.orderDetail.shipTo') : t('components.orderDetail.customer')));

const joinAddress = (address: AddressModel | undefined) => {
	return [address?.city, address?.state, address?.postal_code, address?.country_code].filter(Boolean).join(', ');
};

const addressLines = (address: AddressModel | undefined) => {
	if (!address) return [];
	const lines: string[] = [];
	const push = (s: string | undefined) => {
		const trimmed = s?.trim();
		if (trimmed) lines.push(trimmed);
	};
	push(address.address1);
	push(address.address2);
	push(address.address3);
	const tail = joinAddress(address);
	if (tail) lines.push(tail);
	return lines;
};

const displayPhone = computed(() => {
	const phone = props.customer?.phone_no?.trim() ?? '';
	const dial = props.customer?.dial_code?.trim() ?? '';
	if (!phone) return '';
	if (!dial) return phone;
	const prefix = dial.startsWith('+') ? dial : `+${dial}`;
	return `${prefix} ${phone}`;
});

const contactFields = computed(() => {
	const customer = props.customer;
	const email = customer?.email_address?.trim() ?? '';
	const phone = displayPhone.value;
	const fields = [
		{ key: 'name', label: t('common.name'), value: customer?.name?.trim() ?? '' },
		{
			key: 'phone',
			label: t('components.orderDetail.phoneNo'),
			value: phone,
			href: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : undefined,
		},
		{
			key: 'email',
			label: t('components.orderDetail.emailAddress'),
			value: email,
			href: email ? `mailto:${email}` : undefined,
		},
		{ key: 'customer_no', label: t('components.orderDetail.customerNo'), value: customer?.customer_no?.trim() ?? '' },
	];
	if (customer?.ref_no1?.trim()) {
		fields.push({ key: 'ref_no1', label: t('components.orderDetail.refNo1'), value: customer.ref_no1.trim() });
	}
	if (customer?.ref_no2?.trim()) {
		fields.push({ key: 'ref_no2', label: t('components.orderDetail.refNo2'), value: customer.ref_no2.trim() });
	}
	return fields;
});

const shippingMapsHref = computed(() => orderAddressGoogleMapsUrl(props.customer?.shipping_address));
const shippingAddressLines = computed(() => addressLines(props.customer?.shipping_address));
const billingAddressLines = computed(() => addressLines(props.customer?.billing_address));

const addressPanelClass = (interactive: boolean) =>
	[
		'block rounded-lg border border-default bg-elevated px-3 py-3 text-sm text-default space-y-0.5 [&_p]:m-0',
		interactive &&
			'cursor-pointer hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
	].filter(Boolean);

const copyAddress = async (address: AddressModel | undefined) => {
	const text = formatOrderAddressMultiline(address);
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

const editCustomerDetail = () => {
	if (!props.customer || !props.orderNo) return;

	const customerModal = overlay.create(ZModalOrderDetailCustomer, {
		props: {
			orderNo: props.orderNo,
			customer: JSON.parse(JSON.stringify(props.customer)),
			onUpdate: () => {
				customerModal.close();
				emit('refresh');
			},
			onCancel: () => {
				customerModal.close();
			},
		},
	});

	customerModal.open();
};
</script>
