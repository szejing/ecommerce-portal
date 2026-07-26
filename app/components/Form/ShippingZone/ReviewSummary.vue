<template>
	<UCard id="section-shipping-zone-review" class="shadow-lg border border-primary-200/60 rounded-xl scroll-mt-4">
		<template #header>
			<div class="flex items-start justify-between pb-1">
				<div class="flex-1 min-w-0">
					<div class="flex items-start gap-3">
						<UIcon :name="ICONS.CHECK_ROUNDED" class="text-primary-600 w-10 h-10 shrink-0 mt-0.5" />
						<div class="min-w-0 space-y-1">
							<h2 class="text-lg font-semibold text-default leading-snug">{{ t('components.shippingZoneForm.reviewTitle') }}</h2>
							<p class="text-sm text-muted leading-relaxed">{{ t(subtitleKey) }}</p>
						</div>
					</div>
				</div>
			</div>
		</template>

		<div class="space-y-5">
			<section class="rounded-xl bg-elevated/60 p-5 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-4 flex items-center gap-2">
					<UIcon :name="ICONS.LAYERS" class="w-4 h-4 text-primary-500 shrink-0" />
					{{ t('pages.shippingZoneReviewSection') }}
				</h4>
				<dl class="space-y-0 text-sm divide-y divide-default/10">
					<div class="py-3.5 first:pt-0 last:pb-0">
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('common.code') }}</dt>
						<dd class="font-medium text-default leading-relaxed wrap-break-word font-mono">{{ summary.code || t('common.notSet') }}</dd>
					</div>
					<div class="py-3.5 first:pt-0 last:pb-0">
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('common.description') }}</dt>
						<dd class="font-medium text-default leading-relaxed wrap-break-word">{{ summary.description || t('common.notSet') }}</dd>
					</div>
					<div class="py-3.5 first:pt-0 last:pb-0">
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('pages.shippingZoneRule') }}</dt>
						<dd class="font-medium text-default leading-relaxed wrap-break-word">{{ summary.rule }}</dd>
					</div>
					<div class="py-3.5 first:pt-0 last:pb-0">
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('common.status') }}</dt>
						<dd class="font-medium text-default leading-relaxed">{{ summary.statusLabel }}</dd>
					</div>
					<div v-if="SHIPPING_ZONE_SHOW_COUNTRY_AND_POSTCODE_FIELDS" class="py-3.5 first:pt-0 last:pb-0">
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('pages.shippingZoneCountry') }}</dt>
						<dd class="font-medium text-default leading-relaxed wrap-break-word">{{ summary.countryLabel || t('common.notSet') }}</dd>
					</div>
					<div class="py-3.5 first:pt-0 last:pb-0">
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('pages.shippingZoneState') }}</dt>
						<dd class="font-medium text-default leading-relaxed wrap-break-word">{{ summary.stateLabel || t('common.notSet') }}</dd>
					</div>
					<div v-if="SHIPPING_ZONE_SHOW_COUNTRY_AND_POSTCODE_FIELDS" class="py-3.5 first:pt-0 last:pb-0">
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('components.shippingZoneForm.reviewPostcodesLabel') }}</dt>
						<dd class="font-medium text-default leading-relaxed wrap-break-word">{{ summary.postcodesSummaryLabel }}</dd>
					</div>
					<div class="py-3.5 first:pt-0 last:pb-0">
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('components.shippingZoneForm.reviewPricingLabel') }}</dt>
						<dd v-if="pricingLines.length" class="space-y-2">
							<p
								v-for="(line, idx) in pricingLines"
								:key="idx"
								class="font-medium text-default leading-relaxed wrap-break-word pl-3 border-l-2 border-primary-400/40"
							>
								{{ line }}
							</p>
						</dd>
						<dd v-else class="font-medium text-default leading-relaxed wrap-break-word">{{ summary.pricingSummaryLabel }}</dd>
					</div>
				</dl>
			</section>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import { SHIPPING_ZONE_SHOW_COUNTRY_AND_POSTCODE_FIELDS } from '~/utils/data/malaysia-states';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

export interface ShippingZoneReviewSummary {
	code: string;
	description: string;
	rule: number;
	statusLabel: string;
	countryLabel: string;
	stateLabel: string;
	postcodesSummaryLabel: string;
	pricingSummaryLabel: string;
	methodsLabel: string;
	/** When set, each entry is shown on its own line (preferred over a single joined string). */
	pricingLines?: string[];
	/** When set, each label is shown on its own line (preferred over comma-joined `methodsLabel`). */
	methodLabels?: string[];
}

const props = withDefaults(
	defineProps<{
		summary: ShippingZoneReviewSummary;
		subtitleKey?: string;
	}>(),
	{ subtitleKey: 'components.shippingZoneForm.reviewSubtitleEdit' },
);

const pricingLines = computed(() => props.summary.pricingLines ?? []);
const methodLabels = computed(() => props.summary.methodLabels ?? []);
</script>
