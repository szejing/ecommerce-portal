<template>
	<UCard id="section-voucher-review" class="shadow-lg border border-primary-200/60 rounded-xl overflow-hidden scroll-mt-4">
		<template #header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-3">
						<UIcon :name="ICONS.CHECK_ROUNDED" class="text-primary-600 w-10 h-10" />
						<div>
							<h2 class="text-lg font-semibold text-default">{{ t('components.voucherForm.reviewTitle') }}</h2>
							<p class="text-sm text-muted mt-0.5">{{ t(subtitleKey) }}</p>
						</div>
					</div>
				</div>
			</div>
		</template>

		<div class="space-y-5">
			<section class="rounded-xl bg-elevated/60 p-4 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
					<UIcon :name="ICONS.ADDITIONAL" class="w-4 h-4 text-primary-500" />
					{{ t('pages.voucherDetails') }}
				</h4>
				<dl class="space-y-2.5 text-sm">
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('common.code') }}</dt>
						<dd class="font-medium text-default truncate text-right">{{ summary.code || t('common.notSet') }}</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('form.description') }}</dt>
						<dd class="font-medium text-default truncate text-right">{{ summary.description || t('common.notSet') }}</dd>
					</div>
					<template v-if="summary.validityStartsAt != null || summary.validityEndsAt != null">
						<div class="border-t border-default/10 space-y-2.5">
							<div v-if="summary.validityStartsAt != null" class="flex justify-between gap-2">
								<dt class="text-muted shrink-0">{{ t('components.discountForm.validityStartsAt') }}</dt>
								<dd class="font-medium text-default truncate text-right">{{ summary.validityStartsAt }}</dd>
							</div>
							<div v-if="summary.validityEndsAt != null" class="flex justify-between gap-2">
								<dt class="text-muted shrink-0">{{ t('components.discountForm.validityEndsAt') }}</dt>
								<dd class="font-medium text-default truncate text-right">{{ summary.validityEndsAt }}</dd>
							</div>
						</div>
					</template>
				</dl>
			</section>

			<section v-if="summary.discountDetails" class="rounded-xl bg-elevated/60 p-4 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
					<UIcon :name="ICONS.LAYERS" class="w-4 h-4 text-primary-500" />
					{{ t('pages.discountDetails') }}
				</h4>
				<dl class="space-y-2.5 text-sm">
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('components.discountForm.ruleSection') }}</dt>
						<dd class="font-medium text-default text-right">{{ summary.discountDetails.ruleSummary }}</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('components.discountForm.allocation') }}</dt>
						<dd class="font-medium text-default truncate text-right">{{ summary.discountDetails.allocationLabel }}</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('components.discountForm.usageLimit') }}</dt>
						<dd class="font-medium text-default truncate text-right">{{ summary.discountDetails.discountUsageLimitLabel }}</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('components.discountForm.conditionsSection') }}</dt>
						<dd class="font-medium text-default truncate text-right">
							{{ t('components.discountForm.reviewConditions', { count: summary.discountDetails.conditionsCount }) }}
						</dd>
					</div>
				</dl>
			</section>

			<section class="rounded-xl bg-elevated/60 p-4 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
					<UIcon :name="ICONS.INFO" class="w-4 h-4 text-primary-500" />
					{{ t('form.usageLimit') }}
				</h4>
				<p class="text-sm font-medium text-default">{{ summary.usageLimitLabel }}</p>
			</section>

			<section
				v-if="showPlainLanguageReview"
				class="rounded-xl bg-primary-500/5 dark:bg-primary-400/10 p-4 border border-primary-200/50 dark:border-primary-900/40"
			>
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
					<UIcon :name="ICONS.CHECK_ROUNDED" class="w-4 h-4 text-primary-600" />
					{{ t('components.voucherForm.reviewInShort') }}
				</h4>
				<div class="space-y-2.5 text-sm text-default leading-relaxed">
					<ul v-if="summary.discountDetails?.discountApplySummary" class="list-disc ps-4 space-y-1.5">
						<li class="font-medium">{{ summary.discountDetails.discountApplySummary }}</li>
					</ul>
					<template v-if="conditionReviewItems.length">
						<p class="text-xs font-semibold text-muted mt-1 mb-0.5">{{ t('components.voucherForm.reviewMustMatch') }}</p>
						<ul class="list-disc ps-4 space-y-2">
							<li v-for="(item, idx) in conditionReviewItems" :key="idx" class="text-default">
								<template v-if="item.amountText">{{ item.amountText }}</template>
								<template v-if="item.amountText && item.filter">&nbsp;</template>
								<template v-if="item.filter?.kind === 'badged'">
									<span>{{ t(item.filter.leadKey) }}</span>
									<span class="ms-1 inline-flex flex-wrap items-center gap-1.5 align-middle">
										<UBadge
											v-for="(val, bi) in item.filter.values"
											:key="`${idx}-${bi}-${val}`"
											color="primary"
											variant="solid"
											size="sm"
											class="max-w-[min(100%,12rem)] truncate font-medium shadow-sm"
										>
											{{ val }}
										</UBadge>
									</span>
									<span>.</span>
								</template>
								<template v-else-if="item.filter?.kind === 'plain'">
									<span>{{ item.filter.text }}</span>
								</template>
							</li>
						</ul>
					</template>
				</div>
			</section>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import type { ConditionReviewLineItem } from '~/utils/discount/discount-condition-review-lines';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

export interface VoucherReviewDiscountDetails {
	ruleSummary: string;
	conditionsCount: number;
	allocationLabel: string;
	discountUsageLimitLabel: string;
	/** Short sentence combining rule + allocation (e.g. "10% apply to bill."). */
	discountApplySummary?: string;
	/** Structured rows for “Must match” (amount text + filter values as badges where applicable). */
	conditionReviewItems?: ConditionReviewLineItem[];
}

export interface VoucherReviewSummary {
	code: string;
	description: string;
	/** Formatted voucher start; omit when voucher has no start (and no inferred start for display). */
	validityStartsAt?: string;
	/** Formatted voucher end; omit when voucher has no end date. */
	validityEndsAt?: string;
	usageLimitLabel: string;
	/** Present when creating/updating a voucher with an inline (bundled) discount. */
	discountDetails?: VoucherReviewDiscountDetails;
}

const props = withDefaults(
	defineProps<{
		summary: VoucherReviewSummary;
		/** i18n key for subtitle under the review title */
		subtitleKey?: string;
	}>(),
	{ subtitleKey: 'components.voucherForm.reviewSubtitleEdit' },
);

const conditionReviewItems = computed(() => props.summary.discountDetails?.conditionReviewItems ?? []);

const showPlainLanguageReview = computed(() => !!props.summary.discountDetails?.discountApplySummary || conditionReviewItems.value.length > 0);
</script>
