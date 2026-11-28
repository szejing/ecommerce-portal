<template>
	<ZPagePanel id="discounts-listing" :title="t('nav.discounts')" back-to="/marketing" inline-mobile-actions>
		<template #navbar-right>
			<ZCreateButton class="hidden lg:flex" to="/marketing/discounts/create" :label="t('common.addDiscount')" />
			<UButton
				to="/marketing/discounts/create"
				color="success"
				:label="t('productMobileListing.add')"
				:aria-label="t('common.addDiscount')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
			/>
		</template>
		<template #toolbar>
			<ZSectionFilterDiscounts />
		</template>

		<div class="space-y-3 lg:space-y-6">
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				class="hidden lg:flex"
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="discountStore.updatePageSize"
				@export="exportDiscounts"
			/>

			<template v-if="initialize">
				<div class="rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
					<div class="grid grid-cols-[1fr_auto] gap-4 p-4">
						<USkeleton class="h-4 w-24" />
						<USkeleton class="h-4 w-16" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-[1fr_auto] gap-4 p-4 items-center">
						<USkeleton class="h-4 w-40" />
						<USkeleton class="h-4 w-12" />
					</div>
				</div>
			</template>
			<section v-else ref="mobileList" class="lg:hidden" :aria-label="t('nav.discounts')" :aria-busy="loading">
				<ZLoading v-if="loading" />
				<UEmpty
					v-else-if="!discounts.length"
					:icon="ICONS.ADDITIONAL"
					:title="t('pages.noDiscountsFound')"
					:description="t('pages.tryAdjustingFilters')"
				/>
				<ul v-else class="divide-y divide-default border-y border-default">
					<li v-for="discount in discounts" :key="discount.code">
						<ZRecordLink :to="recordPath(discount.code)">
							<span class="block text-sm font-semibold text-highlighted">{{ discount.code }}</span>
							<span v-if="discount.description" class="block text-xs text-muted">{{ discount.description }}</span>
							<template #trailing>
								<span class="text-sm font-medium tabular-nums">
									{{ discount.disc_type === DiscountType.FREE_SHIPPING ? t('components.discountForm.discTypeOptionFreeShipping') : formatDiscountDiscValue(discount.disc_type, discount.disc_value) }}
								</span>
								<UBadge :color="discount.is_disabled ? 'neutral' : 'success'" variant="subtle" size="sm">
									{{ t(discount.is_disabled ? 'common.inactive' : 'common.active') }}
								</UBadge>
							</template>
						</ZRecordLink>
					</li>
				</ul>
			</section>

			<UCard v-if="!initialize" class="hidden lg:block" :ui="{ body: 'p-0 sm:p-0' }">
				<UTable :data="discounts" :columns="visibleColumns" :loading="loading" @select="selectDiscount">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.ADDITIONAL" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noDiscountsFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<!-- Pagination -->
			<div v-if="!initialize && (discounts.length > 0 || loading || filter.current_page > 1)" class="section-pagination flex-wrap items-center gap-2">
				<USelect
					:model-value="filter.page_size"
					:items="options_page_size"
					:aria-label="t('catalogMobile.rowsPerPage')"
					:disabled="loading"
					class="min-h-11 lg:hidden"
					@update:model-value="discountStore.updatePageSize"
				/>
				<ZPagination :page="filter.current_page" :items-per-page="filter.page_size" :total="total_discounts" :disabled="loading" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { DiscountType } from 'yeppi-common';
import { formatDiscountDiscValue } from '~/utils/discount-rule-display';
import { getDiscountColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { TableRow } from '@nuxt/ui';
import type { Discount } from '~/utils/types/discount';
import { options_page_size } from '~/utils/options';
import { ICONS } from '~/utils/icons';

const DISCOUNT_COLUMN_LABELS = {
	code: 'table.code',
	disc_type: 'table.rule',
	allocation: 'table.allocation',
	usage_count: 'table.usage',
	is_disabled: 'table.active',
} as const;

const { t } = useI18n();
const discount_columns = computed(() => getDiscountColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, DISCOUNT_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(discount_columns, columnOptions);
useHead({ title: () => t('pages.discountsTitle') });

const discountStore = useDiscountStore();
const { loading, discounts, filter, total_discounts, exporting } = storeToRefs(discountStore);
const initialize = ref(true);
const router = useRouter();
const mobileList = useTemplateRef<HTMLElement>('mobileList');
const recordPath = (code: string) => `/marketing/discounts/${encodeURIComponent(code)}`;
const restoreScroll = useMobileListScroll(
	'discounts-list-scroll',
	mobileList,
	(path) => /^\/marketing\/discounts\/[^/]+$/.test(path) && path !== '/marketing/discounts/create',
);

onMounted(async () => {
	initialize.value = true;
	try {
		await discountStore.getDiscounts();
	} finally {
		initialize.value = false;
	}
	await restoreScroll();
});

const selectDiscount = async (e: Event, row: TableRow<Discount>) => {
	const discount = row.original;
	if (!discount) return;
	router.push(recordPath(discount.code));
};

const updatePage = async (page: number) => {
	await discountStore.updatePage(page);
};

const exportDiscounts = async () => {
	// await discountStore.exportDiscounts();
};
</script>

<style scoped></style>
