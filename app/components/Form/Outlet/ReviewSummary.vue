<template>
	<UCard id="section-outlet-review" class="shadow-lg border border-primary-200/60 rounded-xl scroll-mt-4">
		<template #header>
			<div class="flex items-start justify-between pb-1">
				<div class="flex-1 min-w-0">
					<div class="flex items-start gap-3">
						<UIcon :name="ICONS.CHECK_ROUNDED" class="text-primary-600 w-10 h-10 shrink-0 mt-0.5" />
						<div class="min-w-0 space-y-1">
							<h2 class="text-lg font-semibold text-default leading-snug">{{ t('components.outletForm.reviewTitle') }}</h2>
							<p class="text-sm text-muted leading-relaxed">{{ t(subtitleKey) }}</p>
						</div>
					</div>
				</div>
			</div>
		</template>

		<div class="space-y-5">
			<section class="rounded-xl bg-elevated/60 p-5 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-4 flex items-center gap-2">
					<UIcon :name="ICONS.OUTLET" class="w-4 h-4 text-primary-500 shrink-0" />
					{{ t('components.outletForm.reviewSectionGeneral') }}
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
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('common.phoneNo') }}</dt>
						<dd class="font-medium text-default leading-relaxed wrap-break-word">{{ summary.phoneLabel || t('common.notSet') }}</dd>
					</div>
					<div class="py-3.5 first:pt-0 last:pb-0">
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('components.outletForm.taxConfiguration') }}</dt>
						<dd class="font-medium text-default leading-relaxed wrap-break-word">{{ summary.taxRuleLabel || t('common.notSet') }}</dd>
					</div>
				</dl>
			</section>

			<section class="rounded-xl bg-elevated/60 p-5 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-4 flex items-center gap-2">
					<UIcon name="i-heroicons-map-pin" class="w-4 h-4 text-primary-500 shrink-0" />
					{{ t('components.outletForm.reviewSectionAddress') }}
				</h4>
				<dl class="space-y-0 text-sm divide-y divide-default/10">
					<div class="py-3.5 first:pt-0 last:pb-0">
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('common.address') }}</dt>
						<dd class="font-medium text-default leading-relaxed wrap-break-word whitespace-pre-line">{{ summary.addressBlock || t('common.notSet') }}</dd>
					</div>
					<div class="py-3.5 first:pt-0 last:pb-0">
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('components.outletForm.reviewCountry') }}</dt>
						<dd class="font-medium text-default leading-relaxed wrap-break-word">{{ summary.countryLabel || t('common.notSet') }}</dd>
					</div>
					<div
						v-if="!summary.hideCoordinatesAtOrigin"
						class="py-3.5 first:pt-0 last:pb-0"
						data-testid="outlet-review-coordinates"
					>
						<dt class="text-xs font-medium text-muted mb-1.5">{{ t('components.outletForm.reviewCoordinates') }}</dt>
						<dd class="space-y-2">
							<p class="font-medium text-default leading-relaxed wrap-break-word">{{ summary.coordinatesLabel || t('common.notSet') }}</p>
							<div v-if="mapEmbedSrc" class="mt-2 h-32 w-full overflow-hidden rounded-lg border border-default/20 bg-elevated">
								<iframe
									:title="t('components.outletForm.reviewMapPreviewTitle')"
									class="h-full w-full border-0"
									loading="lazy"
									referrerpolicy="no-referrer-when-downgrade"
									:src="mapEmbedSrc"
								/>
							</div>
						</dd>
					</div>
				</dl>
			</section>
		</div>
	</UCard>
</template>

<script lang="ts" setup>
import { googleMapsEmbedSrc } from '~/utils/outlet-review-map';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

export interface OutletReviewSummary {
	code: string;
	description: string;
	phoneLabel: string;
	taxRuleLabel: string;
	addressBlock: string;
	countryLabel: string;
	coordinatesLabel: string;
	/** When set (with `longitude`), map preview is shown; only from `parseOutletMapCoords` (non-zero, finite). */
	latitude?: number;
	longitude?: number;
	/** When true, lat/lng are both 0: hide coordinates row and map. */
	hideCoordinatesAtOrigin?: boolean;
}

const props = withDefaults(
	defineProps<{
		summary: OutletReviewSummary;
		subtitleKey?: string;
	}>(),
	{ subtitleKey: 'components.outletForm.reviewSubtitleEdit' },
);

const mapEmbedSrc = computed(() => {
	const { latitude, longitude } = props.summary;
	if (latitude == null || longitude == null) return null;
	if (latitude === 0 || longitude === 0) return null;
	return googleMapsEmbedSrc(latitude, longitude);
});
</script>
