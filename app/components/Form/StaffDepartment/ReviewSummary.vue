<template>
	<UCard id="section-staff-department-review" class="shadow-lg border border-primary-200/60 rounded-xl overflow-hidden scroll-mt-4">
		<template #header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-3">
						<UIcon :name="ICONS.CHECK_ROUNDED" class="text-primary-600 w-10 h-10" />
						<div>
							<h2 class="text-lg font-semibold text-default">{{ t('components.staffDepartmentForm.reviewTitle') }}</h2>
							<p class="text-sm text-muted mt-0.5">{{ t(subtitleKey) }}</p>
						</div>
					</div>
				</div>
			</div>
		</template>

		<div class="space-y-5">
			<section class="rounded-xl bg-elevated/60 p-4 border border-default/10">
				<h4 class="text-xs font-medium uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
					<UIcon :name="ICONS.USER_GROUP_ROUNDED" class="w-4 h-4 text-primary-500" />
					{{ t('pages.staffDepartmentDetails') }}
				</h4>
				<dl class="space-y-2.5 text-sm">
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('common.name') }}</dt>
						<dd class="font-medium text-default truncate text-right">{{ summary.name || t('common.notSet') }}</dd>
					</div>
					<div class="flex justify-between gap-2">
						<dt class="text-muted shrink-0">{{ t('components.crmUserForm.defaultCommissionRate') }}</dt>
						<dd class="font-medium text-default truncate text-right tabular-nums">{{ summary.commissionRateLabel }}</dd>
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

export interface StaffDepartmentReviewSummary {
	name: string;
	commissionRateLabel: string;
	statusLabel: string;
}

withDefaults(
	defineProps<{
		summary: StaffDepartmentReviewSummary;
		subtitleKey?: string;
	}>(),
	{ subtitleKey: 'components.staffDepartmentForm.reviewSubtitleEdit' },
);
</script>
