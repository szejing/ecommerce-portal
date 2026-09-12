<template>
	<div v-if="row.isNone" :class="compact ? 'text-start text-sm truncate' : 'text-sm'">{{ noneLabel }}</div>
	<div
		v-else
		:class="
			compact
				? 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-0.5 text-xs min-w-0 w-full text-start'
				: 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 text-sm min-w-0 w-full max-w-full'
		"
	>
		<div
			class="col-start-1 row-start-1 row-end-3 flex min-h-0 min-w-0 flex-col justify-center gap-0.5"
			:class="compact ? 'items-start py-0.5 text-start' : 'py-1'"
		>
			<div
				:class="
					compact
						? 'w-full text-start font-semibold text-neutral-900 dark:text-neutral-100 truncate'
						: 'font-semibold leading-tight text-neutral-900 dark:text-neutral-100 truncate'
				"
			>
				{{ row.code }}
			</div>
			<div
				:class="
					compact ? 'w-full text-start text-[11px] text-neutral-500 dark:text-neutral-400 truncate' : 'text-xs text-neutral-500 dark:text-neutral-400 truncate'
				"
			>
				{{ row.description || '—' }}
			</div>
		</div>
		<div class="col-start-2 row-start-1 row-end-3 flex min-h-0 shrink-0 flex-col items-end justify-center" :class="compact ? 'py-0.5' : 'py-1'">
			<div class="flex flex-wrap items-center justify-end gap-1.5">
				<UBadge v-if="row.disc_type && row.disc_type !== DiscountType.FREE_SHIPPING" color="neutral" variant="subtle" class="shrink-0 tabular-nums">
					{{ formatDiscountDiscValue(row.disc_type, row.disc_value) }}
				</UBadge>
				<UBadge v-if="row.disc_type" :color="getDiscountTypeBadgeColor(row.disc_type)" variant="subtle" class="shrink-0 capitalize">
					{{ discTypeLabel(row.disc_type) }}
				</UBadge>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { DiscountType } from 'yeppi-common';
import type { DiscountSelectMenuRow } from '~/utils/types/discount-select-menu';
import { formatDiscountDiscValue, getDiscountTypeBadgeColor } from '~/utils/discount-rule-display';

const DISC_TYPE_I18N: Record<DiscountType, string> = {
	[DiscountType.PERCENTAGE]: 'components.discountForm.discTypeOptionPercentage',
	[DiscountType.FIXED]: 'components.discountForm.discTypeOptionFixed',
	[DiscountType.FREE_SHIPPING]: 'components.discountForm.discTypeOptionFreeShipping',
};

const { t } = useI18n();

defineProps<{
	row: DiscountSelectMenuRow;
	noneLabel: string;
	compact?: boolean;
}>();

function discTypeLabel(rt: DiscountType): string {
	return t(DISC_TYPE_I18N[rt]);
}
</script>
