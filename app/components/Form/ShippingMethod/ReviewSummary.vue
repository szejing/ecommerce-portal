<template>
	<UCard id="section-shipping-method-review" class="shadow-lg border border-primary-200/60 rounded-xl overflow-hidden scroll-mt-4">
		<template #header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-3">
						<UIcon :name="ICONS.CHECK_ROUNDED" class="text-primary-600 w-10 h-10" />
						<div>
							<h2 class="text-lg font-semibold text-default">{{ t('components.shippingMethodForm.reviewTitle') }}</h2>
							<p class="text-sm text-muted mt-0.5">{{ t(subtitleKey) }}</p>
						</div>
					</div>
				</div>
			</div>
		</template>

		<div class="space-y-5">
			<section class="rounded-xl bg-elevated/60 p-4 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
					<UIcon :name="ICONS.ORDER" class="w-4 h-4 text-primary-500" />
					{{ t('pages.shippingMethodDetails') }}
				</h4>
				<dl class="space-y-2.5 text-sm">
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('common.description') }}</dt>
						<dd class="font-medium text-default truncate text-right">{{ summary.description || t('common.notSet') }}</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('pages.shippingPriority') }}</dt>
						<dd class="font-medium text-default truncate text-right">{{ summary.priorityLabel }}</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('common.status') }}</dt>
						<dd class="font-medium text-default truncate text-right">{{ summary.statusLabel }}</dd>
					</div>
				</dl>
			</section>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

export interface ShippingMethodReviewSummary {
	description: string;
	priorityLabel: string;
	statusLabel: string;
}

withDefaults(
	defineProps<{
		summary: ShippingMethodReviewSummary;
		subtitleKey?: string;
	}>(),
	{ subtitleKey: 'components.shippingMethodForm.reviewSubtitleEdit' },
);
</script>
