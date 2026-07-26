<template>
	<div class="w-full">
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
			<div class="lg:col-span-9">
				<UForm ref="formRef" :schema="discountSchema" :state="formState" class="space-y-6 mb-6" @submit="onSubmit" @error="onError">
					<ZInputDiscountDetailsSection :state="formState" code-disabled />
					<ZInputDiscountRuleAndConditionsSection :state="formState" />
				</UForm>
			</div>

			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-4">
					<FormDiscountReviewSummary subtitle-key="components.discountForm.reviewSubtitleEdit" :summary="reviewSummary" />
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { startOfDay } from 'date-fns';
import { DiscountType } from 'yeppi-common';
import { getFormattedDate } from 'yeppi-common';
import type { FormErrorEvent, FormSubmitEvent } from '#ui/types';
import { ZModalLoading } from '#components';
import type { z } from 'zod';
import { CreateDiscountValidation } from '~/utils/schema';
import { applyDiscountToFormState, emptyDiscountFormEditableState } from '~/utils/types/form/discount-creation';
import type { Discount } from '~/utils/types/discount';

const { t } = useI18n();

const props = defineProps<{
	discount: Discount;
}>();

const discountSchema = computed(() => CreateDiscountValidation(t));

type Schema = z.infer<ReturnType<typeof CreateDiscountValidation>>;

const discountStore = useDiscountStore();
const { updating } = storeToRefs(discountStore);

const formState = reactive(emptyDiscountFormEditableState());

watch(
	() => props.discount,
	(d) => {
		if (!d) return;
		applyDiscountToFormState(formState, d);
	},
	{ immediate: true },
);

const overlay = useOverlay();
const formRef = ref();

const loadingModal = overlay.create(ZModalLoading, {
	props: { key: 'loading-discount-update' },
});

watch(updating, (v) => {
	if (v) loadingModal.open();
	else loadingModal.close();
});

const discTypeLabel = (rt: DiscountType) =>
	t(
		{
			[DiscountType.FIXED]: 'components.discountForm.discTypeOptionFixed',
			[DiscountType.PERCENTAGE]: 'components.discountForm.discTypeOptionPercentage',
			[DiscountType.FREE_SHIPPING]: 'components.discountForm.discTypeOptionFreeShipping',
		}[rt],
	);

/** Hardcoded until merchant currency is wired into this form (review summary). */
const discValueCurrencyCode = 'RM';

const ruleSummaryLabel = computed(() => {
	const rt = formState.disc_type ?? DiscountType.PERCENTAGE;
	const rv = formState.disc_value;
	const typeName = discTypeLabel(rt);
	if (rt === DiscountType.PERCENTAGE) {
		return `${typeName}: ${rv}%`;
	}
	if (rt === DiscountType.FREE_SHIPPING) {
		return typeName;
	}
	return `${typeName}: ${discValueCurrencyCode} ${rv}`;
});

const reviewSummary = computed(() => {
	const s = formState.starts_at;
	const e = formState.ends_at;
	const notSet = t('common.notSet');
	let validityStartsAt = notSet;
	let validityEndsAt = notSet;
	if (s && e) {
		const start = new Date(s);
		const endDate = new Date(e);
		validityStartsAt = getFormattedDate(start, 'dd-MM-yyyy');
		validityEndsAt = start.toDateString() === endDate.toDateString() ? '-' : getFormattedDate(endDate, 'dd-MM-yyyy');
	} else if (s && !e) {
		validityStartsAt = getFormattedDate(new Date(s), 'dd-MM-yyyy');
	} else if (!s && e) {
		validityStartsAt = getFormattedDate(startOfDay(new Date()), 'dd-MM-yyyy');
		validityEndsAt = getFormattedDate(new Date(e), 'dd-MM-yyyy');
	}
	return {
		code: formState.code?.trim() ?? '',
		description: formState.description ?? '',
		validityStartsAt,
		validityEndsAt,
		ruleSummary: ruleSummaryLabel.value,
		conditionsCount: formState.conditions?.length ?? 0,
	};
});

const fieldSectionMap: Record<string, string> = {
	code: 'section-discount-details',
	description: 'section-discount-details',
	is_disabled: 'section-discount-details',
	starts_at: 'section-discount-details',
	ends_at: 'section-discount-details',
	usage_limit: 'section-discount-rule-conditions',
	disc_type: 'section-discount-rule-conditions',
	disc_value: 'section-discount-rule-conditions',
	allocation: 'section-discount-rule-conditions',
	min_order_amt: 'section-discount-rule-conditions',
	max_disc_amt: 'section-discount-rule-conditions',
};

const onError = (event: FormErrorEvent) => {
	const firstError = event.errors[0];
	const errorName = firstError?.name;
	if (!errorName) return;

	const fieldName = errorName.split('.')[0] ?? errorName;
	const sectionId = fieldSectionMap[fieldName] ?? (fieldName === 'conditions' ? 'section-discount-rule-conditions' : undefined);

	if (sectionId) {
		document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	nextTick(() => {
		const errorEl = document.getElementById(errorName);
		errorEl?.focus();
	});
};

const mapConditionsForApi = (data: Schema) =>
	(data.conditions ?? []).map((c) => ({
		...(c.filter_operator != null ? { filter_operator: c.filter_operator } : {}),
		...(c.filter_condition != null ? { filter_condition: c.filter_condition } : {}),
		...(c.filter_value?.trim() ? { filter_value: c.filter_value.trim() } : {}),
	}));

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	try {
		const data = event.data;
		const startsAt = data.ends_at && !data.starts_at ? startOfDay(new Date()).toISOString() : data.starts_at;
		const body = {
			description: data.description.trim(),
			is_disabled: data.is_disabled,
			starts_at: startsAt,
			ends_at: data.ends_at,
			usage_limit: data.usage_limit,
			disc_type: data.disc_type,
			disc_value: data.disc_value,
			...(data.allocation != null ? { allocation: data.allocation } : {}),
			...(data.min_order_amt != null ? { min_order_amt: data.min_order_amt } : {}),
			...(data.max_disc_amt != null ? { max_disc_amt: data.max_disc_amt } : {}),
			conditions: mapConditionsForApi(data),
		};
		const result = await discountStore.updateDiscount(props.discount.code, body);
		if (result?.discount?.code) {
			await navigateTo('/marketing/discounts');
		}
	} catch {
		// store handles error toast
	}
};

const submit = () => {
	formRef.value?.submit();
};

defineExpose({ submit });
</script>

<style scoped>
html {
	scroll-behavior: smooth;
}

@media (max-width: 640px) {
	.space-y-6 > * + * {
		margin-top: 1.5rem;
	}
}
</style>
