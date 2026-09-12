import { FilterCondition, FilterOperator } from 'yeppi-common';
import type { CreateDiscountConditionReq } from '../../repository/modules/discount/models/request/create-discount.req';
import { conditionHasCartFilter, formatConditionCartFilterSummary } from './condition-cart-filter-summary';
import { parseFilterValueCsv } from './filter-value-csv';

type Translate = (key: string, values?: Record<string, unknown>) => string;

const formatMoneyAmount = (n: number): string => {
	if (!Number.isFinite(n)) {
		return String(n);
	}
	const x = Math.round(n * 100) / 100;
	return x % 1 === 0 ? String(x) : x.toFixed(2);
};

export type DiscountSpendBounds = {
	min_order_amt?: number | null;
	max_disc_amt?: number | null;
};

const spendAmountSentence = (t: Translate, currency: string, bounds: DiscountSpendBounds): string => {
	const min = bounds.min_order_amt;
	const cap = bounds.max_disc_amt;
	const parts: string[] = [];
	if (min != null) {
		parts.push(
			t('components.discountForm.reviewConditionSpendMin', {
				currency,
				amount: formatMoneyAmount(min),
			}),
		);
	}
	if (cap != null) {
		parts.push(
			t('components.discountForm.reviewConditionMaxDiscCap', {
				currency,
				amount: formatMoneyAmount(cap),
			}),
		);
	}
	return parts.join(' ');
};

/** Filter copy is split so `filter_value` tokens render as badges in the review UI. */
export type ReviewFilterBadged = {
	kind: 'badged';
	leadKey: string;
	values: string[];
};

export type ReviewFilterPart = ReviewFilterBadged | { kind: 'plain'; text: string };

export type ConditionReviewLineItem = {
	amountText?: string;
	filter?: ReviewFilterPart;
};

const badgeValuesFromCsv = (vals: string[], t: Translate): string[] => {
	return vals.length > 0 ? vals : [String(t('common.notSet'))];
};

/**
 * Structured cart rule for the review panel (lead i18n + value tokens for badges).
 */
export function getConditionFilterReviewPart(cond: CreateDiscountConditionReq, t: Translate): ReviewFilterPart | null {
	if (!conditionHasCartFilter(cond)) {
		return null;
	}
	const vals = parseFilterValueCsv(cond.filter_value);
	const op = cond.filter_operator;
	const fc = cond.filter_condition;

	if (op === FilterOperator.INCLUDE) {
		switch (fc) {
			case FilterCondition.PROD_CODE:
				return { kind: 'badged', leadKey: 'components.discountForm.reviewFilterIncludeProductLead', values: badgeValuesFromCsv(vals, t) };
			case FilterCondition.CATG_CODE:
				return { kind: 'badged', leadKey: 'components.discountForm.reviewFilterIncludeCategoryLead', values: badgeValuesFromCsv(vals, t) };
			case FilterCondition.TAG_CODE:
				return { kind: 'badged', leadKey: 'components.discountForm.reviewFilterIncludeTagLead', values: badgeValuesFromCsv(vals, t) };
			case FilterCondition.TYPE:
				return { kind: 'badged', leadKey: 'components.discountForm.reviewFilterIncludeTypeLead', values: badgeValuesFromCsv(vals, t) };
			default:
				break;
		}
	}
	if (op === FilterOperator.EXCLUDE) {
		switch (fc) {
			case FilterCondition.PROD_CODE:
				return { kind: 'badged', leadKey: 'components.discountForm.reviewFilterExcludeProductLead', values: badgeValuesFromCsv(vals, t) };
			case FilterCondition.CATG_CODE:
				return { kind: 'badged', leadKey: 'components.discountForm.reviewFilterExcludeCategoryLead', values: badgeValuesFromCsv(vals, t) };
			case FilterCondition.TAG_CODE:
				return { kind: 'badged', leadKey: 'components.discountForm.reviewFilterExcludeTagLead', values: badgeValuesFromCsv(vals, t) };
			case FilterCondition.TYPE:
				return { kind: 'badged', leadKey: 'components.discountForm.reviewFilterExcludeTypeLead', values: badgeValuesFromCsv(vals, t) };
			default:
				break;
		}
	}

	const valuesStr = vals.join(', ');
	if (valuesStr && (op == null || fc == null)) {
		return { kind: 'badged', leadKey: 'components.discountForm.reviewFilterValuesOnlyLead', values: badgeValuesFromCsv(vals, t) };
	}

	const plain = formatConditionCartFilterSummary(cond, t);
	return plain ? { kind: 'plain', text: plain } : null;
}

type DiscountConditionReviewInput = {
	filter_operator?: FilterOperator | null;
	filter_condition?: FilterCondition | null;
	filter_value?: string | null;
	disc_value?: number | null;
};

const toCreateCondition = (cond: DiscountConditionReviewInput): CreateDiscountConditionReq => ({
	...(cond.filter_operator != null ? { filter_operator: cond.filter_operator } : {}),
	...(cond.filter_condition != null ? { filter_condition: cond.filter_condition } : {}),
	...(cond.filter_value != null ? { filter_value: cond.filter_value } : {}),
	...(cond.disc_value != null ? { disc_value: cond.disc_value } : {}),
});

/**
 * Review lines: optional spend bounds on the discount plus structured filter per condition row.
 */
export function buildDiscountConditionReviewItems(
	conditions: DiscountConditionReviewInput[] | undefined,
	t: Translate,
	currencyCode: string,
	spendBounds?: DiscountSpendBounds,
): ConditionReviewLineItem[] {
	const amountText = spendBounds ? spendAmountSentence(t, currencyCode, spendBounds) : '';

	if (!conditions?.length) {
		return amountText ? [{ amountText }] : [];
	}

	const items: ConditionReviewLineItem[] = [];
	let index = 0;
	for (const raw of conditions) {
		const cond = toCreateCondition(raw);
		const filter = getConditionFilterReviewPart(cond, t);
		const includeAmount = index === 0 && Boolean(amountText);
		if (includeAmount || filter) {
			items.push({
				...(includeAmount ? { amountText } : {}),
				...(filter ? { filter } : {}),
			});
		}
		index++;
	}

	if (amountText && items.length === 0) {
		return [{ amountText }];
	}

	return items;
}
