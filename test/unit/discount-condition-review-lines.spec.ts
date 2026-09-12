import { describe, expect, it } from 'vitest';
import { FilterCondition, FilterOperator } from 'yeppi-common';
import type { CreateDiscountConditionReq } from '../../app/repository/modules/discount/models/request/create-discount.req';
import { buildDiscountConditionReviewItems, getConditionFilterReviewPart } from '../../app/utils/discount/discount-condition-review-lines';

const t = ((key: string, values?: Record<string, unknown>) => {
	if (key === 'components.discountForm.reviewConditionSpendMin') {
		return `Min order ${values?.currency} ${values?.amount}.`;
	}
	if (key === 'components.discountForm.reviewConditionMaxDiscCap') {
		return `Max disc ${values?.currency} ${values?.amount}.`;
	}
	if (key === 'components.discountForm.reviewFilterIncludeProductLead') return 'INCLUDE_PRODUCT_LEAD';
	if (key === 'components.discountForm.reviewFilterExcludeCategoryLead') return 'EXCLUDE_CAT_LEAD';
	if (key === 'common.notSet') return 'Not set';
	return key;
}) as (key: string, values?: Record<string, unknown>) => string;

describe('buildDiscountConditionReviewItems', () => {
	it('returns amount plus badged filter with parsed values', () => {
		const conditions: CreateDiscountConditionReq[] = [
			{
				filter_operator: FilterOperator.INCLUDE,
				filter_condition: FilterCondition.PROD_CODE,
				filter_value: 'A,B',
			},
		];
		const items = buildDiscountConditionReviewItems(conditions, t, 'RM', { min_order_amt: 10, max_disc_amt: 50 });
		expect(items).toHaveLength(1);
		expect(items[0]?.amountText).toContain('Min order RM 10');
		expect(items[0]?.amountText).toContain('Max disc RM 50');
		expect(items[0]?.filter).toEqual({
			kind: 'badged',
			leadKey: 'components.discountForm.reviewFilterIncludeProductLead',
			values: ['A', 'B'],
		});
	});

	it('skips completely empty condition rows', () => {
		const conditions: CreateDiscountConditionReq[] = [{ filter_operator: undefined, filter_condition: undefined, filter_value: '' }];
		expect(buildDiscountConditionReviewItems(conditions, t, 'RM')).toEqual([]);
	});

	it('accepts catalog discount conditions that use null instead of undefined', () => {
		expect(
			buildDiscountConditionReviewItems(
				[{ filter_operator: null, filter_condition: null, filter_value: null }],
				t,
				'RM',
			),
		).toEqual([]);
	});
});

describe('getConditionFilterReviewPart', () => {
	it('returns exclude category badged part', () => {
		const cond: CreateDiscountConditionReq = {
			filter_operator: FilterOperator.EXCLUDE,
			filter_condition: FilterCondition.CATG_CODE,
			filter_value: 'C1',
		};
		expect(getConditionFilterReviewPart(cond, t)).toEqual({
			kind: 'badged',
			leadKey: 'components.discountForm.reviewFilterExcludeCategoryLead',
			values: ['C1'],
		});
	});
});
