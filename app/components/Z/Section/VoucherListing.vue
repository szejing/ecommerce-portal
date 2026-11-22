<template>
	<ZPagePanel :id="`vouchers-${kind}-listing`" :title="title" back-to="/marketing" inline-mobile-actions>
		<template #navbar-right>
			<ZCreateButton class="hidden lg:flex" :to="createPath" :label="t('common.create')" />
			<UButton
				:to="createPath"
				color="success"
				:label="t('productMobileListing.add')"
				:aria-label="t('common.addVoucher')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
			/>
		</template>
		<template #toolbar>
			<ZSectionFilterVouchers />
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
				@update:model-value="voucherStore.updatePageSize"
				@export="exportVouchers"
			/>

			<template v-if="initialize">
				<div class="rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
					<div class="grid grid-cols-4 gap-4 p-4">
						<USkeleton v-for="i in 4" :key="i" class="h-4 flex-1 min-w-0" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-4 gap-4 p-4 items-center">
						<USkeleton v-for="j in 4" :key="j" class="h-4 flex-1 min-w-0" />
					</div>
				</div>
			</template>

			<section v-else ref="mobileList" class="lg:hidden" :aria-label="title" :aria-busy="loading">
				<ZLoading v-if="loading" />
				<UEmpty
					v-else-if="!vouchers.length"
					:icon="ICONS.ADDITIONAL"
					:title="t('pages.noVouchersFound')"
					:description="t('pages.tryAdjustingFilters')"
				/>
				<ul v-else class="divide-y divide-default border-y border-default">
					<li v-for="voucher in vouchers" :key="voucher.code">
						<ZRecordLink :to="recordPath(voucher.code)">
							<span class="block text-sm font-semibold text-highlighted">{{ voucher.code }}</span>
							<span v-if="voucher.description" class="block text-xs text-muted">{{ voucher.description }}</span>
							<span v-if="voucher.discount?.code" class="block text-xs text-muted">
								{{ t('table.linkedDiscount') }} · {{ voucher.discount.code }}
							</span>
							<template #trailing>
								<span class="text-xs text-muted tabular-nums">
									{{ t('table.usage') }} {{ voucher.usage_count || 0 }} / {{ voucher.usage_limit || '∞' }}
								</span>
								<UBadge :color="voucher.is_disabled ? 'neutral' : 'success'" variant="subtle" size="sm">
									{{ t(voucher.is_disabled ? 'common.inactive' : 'common.active') }}
								</UBadge>
							</template>
						</ZRecordLink>
					</li>
				</ul>
			</section>

			<UCard v-if="!initialize" class="hidden lg:block" :ui="{ body: 'p-0 sm:p-0' }">
				<UTable :data="vouchers" :columns="visibleColumns" :loading="loading" @select="selectVoucher">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon :name="ICONS.ADDITIONAL" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noVouchersFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<div v-if="!initialize && (vouchers.length > 0 || loading || filter.current_page > 1)" class="section-pagination flex-wrap items-center gap-2">
				<USelect
					:model-value="filter.page_size"
					:items="options_page_size"
					:aria-label="t('catalogMobile.rowsPerPage')"
					:disabled="loading"
					class="min-h-11 lg:hidden"
					@update:model-value="voucherStore.updatePageSize"
				/>
				<ZPagination :page="filter.current_page" :items-per-page="filter.page_size" :total="total_vouchers" :disabled="loading" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { resolveAllocationFromVoucherCreateType, voucherListingPathForAllocation, type VoucherCreateType } from '~/utils/voucher/create-type';
import { getVoucherColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { TableRow } from '@nuxt/ui';
import type { Voucher } from '~/utils/types/voucher';
import { options_page_size } from '~/utils/options';
import { ICONS } from '~/utils/icons';
import { useVoucherStore } from '~/stores/voucher/voucher';

const VOUCHER_COLUMN_LABELS = {
	code: 'table.code',
	discount_code: 'table.linkedDiscount',
	usage_count: 'table.usage',
	status: 'common.status',
} as const;

const props = defineProps<{ kind: VoucherCreateType }>();
const { t } = useI18n();
const title = computed(() => t(props.kind === 'shop' ? 'nav.shopVouchers' : 'nav.productVouchers'));
const allocation = resolveAllocationFromVoucherCreateType(props.kind);
const listPath = voucherListingPathForAllocation(allocation);
const createPath = `${listPath}/create`;
const voucher_columns = computed(() => getVoucherColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, VOUCHER_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(voucher_columns, columnOptions);

const voucherStore = useVoucherStore();
const { loading, vouchers, filter, total_vouchers, exporting } = storeToRefs(voucherStore);
const initialize = ref(true);
const router = useRouter();
const mobileList = useTemplateRef<HTMLElement>('mobileList');
const recordPath = (code: string) => `/marketing/vouchers/${encodeURIComponent(code)}`;
const restoreScroll = useMobileListScroll(
	`vouchers-${props.kind}-list-scroll`,
	mobileList,
	(path) => /^\/marketing\/vouchers\/[^/]+$/.test(path) && path !== '/marketing/vouchers/shop' && path !== '/marketing/vouchers/product',
);

onMounted(async () => {
	if (filter.value.listing_allocation !== allocation) {
		voucherStore.setListingAllocationFilter(allocation);
	}
	initialize.value = true;
	try {
		await voucherStore.getVouchers();
	} finally {
		initialize.value = false;
	}
	await restoreScroll();
});

const selectVoucher = async (_e: Event, row: TableRow<Voucher>) => {
	const voucher = row.original;
	if (!voucher) return;
	router.push(recordPath(voucher.code));
};

const updatePage = async (page: number) => {
	await voucherStore.updatePage(page);
};

const exportVouchers = async () => {
	// await voucherStore.exportVouchers();
};
</script>

<style scoped></style>
