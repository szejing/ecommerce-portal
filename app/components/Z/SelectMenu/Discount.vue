<template>
	<USelectMenu
		v-model="codeModel"
		v-model:search-term="searchTerm"
		:items="items"
		value-key="code"
		label-key="searchText"
		:search-input="{
			placeholder: t('components.selectMenu.searchDiscount'),
			icon: 'i-lucide-search',
		}"
		size="md"
		variant="formTrigger"
		:placeholder="placeholder ?? t('components.selectMenu.selectDiscount')"
		:loading="loading"
		class="w-full"
	>
		<template #default>
			<ZSelectMenuDiscountRow :row="selected" :none-label="noneLabel" compact />
		</template>

		<template #item="{ item }">
			<ZSelectMenuDiscountRow :row="item" :none-label="noneLabel" />
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import { DiscountType } from 'yeppi-common';
import type { Discount } from '~/utils/types/discount';
import type { DiscountSelectMenuRow } from '~/utils/types/discount-select-menu';
import { formatDiscountDiscValue } from '~/utils/discount-rule-display';

const DISC_TYPE_I18N: Record<DiscountType, string> = {
	[DiscountType.PERCENTAGE]: 'components.discountForm.discTypeOptionPercentage',
	[DiscountType.FIXED]: 'components.discountForm.discTypeOptionFixed',
	[DiscountType.FREE_SHIPPING]: 'components.discountForm.discTypeOptionFreeShipping',
};

const { t } = useI18n();

const props = withDefaults(
	defineProps<{
		modelValue: string;
		discounts: Discount[];
		noneLabel: string;
		noneValue?: string;
		loading?: boolean;
		placeholder?: string;
	}>(),
	{
		noneValue: '__none__',
		loading: false,
	},
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const searchTerm = ref('');

function discTypeLabel(rt: DiscountType): string {
	return t(DISC_TYPE_I18N[rt]);
}

const items = computed<DiscountSelectMenuRow[]>(() => {
	const discountRows = props.discounts.map((d) => {
		const typeLabel = discTypeLabel(d.disc_type);
		const valuePart = d.disc_type === DiscountType.FREE_SHIPPING ? '' : `${formatDiscountDiscValue(d.disc_type, d.disc_value)} `;
		const searchText = [d.code, d.description, typeLabel, valuePart, props.noneValue].filter(Boolean).join(' ').trim();
		return {
			code: d.code,
			isNone: false,
			description: d.description ?? '',
			disc_type: d.disc_type,
			disc_value: d.disc_value,
			searchText,
		};
	});

	const noneSearch = [props.noneLabel, props.noneValue].join(' ');

	return [
		{
			code: props.noneValue,
			isNone: true,
			description: '',
			disc_type: null,
			disc_value: 0,
			searchText: noneSearch,
		},
		...discountRows,
	];
});

const selected = computed<DiscountSelectMenuRow>(() => {
	const list = items.value;
	return list.find((i) => i.code === props.modelValue) ?? list[0]!;
});

const codeModel = computed({
	get() {
		return props.modelValue;
	},
	set(v: string | undefined) {
		emit('update:modelValue', v ?? props.noneValue);
	},
});
</script>
