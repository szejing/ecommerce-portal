<template>
	<div class="space-y-6">
		<UCard id="section-courier-details" class="shadow-md scroll-mt-4">
			<template #header>
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<UIcon :name="ICONS.TRUCK" class="text-primary-500 w-6 h-6" />
							<h2 class="text-xl font-semibold">{{ t('pages.courierDetails') }}</h2>
						</div>
						<p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{{ t('components.courierForm.detailsSectionSubtitle') }}</p>
					</div>
				</div>
			</template>

			<div class="space-y-6 py-2 px-4">
				<div class="w-full flex flex-wrap items-center gap-4 justify-end">
					<UFormField name="is_active" :label="t('common.status')">
						<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.courierForm.fieldHints.status') }}</p>
						<USwitch v-model="state.is_active" :label="t(state.is_active ? 'common.active' : 'common.inactive')" />
					</UFormField>
				</div>

				<div class="grid grid-cols-1 gap-4">
					<UFormField name="name" :label="t('common.name')" required>
						<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.courierForm.fieldHints.name') }}</p>
						<UInput v-model="state.name" />
					</UFormField>

					<UFormField name="description" :label="t('common.description')">
						<p class="text-xs text-neutral-500 dark:text-neutral-400 my-1">{{ t('components.courierForm.fieldHints.description') }}</p>
						<UTextarea v-model="state.description" :rows="4" />
					</UFormField>
				</div>
			</div>
		</UCard>
	</div>
</template>

<script setup lang="ts">
import { ICONS } from '~/utils/icons';
import type { CourierFormFields } from '~/utils/types/form/courier-form';

const { t } = useI18n();

const props = defineProps<{
	state: CourierFormFields;
}>();

const state = toRef(props, 'state');
</script>
