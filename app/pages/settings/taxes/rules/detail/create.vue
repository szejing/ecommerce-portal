<template>
	<ZPagePanel id="taxes-rules-detail-create" :title="t('nav.taxRules')" back-to="/settings/taxes/rules">
		<UEmpty
			class="max-w-lg"
			:title="t('components.taxForm.noTaxRuleDetails')"
			:description="t('components.taxForm.noTaxRuleDetailsDesc')"
		>
			<template #actions>
				<UButton to="/settings/taxes/rules/create" class="min-h-11" :label="t('common.addTaxRule')" />
			</template>
		</UEmpty>
	</ZPagePanel>
</template>

<script lang="ts" setup>
const { t } = useI18n();
</script>
