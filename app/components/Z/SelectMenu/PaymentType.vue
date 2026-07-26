<template>
	<USelectMenu
		v-model="paymentTypeCode"
		:items="paymentTypeItems"
		size="md"
		value-key="code"
		:placeholder="t('components.selectMenu.selectPaymentType')"
		:search-input="{
			placeholder: 'Search payment type…',
			icon: 'i-lucide-search',
		}"
	>
		<template #default>
			<span v-if="paymentTypeCode" class="truncate">{{ paymentTypes.find((type: any) => type.code === paymentTypeCode)?.code?.toUpperCase() }}</span>
			<span v-else class="text-neutral-400">{{ t('components.selectMenu.selectPaymentType') }}</span>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
const { t } = useI18n();
const paymentTypeStore = usePaymentTypeStore();
const { payment_type_groups } = storeToRefs(paymentTypeStore);

const props = defineProps<{ paymentTypeCode: string | undefined; currencyCode: string | undefined }>();

const emit = defineEmits(['update:paymentTypeCode', 'update:currencyCode']);

const paymentTypes = computed(() => {
	return payment_type_groups.value.map((group) => group.payment_types).flat();
});

const paymentTypeItems = computed(() => {
	return paymentTypes.value.map((paymentType) => ({
		...paymentType,
		label: paymentType.code,
	}));
});

const paymentTypeCode = computed({
	get() {
		return props.paymentTypeCode;
	},
	set(code) {
		emit('update:paymentTypeCode', code);
		emit('update:currencyCode', paymentTypes.value.find((type) => type.code === code)?.currency_code);
	},
});
</script>

<style scoped></style>
