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
					discount-link-mode="pick"
					:discount-edit-to="discountEditTo"
					show-retarget-hint
				/>
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
import { AllocationType, DiscountType, getFormattedDate, type ErrorResponse } from 'yeppi-common';
import type { FormErrorEvent, FormSubmitEvent } from '#ui/types';
import { ZModalLoading } from '#components';
import type { z } from 'zod';
import type { CreateVoucherReq } from '~/repository/modules/voucher/models/request/create-voucher.req';
import type { Discount } from '~/utils/types/discount';
import { UpdateVoucherFormValidation } from '~/utils/schema';
import { buildDiscountApplySummaryLine } from '~/utils/discount/apply-summary';
import { buildDiscountConditionReviewItems } from '~/utils/discount/discount-condition-review-lines';
import type { Voucher } from '~/utils/types/voucher';
import type { VoucherFormState } from '~/utils/types/form/voucher-creation';
import { failedNotification } from '~/stores/AppUi/AppUi';
import { voucherListingPathForAllocation } from '~/utils/voucher/create-type';
import { isVoucherEditFormDirty, voucherToEditFormState } from '~/utils/voucher/form-dirty';

const { t } = useI18n();

const props = defineProps<{
	voucher: Voucher;
}>();

const dirty = defineModel<boolean>('dirty', { default: false });

const formSchema = computed(() => UpdateVoucherFormValidation(t));
type Schema = z.infer<ReturnType<typeof UpdateVoucherFormValidation>>;

const voucherStore = useVoucherStore();
const discountStore = useDiscountStore();
const { updating } = storeToRefs(voucherStore);

const discountOptions = ref<Discount[]>([]);
const discountOptionsLoading = ref(false);

const pickerAllocation = computed(() => props.voucher.discount?.allocation ?? AllocationType.BILL);

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
});

const uFormState = computed(() => formModel as unknown as Record<string, unknown>);

const discountEditTo = computed(() => {
	const code = formModel.voucher.discount_code?.trim();
	return code ? `/marketing/discounts/${code}` : undefined;
});

const loadPickerDiscounts = async () => {
	discountOptionsLoading.value = true;
	try {
		const rows = await discountStore.fetchDiscountsForSelect(pickerAllocation.value);
		const current = props.voucher.discount;
		discountOptions.value
			= current?.code && !rows.some((d) => d.code === current.code) ? [current, ...rows] : rows;
	} finally {
		discountOptionsLoading.value = false;
	}
};

watch(
	() => [props.voucher.code, props.voucher.discount?.code, pickerAllocation.value] as const,
	() => {
		void loadPickerDiscounts();
	},
	{ immediate: true },
);

watch(
	() => props.voucher,
	(v) => {
		if (!v) return;
		Object.assign(formModel.voucher, voucherToEditFormState(v));
	},
	{ immediate: true },
);

watch(
	[() => formModel.voucher, () => props.voucher],
	() => {
		dirty.value = isVoucherEditFormDirty(formModel.voucher, props.voucher);
	},
	{ deep: true, immediate: true },
);

const overlay = useOverlay();
const formRef = ref();

const loadingModal = overlay.create(ZModalLoading, {
	props: { key: 'loading-voucher-update' },
});

watch(updating, (v) => {
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

const reviewDiscount = computed(() => {
	const code = formModel.voucher.discount_code?.trim();
	if (!code) return undefined;
	return discountOptions.value.find((d) => d.code === code) ?? (props.voucher.discount?.code === code ? props.voucher.discount : undefined);
});

const ruleSummaryLabel = computed(() => {
	const d = reviewDiscount.value;
	if (!d) return t('common.notSet');
	const rt = d.disc_type ?? DiscountType.PERCENTAGE;
	const rv = d.disc_value;
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
	const a = reviewDiscount.value?.allocation;
	if (a == null) return t('common.notSet');
	return humanizeEnum(a);
});

const discountUsageLimitReviewLabel = computed(() => {
	const ul = reviewDiscount.value?.usage_limit;
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
	const d = reviewDiscount.value;

	return {
		code: codeTrim,
		name: (v.name?.trim() || codeTrim) ?? '',
		description: v.description?.trim() ?? '',
		...(validityStartsAt != null ? { validityStartsAt } : {}),
		...(validityEndsAt != null ? { validityEndsAt } : {}),
		usageLimitLabel,
		discountDetails: d
			? {
					ruleSummary: ruleSummaryLabel.value,
					conditionsCount: d.conditions?.length ?? 0,
					allocationLabel: allocationReviewLabel.value,
					discountUsageLimitLabel: discountUsageLimitReviewLabel.value,
					discountApplySummary: buildDiscountApplySummaryLine(t, {
						discType: d.disc_type,
						discValue: d.disc_value,
						allocation: d.allocation,
						currencyCode: discValueCurrencyCode,
					}),
					conditionReviewItems: buildDiscountConditionReviewItems(d.conditions, t, discValueCurrencyCode, {
						min_order_amt: d.min_order_amt,
						max_disc_amt: d.max_disc_amt,
					}),
				}
			: undefined,
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

const resolveErrorSectionId = (errorName: string): string | undefined => {
	if (errorName.startsWith('voucher.')) {
		const field = errorName.slice('voucher.'.length).split('.')[0] ?? '';
		return voucherFieldSectionMap[field];
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

const onSubmit = async (event: FormSubmitEvent<Schema>) => {
	try {
		const { voucher: v } = event.data;
		const startsAt = v.ends_at && !v.starts_at ? startOfDay(new Date()).toISOString() : v.starts_at;
		const discountCode = v.discount_code?.trim();
		if (!discountCode) {
			return;
		}
		const voucherBody: Partial<CreateVoucherReq> = {
			is_disabled: v.is_disabled,
			description: v.description?.trim() || undefined,
			discount_code: discountCode,
			starts_at: startsAt,
			ends_at: v.ends_at,
			...(v.usage_limit != null ? { usage_limit: v.usage_limit } : {}),
		};

		const result = await voucherStore.updateVoucher(props.voucher.code, voucherBody);
		if (!result?.voucher.code) {
			return;
		}

		await navigateTo(
			voucherListingPathForAllocation(reviewDiscount.value?.allocation ?? pickerAllocation.value),
		);
	} catch (err: unknown | ErrorResponse) {
		const message = (err as ErrorResponse).message ?? 'Failed to update voucher';
		failedNotification(message);
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
