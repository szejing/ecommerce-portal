<template>
	<div class="w-full">
		<UForm ref="formRef" :schema="formSchema" :state="uFormState" class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6" @submit="onSubmit" @error="onError">
			<div class="lg:col-span-9 space-y-6">
				<UCard class="shadow-md">
					<div class="px-4 py-3 space-y-2">
						<p class="text-sm font-medium">{{ t('components.voucherForm.discountSource') }}</p>
						<URadioGroup v-model="linkMode" :items="discountSourceItems" value-key="value" />
					</div>
				</UCard>

				<ZInputVoucherDetailsSection
					:state="voucherSectionState"
					form-field-prefix="voucher"
					:discounts="discountOptions"
					:none-label="t('components.discountForm.filterNone')"
					:discount-options-loading="discountOptionsLoading"
					:discount-link-mode="linkMode"
				/>

				<ZInputDiscountRuleAndConditionsSection v-if="linkMode === 'create'" :state="new_discount" form-field-prefix="discount" lock-allocation />
			</div>
			<div class="lg:col-span-3">
				<div class="lg:sticky lg:top-4">
					<FormVoucherReviewSummary :summary="voucherReviewSummary" />
				</div>
			</div>
		</UForm>
	</div>
</template>

<script lang="ts" setup>
import { startOfDay } from 'date-fns';
import { type AllocationType, DiscountType, getFormattedDate } from 'yeppi-common';
import type { FormErrorEvent, FormSubmitEvent } from '#ui/types';
import { ZModalLoading } from '#components';
import type { z } from 'zod';
import type { CreateVoucherReq } from '~/repository/modules/voucher/models/request/create-voucher.req';
import type { CreateDiscountReq } from '~/repository/modules/discount/models/request/create-discount.req';
import { useDiscountStore } from '~/stores/discount/discount';
import { useVoucherStore } from '~/stores/voucher/voucher';
import { CreateBundledVoucherFormValidation, CreatePickedVoucherFormValidation } from '~/utils/schema';
import { buildDiscountApplySummaryLine } from '~/utils/discount/apply-summary';
import { buildDiscountConditionReviewItems } from '~/utils/discount/discount-condition-review-lines';
import type { Discount } from '~/utils/types/discount';
import type { VoucherFormState } from '~/utils/types/form/voucher-creation';

const props = withDefaults(
	defineProps<{
		/** Discount allocation (shop=bill, product=item). */
		allocation?: AllocationType;
		/** Route after successful create (shop vs product listing). */
		postCreateListPath: string;
	}>(),
	{},
);

const { t } = useI18n();

type BundledSchema = z.infer<ReturnType<typeof CreateBundledVoucherFormValidation>>;
type PickedSchema = z.infer<ReturnType<typeof CreatePickedVoucherFormValidation>>;

const linkMode = ref<'create' | 'pick'>('create');
const discountOptions = ref<Discount[]>([]);
const discountOptionsLoading = ref(false);

const discountSourceItems = computed(() => [
	{ label: t('components.voucherForm.createNewDiscount'), value: 'create' },
	{ label: t('components.voucherForm.useExistingDiscount'), value: 'pick' },
]);

const formSchema = computed(() =>
	linkMode.value === 'create' ? CreateBundledVoucherFormValidation(t) : CreatePickedVoucherFormValidation(t),
);

const voucherStore = useVoucherStore();
const discountStore = useDiscountStore();
const { adding, new_voucher } = storeToRefs(voucherStore);
const { new_discount } = storeToRefs(discountStore);

const bundledFormModel = reactive({
	voucher: new_voucher,
	discount: new_discount,
});

/** UForm state is store-backed; cast for schema-aligned UForm generics. */
const uFormState = computed((): Record<string, unknown> => bundledFormModel as unknown as Record<string, unknown>);

const voucherSectionState = computed(() => toValue(bundledFormModel.voucher) as VoucherFormState);

const router = useRouter();
const overlay = useOverlay();
const formRef = ref();

const loadingModal = overlay.create(ZModalLoading, {
	props: { key: 'loading-voucher' },
});

watch(adding, (v) => {
	if (v) loadingModal.open();
	else loadingModal.close();
});

const voucherFieldSectionMap: Record<string, string> = {
	code: 'section-voucher-details',
	description: 'section-voucher-details',
	discount_code: 'section-voucher-details',
	is_disabled: 'section-voucher-details',
	usage_limit: 'section-voucher-details',
	starts_at: 'section-voucher-validity',
	ends_at: 'section-voucher-validity',
};

const bundledDiscountFieldSectionMap: Record<string, string> = {
	usage_limit: 'section-discount-rule-conditions',
	disc_type: 'section-discount-rule-conditions',
	disc_value: 'section-discount-rule-conditions',
	allocation: 'section-discount-rule-conditions',
	min_order_amt: 'section-discount-rule-conditions',
	max_disc_amt: 'section-discount-rule-conditions',
};

const humanizeEnum = (value: string) =>
	value
		.split('_')
		.map((p) => p.charAt(0).toUpperCase() + p.slice(1))
		.join(' ');

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
		return bundledDiscountFieldSectionMap[field];
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

const discTypeLabel = (rt: DiscountType) =>
	t(
		{
			[DiscountType.FIXED]: 'components.discountForm.discTypeOptionFixed',
			[DiscountType.PERCENTAGE]: 'components.discountForm.discTypeOptionPercentage',
			[DiscountType.FREE_SHIPPING]: 'components.discountForm.discTypeOptionFreeShipping',
		}[rt],
	);

const discValue = 'RM';

const applyAllocation = () => {
	if (props.allocation == null) {
		return;
	}
	new_discount.value.allocation = props.allocation;
};

const reviewDiscount = computed(() => {
	if (linkMode.value === 'pick') {
		const code = new_voucher.value.discount_code?.trim();
		return discountOptions.value.find((d) => d.code === code);
	}
	return new_discount.value;
});

const ruleSummaryLabel = computed(() => {
	const source = reviewDiscount.value;
	if (!source) return t('common.notSet');
	const rt = source.disc_type ?? DiscountType.PERCENTAGE;
	const rv = source.disc_value;
	const typeName = discTypeLabel(rt);
	if (rt === DiscountType.PERCENTAGE) {
		return `${typeName}: ${rv}%`;
	}
	if (rt === DiscountType.FREE_SHIPPING) {
		return typeName;
	}
	return `${typeName}: ${discValue} ${rv}`;
});

const allocationReviewLabel = computed(() => {
	const a = reviewDiscount.value?.allocation ?? new_discount.value.allocation;
	if (a == null) return t('common.notSet');
	return humanizeEnum(a);
});

const discountUsageLimitReviewLabel = computed(() => {
	const ul = reviewDiscount.value?.usage_limit ?? new_discount.value.usage_limit;
	if (ul != null && ul > 0) return String(ul);
	return t('components.voucherForm.usageLimitNotSet');
});

const voucherReviewSummary = computed(() => {
	const v = new_voucher.value;
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

	const ul = reviewDiscount.value?.usage_limit ?? new_discount.value.usage_limit;
	const usageLimitLabel = ul != null && ul > 0 ? String(ul) : t('components.voucherForm.usageLimitNotSet');

	const codeTrim = v.code?.trim() ?? '';

	const base = {
		code: codeTrim,
		description: v.description?.trim() ?? '',
		...(validityStartsAt != null ? { validityStartsAt } : {}),
		...(validityEndsAt != null ? { validityEndsAt } : {}),
		usageLimitLabel,
	};

	return {
		...base,
		discountDetails: reviewDiscount.value
			? {
					ruleSummary: ruleSummaryLabel.value,
					conditionsCount: reviewDiscount.value.conditions?.length ?? 0,
					allocationLabel: allocationReviewLabel.value,
					discountUsageLimitLabel: discountUsageLimitReviewLabel.value,
					discountApplySummary: buildDiscountApplySummaryLine(t, {
						discType: reviewDiscount.value.disc_type,
						discValue: reviewDiscount.value.disc_value,
						allocation: reviewDiscount.value.allocation,
						currencyCode: discValue,
					}),
					conditionReviewItems: buildDiscountConditionReviewItems(reviewDiscount.value.conditions, t, discValue, {
						min_order_amt: reviewDiscount.value.min_order_amt,
						max_disc_amt: reviewDiscount.value.max_disc_amt,
					}),
				}
			: undefined,
	};
});

/** Copy voucher identity onto bundled discount state; discount validity dates stay unset. */
const syncBundledDiscountFromVoucher = () => {
	const c = new_voucher.value.code?.trim() ?? '';
	const desc = new_voucher.value.description?.trim() || c;
	new_discount.value.code = c;
	new_discount.value.description = desc;
	new_discount.value.starts_at = undefined;
	new_discount.value.ends_at = undefined;
	new_discount.value.is_disabled = new_voucher.value.is_disabled ?? false;
	new_voucher.value.discount_code = c;
};

watch([() => new_voucher.value.code, () => new_voucher.value.description, () => new_voucher.value.is_disabled], () => {
	if (linkMode.value === 'create') {
		syncBundledDiscountFromVoucher();
	}
});

watch(linkMode, async (mode) => {
	if (mode === 'create') {
		syncBundledDiscountFromVoucher();
		applyAllocation();
		return;
	}
	new_voucher.value.discount_code = '';
	await loadPickerDiscounts();
});

watch(
	() => props.allocation,
	async () => {
		applyAllocation();
		if (linkMode.value === 'pick') {
			new_voucher.value.discount_code = '';
			await loadPickerDiscounts();
		}
	},
);

const loadPickerDiscounts = async () => {
	if (props.allocation == null) {
		discountOptions.value = [];
		return;
	}
	discountOptionsLoading.value = true;
	try {
		discountOptions.value = await discountStore.fetchDiscountsForSelect(props.allocation);
	} finally {
		discountOptionsLoading.value = false;
	}
};

onMounted(async () => {
	voucherStore.resetNewVoucher();
	discountStore.resetNewDiscount();
	syncBundledDiscountFromVoucher();
	applyAllocation();
});

const buildBundledCreateDiscountPayload = (data: BundledSchema['discount']): CreateDiscountReq => {
	const conditions = (data.conditions ?? []).map((c) => ({
		...(c.filter_operator != null ? { filter_operator: c.filter_operator } : {}),
		...(c.filter_condition != null ? { filter_condition: c.filter_condition } : {}),
		...(c.filter_value?.trim() ? { filter_value: c.filter_value.trim() } : {}),
	}));

	const codeTrim = new_voucher.value.code?.trim() ?? '';
	const description = new_voucher.value.description?.trim() || codeTrim;

	return {
		code: codeTrim,
		description,
		is_disabled: new_voucher.value.is_disabled ?? false,
		usage_limit: data.usage_limit,
		disc_type: data.disc_type,
		disc_value: data.disc_value,
		...(data.allocation != null ? { allocation: data.allocation } : {}),
		...(data.min_order_amt != null ? { min_order_amt: data.min_order_amt } : {}),
		...(data.max_disc_amt != null ? { max_disc_amt: data.max_disc_amt } : {}),
		...(conditions.length > 0 ? { conditions } : {}),
	};
};

const onSubmit = async (event: FormSubmitEvent<BundledSchema | PickedSchema>) => {
	try {
		const d = event.data.voucher;
		const startsAt = d.ends_at && !d.starts_at ? startOfDay(new Date()).toISOString() : d.starts_at;
		const codeTrim = d.code.trim();

		if (linkMode.value === 'pick') {
			const discountCode = d.discount_code?.trim();
			if (!discountCode) {
				return;
			}
			const payload: CreateVoucherReq = {
				code: codeTrim,
				description: d.description?.trim(),
				is_disabled: d.is_disabled,
				discount_code: discountCode,
				starts_at: startsAt,
				ends_at: d.ends_at,
			};
			const created = await voucherStore.createVoucher(payload);
			if (created?.voucher.code) {
				router.push(props.postCreateListPath);
			}
			return;
		}

		const disc = (event.data as BundledSchema).discount;
		const pendingDiscount = buildBundledCreateDiscountPayload(disc);
		const { code: _omit, ...discountBody } = pendingDiscount;

		const payload: CreateVoucherReq = {
			code: codeTrim,
			description: d.description?.trim(),
			is_disabled: d.is_disabled,
			discount_code: codeTrim,
			starts_at: startsAt,
			ends_at: d.ends_at,
			...(disc.usage_limit != null ? { usage_limit: disc.usage_limit } : {}),
			discount: discountBody,
		};

		const created = await voucherStore.createVoucher(payload);
		if (created?.voucher.code) {
			router.push(props.postCreateListPath);
		}
	} catch {
		// store handles error toast
	}
};

const submit = () => {
	if (linkMode.value === 'create') {
		syncBundledDiscountFromVoucher();
		applyAllocation();
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
