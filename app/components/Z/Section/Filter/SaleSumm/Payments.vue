<template>
  <div class="w-full">
    <!-- Compact Filter Grid -->
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3 items-center"
    >
      <!-- Date Range Filter -->
      <div class="flex flex-col col-span-full gap-1.5">
        <label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{
          t("components.filter.dateRange")
        }}</label>
        <ZDateRange
          v-model="filter.date_range"
          @update:model-value="handleDateRangeChange"
        />
      </div>

      <!-- Sale Status Filter -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{
          t("components.filter.orderStatus")
        }}</label>
        <ZSelectMenuOrderStatus
          v-model:status="filter.status"
          @update:model-value="handleStatusChange"
        />
      </div>

      <!-- Payment Status Filter -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{
          t("components.filter.paymentStatus")
        }}</label>
        <ZSelectMenuPaymentStatus
          v-model:payment-status="filter.payment_status"
          @update:model-value="handlePaymentStatusChange"
        />
      </div>

      <!-- Currency Filter -->
      <!-- <div class="flex flex-col gap-1.5">
				<label class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ t('components.filter.currency') }}</label>
				<ZSelectMenuCurrency v-model:currency-code="filter.currency_code" @update:model-value="handleCurrencyChange" />
			</div> -->

      <!-- Actions -->
      <div class="flex flex-col gap-1.5 col-span-full">
        <div class="flex gap-2">
          <UButton
            variant="outline"
            color="neutral"
            :disabled="is_loading"
            @click="clearFilters"
          >
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4" />
            {{ t("components.filter.clear") }}
          </UButton>
          <UButton
            color="primary"
            :disabled="is_loading"
            :loading="is_loading"
            @click="search"
          >
            <UIcon :name="ICONS.SEARCH_ROUNDED" class="w-4 h-4" />
            {{ t("components.filter.search") }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Active Filters Display -->
    <div v-if="hasActiveFilters" class="flex flex-wrap gap-2 items-center">
      <span class="text-xs text-gray-600 dark:text-gray-400">{{
        t("components.filter.activeFilters")
      }}</span>
      <UBadge
        v-if="filter.date_range.start || filter.date_range.end"
        color="primary"
        variant="subtle"
        size="sm"
        @click="clearFilter('date')"
      >
        {{ t("components.filter.date") }}:
        {{ formatDateRange(filter.date_range) }}
        <UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
      </UBadge>
      <UBadge
        v-if="filter.status"
        color="success"
        variant="subtle"
        size="sm"
        @click="clearFilter('status')"
      >
        {{ t("components.filter.status") }}:
        {{ capitalizeFirstLetter(filter.status) }}
        <UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
      </UBadge>
      <UBadge
        v-if="filter.payment_status"
        color="info"
        variant="subtle"
        size="sm"
        @click="clearFilter('payment_status')"
      >
        {{ t("components.filter.paymentStatus") }}:
        {{ capitalizeFirstLetter(filter.payment_status) }}
        <UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
      </UBadge>
      <UBadge
        v-if="filter.currency_code && filter.currency_code !== 'MYR'"
        color="warning"
        variant="subtle"
        size="sm"
        @click="clearFilter('currency')"
      >
        {{ t("components.filter.currency") }}: {{ filter.currency_code }}
        <UIcon name="i-heroicons-x-mark" class="w-3 h-3 ml-1 cursor-pointer" />
      </UBadge>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { Range } from "~/utils/interface";
import { format } from "date-fns";
import { ICONS } from '~/utils/icons';

const { t } = useI18n();

const saleSummStore = useSummSaleStore();
const { sale_summ_payments } = storeToRefs(saleSummStore);
const filter = computed(() => sale_summ_payments.value.filter);

const is_loading = computed(() => sale_summ_payments.value.loading);

const hasActiveFilters = computed(() => {
  return (
    filter.value.date_range.start ||
    filter.value.date_range.end ||
    filter.value.status ||
    filter.value.payment_status ||
    (filter.value.currency_code && filter.value.currency_code !== "MYR")
  );
});

const formatDateRange = (range: Range) => {
  if (!range) return "";
  const startDate = range.start
    ? format(new Date(range.start), "dd/MM/yyyy")
    : "";
  const endDate = range.end ? format(new Date(range.end), "dd/MM/yyyy") : "";
  if (startDate && endDate) {
    return `${startDate} - ${endDate}`;
  }
  return startDate || endDate;
};

const search = async () => {
  await saleSummStore.getSalePaymentSummary();
};

const handleDateRangeChange = async (newValue: Range) => {
  filter.value.date_range.start = newValue.start
    ? new Date(newValue.start)
    : new Date();
  filter.value.date_range.end = newValue.end
    ? new Date(newValue.end)
    : undefined;
  await search();
};

const handleStatusChange = async () => {
  await search();
};

const handlePaymentStatusChange = async () => {
  await search();
};

const handleCurrencyChange = async () => {
  await search();
};

const clearFilters = async () => {
  filter.value.date_range.start = new Date();
  filter.value.date_range.end = undefined;
  filter.value.status = undefined;
  filter.value.payment_status = undefined;
  filter.value.currency_code = "MYR";
  sale_summ_payments.value.current_page = 1;
  await search();
};

const clearFilter = async (filterKey: string) => {
  if (filterKey === "date") {
    filter.value.date_range.start = new Date();
    filter.value.date_range.end = undefined;
  } else if (filterKey === "status") {
    filter.value.status = undefined;
  } else if (filterKey === "payment_status") {
    filter.value.payment_status = undefined;
  } else if (filterKey === "currency") {
    filter.value.currency_code = "MYR";
  }
  await search();
};
</script>

<style scoped></style>
