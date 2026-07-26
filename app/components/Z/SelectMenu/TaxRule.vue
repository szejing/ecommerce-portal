<template>
	<USelectMenu
		v-model="tax_rule"
		v-model:search-term="searchTerm"
		:items="items"
		:search-input="{
			placeholder: 'Search tax rule…',
			icon: 'i-lucide-search',
		}"
		size="md"
		label-key="code"
		description-key="description"
		:placeholder="t('components.selectMenu.selectTaxRule')"
	>
		<template #default>
			<div v-if="tax_rule" class="flex items-center">
				<div
					class="flex items-center justify-between w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1"
				>
					<p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ tax_rule.code }}</p>
					<UIcon
						:name="ICONS.CROSS"
						class="w-4 h-4 shrink-0 text-error-500 dark:text-error-400 hover:text-error-600 dark:hover:text-error-300 transition-colors ml-2 cursor-pointer"
						@click.stop="remove"
					/>
				</div>
			</div>
			<span v-else class="text-neutral-400 text-sm">{{ t('components.selectMenu.selectTaxRule') }}</span>
		</template>
	</USelectMenu>
</template>

<script lang="ts" setup>
import type { TaxRule } from '~/utils/types/tax-rule';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const searchTerm = ref('');
const taxRuleStore = useTaxRuleStore();
const { tax_rules: items } = storeToRefs(taxRuleStore);

const props = defineProps<{ taxRule: TaxRule | string | undefined }>();

const emit = defineEmits(['update:taxRule']);

onMounted(async () => {
	if (items.value.length === 0) {
		await taxRuleStore.getTaxRules();
	}
});

const tax_rule = computed({
	get() {
		if (typeof props.taxRule === 'string') {
			return items.value.find((tax_rule) => tax_rule.code === props.taxRule);
		}

		return props.taxRule ?? undefined;
	},
	set(value) {
		emit('update:taxRule', value);
	},
});

const remove = () => {
	emit('update:taxRule', undefined);
};
</script>

<style scoped></style>
