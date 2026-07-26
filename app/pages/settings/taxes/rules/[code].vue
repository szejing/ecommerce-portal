<template>
	<ZPagePanel id="taxes-rules" :title="t('nav.taxRules')" back-to="/settings/taxes/rules">
		<div class="wrapper-grid">
			<UCard>
				<template #header>
					<div class="flex items-center justify-between">
						<h2>Tax Rule</h2>
						<UButton size="sm" color="error" variant="ghost" class="opacity-50 hover:opacity-100" :icon="ICONS.TRASH" @click="deleteTaxRule">
							{{ t('common.delete') }}
						</UButton>
					</div>
				</template>
				<FormTaxRuleUpdate
					v-if="current_tax_rule"
					:current-tax-rule="current_tax_rule"
					@select-detail="selectDetail"
					@delete-detail="deleteDetail"
					@update="onUpdate"
				/>
				<FormTaxRuleUpdateLoading v-else />
			</UCard>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalConfirmation, ZModalTaxRuleDetail } from '#components';
import type { TaxRule } from '~/utils/types/tax-rule';
import type { TaxRuleDetail } from '~/utils/types/tax-rule-detail';
import { ICONS } from '~/utils/icons';

const taxRuleStore = useTaxRuleStore();

const current_tax_rule = ref<TaxRule | undefined>(undefined);

onMounted(async () => {
	const { code } = useRoute().params;
	const tax_rule = await taxRuleStore.getTaxRuleByCode(code as string);

	if (tax_rule) {
		current_tax_rule.value = tax_rule;
	} else {
		navigateTo('/settings/taxes/rules');
	}
});

const { t } = useI18n();
useHead({ title: () => t('pages.taxRuleDetailTitle') + (current_tax_rule.value?.code ?? '') });

const overlay = useOverlay();

const deleteTaxRule = async () => {
	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: 'Are you sure you want to delete this tax rule?',
			action: 'delete',
			onConfirm: async () => {
				await taxRuleStore.deleteTaxRule(current_tax_rule.value!.code);
				confirmModal.close();
				navigateTo('/settings/taxes/rules');
			},
			onCancel: () => {
				confirmModal.close();
			},
		},
	});

	confirmModal.open();
};

const selectDetail = (detail: TaxRuleDetail | undefined) => {
	const detailModal = overlay.create(ZModalTaxRuleDetail, {
		props: {
			detail,
			onUpdate: async (detail: TaxRuleDetail) => {
				current_tax_rule.value!.details.push(detail);
				// await taxRuleStore.updateTaxRuleDetail(detail.tax_code);
				detailModal.close();
			},
			onDelete: async (detail: TaxRuleDetail) => {
				await deleteDetail(detail);
				detailModal.close();
				// await taxRuleStore.deleteTaxRuleDetail(detail.tax_code);
			},
			onCancel: () => {
				detailModal.close();
			},
		},
	});

	detailModal.open();
};

const deleteDetail = async (_detail: TaxRuleDetail) => {
	// current_tax_rule.value.details.splice(index, 1);
};

const onUpdate = async (updated_tax_rule: TaxRule) => {
	await taxRuleStore.updateTaxRule(updated_tax_rule.code, updated_tax_rule);
	navigateTo('/settings/taxes/rules');
};
</script>

<style scoped>
.wrapper-grid {
	display: grid;
	grid-template-columns: repeat(1, minmax(0, 1fr));
	gap: 1rem;
}

@media (min-width: 768px) {
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
