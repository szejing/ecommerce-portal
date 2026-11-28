<template>
	<ZPagePanel id="home" :title="t('pages.home')">
		<div class="flex min-w-0 flex-col gap-3 lg:gap-4">
			<ZDateRange v-model="dashboardRange" class="w-full lg:w-fit" @update:model-value="onDashboardRangeChange" />
			<DashboardStats />
			<DashboardCustomerRequests />
			<!-- <DashboardOrderAmtChart /> -->
			<DashboardOrders :range="dashboardRange" />
		</div>
	</ZPagePanel>
</template>

<script setup lang="ts">
import { startOfWeek, endOfWeek } from 'date-fns';
import type { Range } from '~/utils/interface';

const { t } = useI18n();

useHead({ title: 'Wemotoo Portal' });

const summOrderStore = useSummOrderStore();
const orderStore = useOrderStore();

const dashboardRange = ref<Range>({
	start: startOfWeek(new Date(), { weekStartsOn: 1 }),
	end: endOfWeek(new Date(), { weekStartsOn: 1 }),
});

async function onDashboardRangeChange(range: Range) {
	await summOrderStore.getDashboardSummary(range);
	await orderStore.loadUrgentCustomerRequests(range);
}

onMounted(() => {
	summOrderStore.getDashboardSummary(dashboardRange.value);
	orderStore.loadUrgentCustomerRequests(dashboardRange.value);
});
</script>
