<template>
	<div class="section-grid-basic-details">
		<UFormField :label="t('components.orderInput.paymentDate')" name="paymentDate">
			<ZSelectMenuDateTime :date-time="paymentDateTime" :placeholder="t('components.orderInput.paymentDate')" @update:date-time="paymentDateTime = $event" />
		</UFormField>

		<!-- // Date selection -->
		<div class="grid grid-cols-1 gap-4">
			<UFormField :label="t('components.orderInput.paymentType')" name="paymentType">
				<ZSelectMenuPaymentType v-model:payment-type-code="paymentTypeCode" v-model:currency-code="currencyCode" class="w-full" />
			</UFormField>

			<UFormField v-slot="{ error }" :label="t('components.orderInput.paymentAmountWithCurrency', { currency: currencyCode })" name="paymentAmount" required>
				<UInput
					v-model="paymentAmount"
					:trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined"
					:placeholder="t('components.orderInput.paymentAmountPlaceholder')"
					disabled
				/>
			</UFormField>

			<UFormField v-slot="{ error }" :label="t('components.orderDetail.refNo1')" name="refNo1">
				<UInput v-model="refNo1" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.orderInput.refNo1Placeholder')" />
			</UFormField>

			<UFormField v-slot="{ error }" :label="t('components.orderDetail.refNo2')" name="refNo2">
				<UInput v-model="refNo2" :trailing-icon="error ? ICONS.ERROR_OUTLINE : undefined" :placeholder="t('components.orderInput.refNo2Placeholder')" />
			</UFormField>
		</div>

		<!-- // add table to allow meta data (key, value) -->
	</div>
</template>

<script lang="ts" setup>
import { ZSelectMenuDateTime } from '#components';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const props = defineProps({
	paymentDateTime: Date,
	paymentTypeCode: String,
	refNo1: String,
	refNo2: String,
	paymentAmount: Number,
	currencyCode: String,
	externalIntgType: Number,
	// metadata: Object as PropType<Record<string, unknown>>,
});

const emit = defineEmits([
	'update:paymentDateTime',
	'update:paymentTypeCode',
	'update:refNo1',
	'update:refNo2',
	'update:paymentAmount',
	'update:currencyCode',
	'update:externalIntgType',
]);

const paymentDateTime = computed({
	get() {
		return props.paymentDateTime;
	},
	set(value) {
		emit('update:paymentDateTime', value);
	},
});

const paymentTypeCode = computed({
	get() {
		return props.paymentTypeCode;
	},
	set(value) {
		emit('update:paymentTypeCode', value);
	},
});

const refNo1 = computed({
	get() {
		return props.refNo1;
	},
	set(value) {
		emit('update:refNo1', value);
	},
});

const refNo2 = computed({
	get() {
		return props.refNo2;
	},
	set(value) {
		emit('update:refNo2', value);
	},
});

const paymentAmount = computed({
	get() {
		return props.paymentAmount?.toFixed(2);
	},
	set(value) {
		emit('update:paymentAmount', value);
	},
});

const currencyCode = computed({
	get() {
		return props.currencyCode;
	},
	set(value) {
		emit('update:currencyCode', value);
	},
});

// const metadata = computed({
// 	get() {
// 		return props.metadata;
// 	},
// 	set(value) {
// 		emit('update:metadata', value);
// 	},
// });
</script>

<style scoped>
.section-grid-basic-details {
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	gap: 0.75rem;
}
</style>
