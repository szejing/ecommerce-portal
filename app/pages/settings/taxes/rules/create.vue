<template>
	<ZPagePanel id="taxes-rules-create" :title="t('nav.taxRules')" back-to="/settings/taxes/rules">
		<div class="flex-jbetween-icenter">
			<h2 class="my-6">Add Tax Rule</h2>
		</div>
		<div class="wrapper-grid">
			<UCard>
				<template #header>
					<h2>New Tax Rule</h2>
				</template>
				<FormTaxRuleCreation
					:adding="adding"
					:new-tax-rule="new_tax_rule"
					@create-tax-rule="createTaxRule"
					@select-detail="selectRuleDetail"
					@delete-detail="deleteRuleDetail"
				/>
			</UCard>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalTaxRuleDetail } from '#components';
import type { AmountType, FilterOperator, FilterCondition } from 'yeppi-common';
import type { TaxRuleCreate } from '~/utils/types/form/tax/tax-rule-creation';
import type { TaxRuleDetail } from '~/utils/types/tax-rule-detail';

const overlay = useOverlay();
const taxRuleStore = useTaxRuleStore();
const { new_tax_rule, adding } = storeToRefs(taxRuleStore);

const { t } = useI18n();
useHead({ title: () => t('pages.createTaxRuleTitle') });

onMounted(() => {
	taxRuleStore.resetNewTaxRule();
});

const selectRuleDetail = (detail: TaxRuleDetail | undefined) => {
	const taxRuleDetailModal = overlay.create(ZModalTaxRuleDetail, {
		props: {
			detail,
			onUpdate: async (detail: TaxRuleDetail) => {
				new_tax_rule.value.details.push({
					description: detail.description,
					tax_code: detail.tax_code,
					tax_condition: {
						tax_code: detail.tax_condition?.tax_code ?? detail.tax_code ?? '',
						starts_at: detail.tax_condition?.starts_at ? new Date(detail.tax_condition.starts_at) : undefined,
						ends_at: detail.tax_condition?.ends_at ? new Date(detail.tax_condition.ends_at) : undefined,
						amount_type: detail.tax_condition?.amount_type as AmountType,
						rate: detail.tax_condition?.rate ?? 0,
						min_amount: detail.tax_condition?.min_amount ?? 0,
						max_amount: detail.tax_condition?.max_amount ?? 0,
						filters: [],
					},
				});

				taxRuleDetailModal.close();
			},
			onDelete: async (detail: TaxRuleDetail) => {
				// deleteRuleDetail(new_tax_rule.value.details.indexOf(detail.tax_code));
				// taxRuleDetailModal.close();
			},
			onCancel: () => {
				taxRuleDetailModal.close();
			},
		},
	});

	taxRuleDetailModal.open();
};

const deleteRuleDetail = (index: number) => {
	new_tax_rule.value.details.splice(index, 1);
};

const createTaxRule = async (tax_rule: TaxRuleCreate) => {
	new_tax_rule.value = {
		code: tax_rule.code,
		description: tax_rule.description,
		details: tax_rule.details.map((detail) => ({
			description: detail.description,
			tax_code: detail.tax_code ?? undefined,
			tax_condition: {
				tax_code: detail.tax_condition?.tax_code ?? '',
				starts_at: detail.tax_condition?.starts_at ?? undefined,
				ends_at: detail.tax_condition?.ends_at ?? undefined,
				amount_type: detail.tax_condition?.amount_type as AmountType,
				rate: detail.tax_condition?.rate ?? 0,
				min_amount: detail.tax_condition?.min_amount ?? 0,
				max_amount: detail.tax_condition?.max_amount ?? 0,
				filters:
					detail.tax_condition?.filters?.map((filter) => ({
						filter_operator: filter.filter_operator as FilterOperator,
						filter_condition: filter.filter_condition as FilterCondition,
						filter_value: filter.filter_value,
					})) ?? [],
			},
		})),
	};

	await taxRuleStore.createTaxRule();
	navigateTo('/settings/taxes/rules');
};
</script>

<style scoped>
.wrapper-grid {
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	gap: 1rem;
}

@media (min-width: 640px) {
	.wrapper-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
}

.wrapper-stepper {
	width: 100%;
}

.side-wrapper {
	display: none;
	grid-column: span 1 / span 1;
}

@media (min-width: 640px) {
	.side-wrapper {
		display: block;
	}
}

h2 {
	color: var(--color-secondary-600);
	font-weight: 400;
}

.section-menu {
	background-color: white;
	box-shadow:
		0 4px 6px -1px rgb(0 0 0 / 0.1),
		0 2px 4px -2px rgb(0 0 0 / 0.1);
	padding: 0.5rem;
	border-radius: 9999px;
	text-align: center;
	display: flex;
	justify-content: center;
	align-items: center;
	color: var(--color-secondary-600);
}
</style>
