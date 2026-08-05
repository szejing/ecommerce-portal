<template>
	<div class="w-full">
		<UForm ref="formRef" :schema="formSchema" :state="uFormState" class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6" @submit="onSubmit" @error="onError">
			<div class="lg:col-span-9 space-y-6">
				<ZInputVoucherDetailsSection
					:state="formModel.voucher"
					form-field-prefix="voucher"
					code-disabled
					show-status-switch
					:discounts="discountOptions"
					:none-label="t('components.discountForm.filterNone')"
					:discount-options-loading="discountOptionsLoading"
					:link-discount-to-voucher-code="linkedBundledDiscount"
				/>

				<ZInputDiscountRuleAndConditionsSection :state="formModel.discount" form-field-prefix="discount" />
			</div>

			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-4">
					<FormVoucherReviewSummary :summary="reviewSummary" />
				</div>
			</div>
		</UForm>
	</div>
</template>

<script lang="ts" setup>
import { startOfDay } from 'date-fns';
import { AllocationType, DiscountType, type ErrorResponse } from 'yeppi-common';
import { getFormattedDate } from 'yeppi-common';
import type { FormErrorEvent, FormSubmitEvent } from '#ui/types';
import { ZModalLoading } from '#components';
import type { z } from 'zod';
import type { Discount } from '~/utils/types/discount';
import type { CreateVoucherReq } from '~/repository/modules/voucher/models/request/create-voucher.req';
import { UpdateVoucherFormValidation } from '~/utils/schema';
import { buildDiscountApplySummaryLine } from '~/utils/discount/apply-summary';
import { buildDiscountConditionReviewItems } from '~/utils/discount/discount-condition-review-lines';
import type { Voucher } from '~/utils/types/voucher';
import type { VoucherFormState } from '~/utils/types/form/voucher-creation';
import { failedNotification } from '~/stores/AppUi/AppUi';
import { applyDiscountToFormState, emptyDiscountFormEditableState } from '~/utils/types/form/discount-creation';
import type { CreateDiscountConditionReq } from '~/repository/modules/discount/models/request/create-discount.req';
import { voucherListingPathForAllocation } from '~/utils/voucher/create-type';
import { voucherDateToFormIso } from '~/utils/voucher/date';

const { t } = useI18n();

const props = defineProps<{
	voucher: Voucher;
}>();

const linkedBundledDiscount = computed(() => props.voucher.code.trim() === (props.voucher.discount?.code ?? '').trim());

const formSchema = computed(() => UpdateVoucherFormValidation(t, { linkDiscountToVoucher: linkedBundledDiscount.value }));
type Schema = z.infer<ReturnType<typeof UpdateVoucherFormValidation>>;

const voucherStore = useVoucherStore();
const discountStore = useDiscountStore();
const { updating } = storeToRefs(voucherStore);
const { updating: discountUpdating } = storeToRefs(discountStore);

const discountOptions = ref<Discount[]>([]);
const discountOptionsLoading = ref(false);

const formModel = reactive({
	voucher: {
		code: '',
		name: '',
		description: '',
		is_disabled: false,
		discount_code: '',
		starts_at: undefined,
		ends_at: undefined,
		usage_limit: undefined,
	} as VoucherFormState,
	discount: emptyDiscountFormEditableState(),
});

const uFormState = computed(() => formModel as unknown as Record<string, unknown>);

const syncBundledDiscountFromVoucherForm = () => {
	if (!linkedBundledDiscount.value) {
		return;
	}
	const c = formModel.voucher.code?.trim() ?? '';
	const desc = formModel.voucher.description?.trim() || formModel.voucher.name?.trim() || c;
	formModel.voucher.discount_code = c;
	formModel.discount.code = c;
	formModel.discount.description = desc;
	formModel.discount.is_disabled = formModel.voucher.is_disabled;
	const n = formModel.voucher.name?.trim();
	if (!n) {
		formModel.voucher.name = c;
	}
};

watch(
	() => props.voucher,
	(v) => {
		if (!v) return;
		formModel.voucher.code = v.code;
		formModel.voucher.description = v.description || '';
		formModel.voucher.is_disabled = v.is_disabled ?? false;
		formModel.voucher.discount_code = v.discount.code || '';
		formModel.voucher.starts_at = voucherDateToFormIso(v.starts_at);
		formModel.voucher.ends_at = voucherDateToFormIso(v.ends_at);
		formModel.voucher.usage_limit = v.usage_limit != null && v.usage_limit > 0 ? v.usage_limit : undefined;
		const nameFromApi = (v as Voucher & { name?: string }).name?.trim();
		formModel.voucher.name = nameFromApi || v.description?.trim() || v.code;
		applyDiscountToFormState(formModel.discount, v.discount);
		if (linkedBundledDiscount.value) {
			syncBundledDiscountFromVoucherForm();
		}
	},
	{ immediate: true },
);

watch(
	() => [formModel.voucher.code, formModel.voucher.description, formModel.voucher.name, formModel.voucher.is_disabled] as const,
	() => {
		if (linkedBundledDiscount.value) {
			syncBundledDiscountFromVoucherForm();
		}
	},
);

watch(
	() => formModel.voucher.discount_code,
	(code) => {
		if (linkedBundledDiscount.value) return;
		const trimmed = code?.trim();
		if (!trimmed) {
			applyDiscountToFormState(formModel.discount, props.voucher.discount);
			return;
		}
		const found = discountOptions.value.find((d) => d.code === trimmed);
		if (found) {
			applyDiscountToFormState(formModel.discount, found);
		}
	},
);

const overlay = useOverlay();
const formRef = ref();

const loadingModal = overlay.create(ZModalLoading, {
	props: { key: 'loading-voucher-update' },
});

const saving = computed(() => updating.value || discountUpdating.value);

watch(saving, (v) => {
	if (v) loadingModal.open();
	else loadingModal.close();
});

const humanizeEnum = (value: string) =>
	value
		.split('_')
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
		.join(' ');

const discTypeLabel = (rt: DiscountType) =>
	t(
		{
			[DiscountType.FIXED]: 'components.discountForm.discTypeOptionFixed',
			[DiscountType.PERCENTAGE]: 'components.discountForm.discTypeOptionPercentage',
			[DiscountType.FREE_SHIPPING]: 'components.discountForm.discTypeOptionFreeShipping',
		}[rt],
	);

const discValueCurrencyCode = 'RM';

const ruleSummaryLabel = computed(() => {
	const rt = formModel.discount.disc_type ?? DiscountType.PERCENTAGE;
	const rv = formModel.discount.disc_value;
	const typeName = discTypeLabel(rt);
	if (rt === DiscountType.PERCENTAGE) {
		return `${typeName}: ${rv}%`;
	}
	if (rt === DiscountType.FREE_SHIPPING) {
		return typeName;
	}
	return `${typeName}: ${discValueCurrencyCode} ${rv}`;
});

const allocationReviewLabel = computed(() => {
	const a = formModel.discount.allocation;
	if (a == null) return t('common.notSet');
	return humanizeEnum(a);
});

const discountUsageLimitReviewLabel = computed(() => {
	const ul = formModel.discount.usage_limit;
	if (ul != null && ul > 0) return String(ul);
	return t('components.voucherForm.usageLimitNotSet');
});

const reviewSummary = computed(() => {
	const v = formModel.voucher;
	const s = v.starts_at;
	const e = v.ends_at;
	let validityStartsAt: string | undefined;
	let validityEndsAt: string | undefined;
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
	const ul = v.usage_limit;
	const usageLimitLabel = ul != null && ul > 0 ? String(ul) : t('components.voucherForm.usageLimitNotSet');
	const codeTrim = v.code?.trim() ?? '';

	return {
		code: codeTrim,
		name: (v.name?.trim() || codeTrim) ?? '',
		description: v.description?.trim() ?? '',
		...(validityStartsAt != null ? { validityStartsAt } : {}),
		...(validityEndsAt != null ? { validityEndsAt } : {}),
		usageLimitLabel,
		discountDetails: {
			ruleSummary: ruleSummaryLabel.value,
			conditionsCount: formModel.discount.conditions?.length ?? 0,
			allocationLabel: allocationReviewLabel.value,
			discountUsageLimitLabel: discountUsageLimitReviewLabel.value,
			discountApplySummary: buildDiscountApplySummaryLine(t, {
				discType: formModel.discount.disc_type,
				discValue: formModel.discount.disc_value,
				allocation: formModel.discount.allocation,
				currencyCode: discValueCurrencyCode,
			}),
			conditionReviewItems: buildDiscountConditionReviewItems(formModel.discount.conditions, t, discValueCurrencyCode, {
				min_order_amt: formModel.discount.min_order_amt,
				max_disc_amt: formModel.discount.max_disc_amt,
			}),
		},
	};
});

const voucherFieldSectionMap: Record<string, string> = {
	code: 'section-voucher-details',
	name: 'section-voucher-details',
	description: 'section-voucher-details',
	discount_code: 'section-voucher-details',
	is_disabled: 'section-voucher-details',
	usage_limit: 'section-voucher-details',
	starts_at: 'section-voucher-validity',
	ends_at: 'section-voucher-validity',
};

const discountFieldSectionMap: Record<string, string> = {
	usage_limit: 'section-discount-rule-conditions',
	disc_type: 'section-discount-rule-conditions',
	disc_value: 'section-discount-rule-conditions',
	allocation: 'section-discount-rule-conditions',
	min_order_amt: 'section-discount-rule-conditions',
	max_disc_amt: 'section-discount-rule-conditions',
};

const resolveErrorSectionId = (errorName: string): string | undefined => {
	if (errorName.startsWith('voucher.')) {
		const field = errorName.slice('voucher.'.length).split('.')[0] ?? '';
		return voucherFieldSectionMap[field];
	}
	if (errorName.startsWith('discount.')) {
		if (errorName.includes('.conditions')) {
			return 'section-discount-rule-conditions';
		}
		const field = errorName.slice('discount.'.length).split('.')[0] ?? '';
		return discountFieldSectionMap[field];
	}
	return undefined;
};

const onError = (event: FormErrorEvent) => {
	const firstError = event.errors[0];
	const errorName = firstError?.name;
	if (!errorName) return;

	const sectionId = resolveErrorSectionId(errorName);

	if (sectionId) {
		document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	nextTick(() => {
		const errorEl = document.getElementById(errorName);
		errorEl?.focus();
	});
};

onMounted(async () => {
	discountOptionsLoading.value = true;
	try {
		discountOptions.value = await discountStore.fetchDiscountsForSelect();
	} finally {
		discountOptionsLoading.value = false;
	}
});

const mapConditionsForApi = (conditions: CreateDiscountConditionReq[]) =>
	conditions.map((c) => ({
		...(c.filter_operator != null ? { filter_operator: c.filter_operator } : {}),
		...(c.filter_condition != null ? { filter_condition: c.filter_condition } : {}),
		...(c.filter_value?.trim() ? { filter_value: c.filter_value.trim() } : {}),
	}));

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	try {
		if (linkedBundledDiscount.value) {
			syncBundledDiscountFromVoucherForm();
		}

		const { voucher: v, discount: disc } = event.data;
		const startsAt = v.ends_at && !v.starts_at ? startOfDay(new Date()).toISOString() : v.starts_at;
		const voucherBody: Partial<CreateVoucherReq> = {
			is_disabled: v.is_disabled,
			description: v.description?.trim() || undefined,
			discount_code: v.discount_code?.trim() || undefined,
			starts_at: startsAt,
			ends_at: v.ends_at,
			...(v.usage_limit != null ? { usage_limit: v.usage_limit } : {}),
		};

		const result = await voucherStore.updateVoucher(props.voucher.code, voucherBody);
		if (!result?.voucher.code) {
			return;
		}

		const selectedDiscountCode = (v.discount_code?.trim() || '').trim();
		const discountFormCode = (disc.code?.trim() || '').trim();
		if (selectedDiscountCode && selectedDiscountCode === discountFormCode) {
			const discStartsAt = disc.ends_at && !disc.starts_at ? startOfDay(new Date()).toISOString() : disc.starts_at;
			const discountBody = {
				description: disc.description.trim(),
				is_disabled: disc.is_disabled,
				starts_at: discStartsAt,
				ends_at: disc.ends_at,
				usage_limit: disc.usage_limit,
				disc_type: disc.disc_type,
				disc_value: disc.disc_value,
				...(disc.allocation != null ? { allocation: disc.allocation } : {}),
				...(disc.min_order_amt != null ? { min_order_amt: disc.min_order_amt } : {}),
				...(disc.max_disc_amt != null ? { max_disc_amt: disc.max_disc_amt } : {}),
				conditions: mapConditionsForApi(disc.conditions ?? []),
			};
			await discountStore.updateDiscount(discountFormCode, discountBody);
		}

		await navigateTo(voucherListingPathForAllocation(props.voucher.discount?.allocation ?? AllocationType.BILL));
	} catch (err: unknown | ErrorResponse) {
		const message = (err as ErrorResponse).message ?? 'Failed to update voucher';
		failedNotification(message);
	}
};

const submit = () => {
	if (linkedBundledDiscount.value) {
		syncBundledDiscountFromVoucherForm();
	}
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
