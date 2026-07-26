<template>
	<div class="space-y-6">
		<UCard id="section-shipping-method-details" class="shadow-md scroll-mt-4">
			<template #header>
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<UIcon :name="ICONS.ORDER" class="text-primary-500 w-6 h-6" />
							<h2 class="text-xl font-semibold">{{ t('pages.shippingMethodDetails') }}</h2>
						</div>
						<p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{{ t('components.shippingMethodForm.detailsSectionSubtitle') }}</p>
					</div>
				</div>
			</template>

			<div class="space-y-6 py-2 px-4">
				<div class="w-full flex flex-wrap items-center gap-4 justify-end">
					<UFormField name="is_active" :label="t('common.status')">
						<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.shippingMethodForm.fieldHints.status') }}</p>
						<USwitch v-model="state.is_active" :label="t(state.is_active ? 'common.active' : 'common.inactive')" />
					</UFormField>
				</div>

				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<UFormField name="description" :label="t('common.description')">
						<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.shippingMethodForm.fieldHints.description') }}</p>
						<UInput v-model="state.description" />
					</UFormField>

					<UFormField name="priority" :label="t('pages.shippingPriority')">
						<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.shippingMethodForm.fieldHints.priority') }}</p>
						<UInput v-model.number="state.priority" type="number" min="0" step="1" />
					</UFormField>
				</div>
			</div>
		</UCard>
	</div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons';
import type { ShippingMethodFormFields } from '~/utils/types/form/shipping-method-form';

const { t } = useI18n();

const props = withDefaults(
	defineProps<{
		state: ShippingMethodFormFields;
		/** ISO currency code for the fee field prefix (matches merchant / review formatting). */
		currencyCode?: string;
	}>(),
	{ currencyCode: 'MYR' },
);

const state = toRef(props, 'state');
</script>
