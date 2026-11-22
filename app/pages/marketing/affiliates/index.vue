<template>
	<ZPagePanel id="affiliates" :title="t('nav.affiliates')" back-to="/marketing" inline-mobile-actions>
		<template #navbar-right>
			<div class="hidden items-center gap-2 lg:flex">
				<UButton variant="outline" color="neutral" @click="navigateTo('/marketing/affiliates/tiers')">
					{{ t('affiliate.tiers') }}
				</UButton>
				<ZCreateButton :label="t('affiliate.addAffiliate')" @click="createAffiliateOpen = true" />
			</div>
			<UButton
				color="success"
				:label="t('productMobileListing.add')"
				:aria-label="t('affiliate.addAffiliate')"
				class="min-h-11 min-w-11 justify-center lg:hidden"
				@click="createAffiliateOpen = true"
			/>
		</template>
		<template #toolbar>
			<div class="flex min-w-0 gap-2">
				<ZSectionFilterAffiliates />
				<UButton to="/marketing/affiliates/tiers" color="neutral" variant="outline" class="min-h-11 shrink-0 self-start lg:hidden">
					{{ t('affiliate.tiers') }}
				</UButton>
			</div>
		</template>
		<div class="flex min-w-0 flex-col gap-3 lg:gap-6">
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				desktop-columns
				:page-size-options="options_page_size"
				:export-enabled="false"
				:column-options="columnOptions"
				@update:model-value="updatePageSize"
			/>

			<template v-if="initialize">
				<div class="hidden lg:block rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
					<div class="grid grid-cols-4 gap-4 p-4">
						<USkeleton v-for="i in 4" :key="i" class="h-4 flex-1 min-w-0" />
					</div>
					<div v-for="i in 5" :key="i" class="grid grid-cols-4 gap-4 p-4 items-center">
						<USkeleton v-for="j in 4" :key="j" class="h-4 flex-1 min-w-0" />
					</div>
				</div>
			</template>

			<UCard v-else class="hidden lg:block" :ui="{ body: 'p-0 sm:p-0' }">
				<UTable :data="affiliates" :columns="visibleColumns" :loading="loading" @select="selectAffiliate">
					<template #empty>
						<div class="flex flex-col items-center justify-center py-12 gap-3">
							<UIcon name="i-heroicons-user-group" class="w-12 h-12 text-gray-400" />
							<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noAffiliatesFound') }}</p>
							<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingSearch') }}</p>
						</div>
					</template>
				</UTable>
			</UCard>

			<ZMobileRecordList
				v-slot="{ item }"
				:items="affiliates"
				item-key="id"
				:label="t('nav.affiliates')"
				:empty-title="t('pages.noAffiliatesFound')"
				:loading="initialize || loading"
				record-path-prefix="/marketing/affiliates/"
			>
				<ZRecordLink :to="`/marketing/affiliates/${encodeURIComponent(item.id)}`">
					<span class="block text-sm font-semibold text-highlighted">{{ item.slug }}</span>
					<span v-if="item.tier?.name" class="block text-xs text-muted">{{ item.tier?.name }}</span>
					<template #trailing>
						<span class="text-xs text-muted wrap-anywhere">{{ t('affiliate.referrals') }} {{ item.total_referrals_count ?? 0 }}</span>
					</template>
				</ZRecordLink>
			</ZMobileRecordList>

			<div v-if="!initialize && (affiliates.length > 0 || filter.current_page > 1)" class="section-pagination">
				<ZPagination :page="filter.current_page" :items-per-page="filter.page_size" :total="total_count" :disabled="loading" @update:page="updatePage" />
			</div>
		</div>
		<AffiliateCreationModal v-model:open="createAffiliateOpen" />
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { options_page_size } from '~/utils/options';
import { getAffiliateColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { Affiliate } from '~/utils/types/affiliate';
import type { TableRow } from '@nuxt/ui';
import { useAffiliateStore } from '~/stores/Affiliate/Affiliate';
import { ZModalLoading } from '#components';

const AFFILIATE_COLUMN_LABELS = {
	row_index: 'table.noLabel',
	slug: 'affiliate.slug',
	tier: 'affiliate.tier',
	total_referrals_count: 'affiliate.referrals',
	current_balance: 'affiliate.balance',
	created_at: 'affiliate.createdAt',
} as const;

const { t } = useI18n();
const affiliate_columns = computed(() => getAffiliateColumns(t));
const columnOptions = computed(() => columnOptionsFromLabelMap(t, AFFILIATE_COLUMN_LABELS));
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(affiliate_columns, columnOptions);
useHead({ title: () => t('pages.affiliatesTitle') });

const affiliateStore = useAffiliateStore();
const overlay = useOverlay();
const loadingModal = overlay.create(ZModalLoading, { props: { key: 'loading' } });
const { loading, updating, affiliates, filter, total_count } = storeToRefs(affiliateStore);
const createAffiliateOpen = ref(false);

watch(
	() => updating.value,
	(value: boolean) => {
		if (value) {
			loadingModal.open();
		} else {
			loadingModal.close();
		}
	},
);

const selectAffiliate = (_e: Event, row: TableRow<Affiliate>) => {
	const affiliate = row.original;
	if (!affiliate?.id) return;
	navigateTo(`/marketing/affiliates/${encodeURIComponent(affiliate.id)}`);
};

const updatePage = async (page: number) => {
	await affiliateStore.updatePage(page);
};

const updatePageSize = async (size: number) => {
	await affiliateStore.updatePageSize(size);
};

const initialize = ref(true);

onMounted(async () => {
	initialize.value = true;
	try {
		await affiliateStore.getAffiliates();
	} finally {
		initialize.value = false;
	}
});
</script>
