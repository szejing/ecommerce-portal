<template>
	<ZPagePanel id="payment-methods" :title="t('nav.paymentMethods')" back-to="/settings/payment">
		<template #toolbar>
			<ZSectionFilterPaymentMethods />
		</template>

		<div class="flex min-w-0 flex-col gap-3 lg:gap-6">
			<!-- Table Controls -->
			<ZTableToolbar
				v-model="filter.page_size"
				v-model:selected-column-keys="selectedColumnKeys"
				desktop-columns
				:page-size-options="options_page_size"
				:export-enabled="true"
				:exporting="exporting"
				:column-options="columnOptions"
				@update:model-value="updatePageSize"
				@export="exportPaymentMethods"
			/>

			<template v-if="initialize">
				<div class="hidden lg:block rounded-lg overflow-hidden divide-y divide-neutral-200 dark:divide-neutral-700">
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
			<UTable v-else class="hidden lg:block" :data="payment_methods" :columns="visibleColumns" :loading="loading" @select="selectPaymentMethod">
				<template #empty>
					<div class="flex flex-col items-center justify-center py-12 gap-3">
						<UIcon :name="ICONS.PAYMENT_METHODS" class="w-12 h-12 text-gray-400" />
						<p class="text-sm text-gray-600 dark:text-gray-400">{{ t('pages.noPaymentMethodsFound') }}</p>
						<p class="text-xs text-gray-500 dark:text-gray-500">{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
				</template>
			</UTable>

			<ZMobileRecordList
				v-slot="{ item }"
				:items="payment_methods"
				item-key="code"
				:label="t('nav.paymentMethods')"
				:empty-title="t('pages.noPaymentMethodsFound')"
				:loading="initialize || loading"
			>
				<ZRecordLink @click="openPaymentMethod(item)">
					<span class="block text-sm font-semibold text-highlighted">{{ item.short_desc || item.desc || item.code }}</span>
					<span v-if="item.code" class="block text-xs text-muted">{{ item.code }}</span>
					<template #trailing>
						<UBadge :color="item.is_active ? 'success' : 'neutral'" variant="subtle" size="sm">
							{{ t(item.is_active ? 'common.active' : 'common.inactive') }}
						</UBadge>
					</template>
				</ZRecordLink>
			</ZMobileRecordList>

			<div v-if="!initialize && (payment_methods.length > 0 || filter.current_page > 1)" class="section-pagination">
				<ZPagination :page="filter.current_page" :items-per-page="filter.page_size" :total="total_payment_methods" :disabled="loading" @update:page="updatePage" />
			</div>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import { ZModalLoading, ZModalPaymentMethodDetail } from '#components';
import type { TableRow } from '@nuxt/ui';
import { options_page_size } from '~/utils/options';
import type { UpdatePaymentMethodBody } from '~/repository/modules/payment-method/models/request/update-payment-method.req';
import { getPaymentMethodColumns } from '~/utils/table-columns';
import { columnOptionsFromLabelMap } from '~/utils/table-columns/visibility';
import type { PaymentMethod } from '~/utils/types/payment-method';
import { ICONS } from '~/utils/icons';

const PAYMENT_METHOD_COLUMN_LABELS = {
	is_active: 'common.status',
} as const;

const { t } = useI18n();
const payment_method_columns = computed(() => getPaymentMethodColumns(t));
const columnOptions = computed(() => [
	{ key: 'code_description', label: `${t('common.code')} / ${t('table.shortDescription')}` },
	...columnOptionsFromLabelMap(t, PAYMENT_METHOD_COLUMN_LABELS),
]);
const { selectedColumnKeys, visibleColumns } = useTableColumnVisibility(payment_method_columns, columnOptions);
useHead({ title: () => t('pages.paymentMethodsTitle') });

const overlay = useOverlay();
const paymentMethodStore = usePaymentMethodStore();
const { payment_methods, filter, total_payment_methods, loading, exporting, updating } = storeToRefs(paymentMethodStore);
const initialize = ref(true);

onMounted(async () => {
	initialize.value = true;
	try {
		await paymentMethodStore.getPaymentMethods();
	} finally {
		initialize.value = false;
	}
});
const loadingModal = overlay.create(ZModalLoading, { props: { key: 'loading' } });

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

const updatePage = async (page: number) => {
	await paymentMethodStore.updatePage(page);
};

const updatePageSize = async (size: number) => {
	await paymentMethodStore.updatePageSize(size);
};

const selectPaymentMethod = (_event: Event, row: TableRow<PaymentMethod>) => openPaymentMethod(row.original);

const openPaymentMethod = async (paymentMethod: PaymentMethod) => {
	const paymentMethodModal = overlay.create(ZModalPaymentMethodDetail, {
		props: {
			paymentMethod: JSON.parse(JSON.stringify(paymentMethod)),
			onUpdate: async (payload: UpdatePaymentMethodBody) => {
				await paymentMethodStore.updatePaymentMethod(paymentMethod.code, payload);
				paymentMethodModal.close();
			},
			onCancel: () => {
				paymentMethodModal.close();
			},
		},
	});

	paymentMethodModal.open();
};

const exportPaymentMethods = async () => {
	await paymentMethodStore.exportPaymentMethods();
};
</script>

<style scoped></style>
