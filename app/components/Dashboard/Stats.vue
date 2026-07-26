<!-- eslint-disable indent -->
<template>
	<div class="relative">
		<div class="absolute top-0 right-0 z-1">
			<UPopover v-model:open="customizeOpen" :content="{ align: 'end' }">
				<UButton icon="i-heroicons-cog-6-tooth" color="neutral" variant="ghost" size="xs" :aria-label="t('pages.dashboardStatsCustomize')" />
				<template #content>
					<div class="p-3 min-w-56">
						<p class="text-xs font-medium text-muted uppercase mb-2">
							{{ t('pages.dashboardStatsCustomize') }}
						</p>
						<div class="space-y-1.5">
							<label v-for="key in ALL_DASHBOARD_STAT_KEYS" :key="key" class="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-elevated cursor-pointer">
								<UCheckbox :model-value="isSelected(key)" @update:model-value="toggleStat(key)" />
								<span class="text-sm">{{ statLabel(key) }}</span>
							</label>
						</div>
						<UButton
							class="mt-3 w-full"
							color="neutral"
							variant="soft"
							size="xs"
							:label="t('pages.dashboardStatsReset')"
							@click="
								resetToDefault();
								customizeOpen = false;
							"
						/>
					</div>
				</template>
			</UPopover>
		</div>
		<ZDashboardStats :stats="visibleStatsForGrid" />
	</div>
</template>

<script setup lang="ts">
import { formatCurrency, getFormattedDate, OrderStatus, PaymentStatus } from 'yeppi-common';
import { useDashboardStatsConfig, ALL_DASHBOARD_STAT_KEYS, type DashboardStatKey } from '~/composables/useDashboardStatsConfig';

const summOrderStore = useSummOrderStore();
const { new_appointments, new_orders, pending_payments, pending_actions, total_order_amt, new_customers, dashboard_date_range } = storeToRefs(summOrderStore);

const { t } = useI18n();
const { selectedKeys, toggleStat, isSelected, resetToDefault } = useDashboardStatsConfig();

const customizeOpen = ref(false);

function statLabel(key: DashboardStatKey): string {
	const labels: Record<DashboardStatKey, string> = {
		appointment_orders: t('pages.dashboardStatsAppointmentOrders'),
		item_orders: t('pages.dashboardStatsItemOrders'),
		pending_payments: t('pages.dashboardStatsPendingPayments'),
		pending_actions: t('pages.dashboardStatsPendingActions'),
		revenue: t('pages.dashboardStatsRevenue'),
		new_customers: t('pages.dashboardStatsNewCustomers'),
	};
	return labels[key];
}

type StatLinkQuery = {
	start_date: string;
	end_date: string;
	status?: string;
	payment_status?: string;
	payment_method?: string;
};

function dashboardQuery(extra?: Omit<StatLinkQuery, 'start_date' | 'end_date'>): StatLinkQuery | undefined {
	const range = dashboard_date_range.value;
	if (!range?.start || !range?.end) {
		return undefined;
	}
	return {
		start_date: getFormattedDate(range.start, 'yyyy-MM-dd'),
		end_date: getFormattedDate(range.end, 'yyyy-MM-dd'),
		...extra,
	};
}

const statDefs: Record<
	DashboardStatKey,
	{
		icon: string;
		to?: string;
		query?: () => StatLinkQuery | undefined;
		formatter?: (v: number) => string;
	}
> = {
	appointment_orders: {
		icon: 'i-heroicons-calendar-days',
		to: '/appointments',
		query: () => dashboardQuery(),
	},
	item_orders: {
		icon: 'i-heroicons-shopping-cart',
		to: '/orders',
		query: () =>
			dashboardQuery({
				payment_status: PaymentStatus.PAID,
			}),
	},
	pending_payments: {
		icon: 'i-heroicons-credit-card',
		to: '/orders',
		query: () =>
			dashboardQuery({
				status: OrderStatus.PENDING_PAYMENT,
				payment_method: 'CASH',
			}),
	},
	pending_actions: {
		icon: 'i-heroicons-bell',
		to: '/orders',
		query: () =>
			dashboardQuery({
				status: OrderStatus.REQUIRES_ACTION,
			}),
	},
	revenue: {
		icon: 'i-heroicons-currency-dollar',
		formatter: (v) => formatCurrency(v, total_order_amt.value?.[0]?.currency_code ?? 'MYR'),
	},
	new_customers: {
		icon: 'i-heroicons-user-plus',
		to: '/customers',
	},
};

const visibleStats = computed(() => {
	const selected = selectedKeys.value;
	return selected.map((key) => {
		const def = statDefs[key];
		let value: number;
		switch (key) {
			case 'appointment_orders':
				value = new_appointments.value ?? 0;
				break;
			case 'item_orders':
				value = new_orders.value ?? 0;
				break;
			case 'pending_payments':
				value = pending_payments.value ?? 0;
				break;
			case 'pending_actions':
				value = pending_actions.value ?? 0;
				break;
			case 'revenue': {
				const amts = total_order_amt.value ?? [];
				value = amts.reduce((acc, c) => acc + (c.total_order_amt ?? 0), 0);
				break;
			}
			case 'new_customers':
				value = new_customers.value ?? 0;
				break;
			default:
				value = 0;
		}
		const formattedValue = def.formatter ? def.formatter(value) : String(value);
		const linkQuery = def.query?.();
		const to = def.to != null && linkQuery != null ? { path: def.to, query: linkQuery } : def.to != null ? def.to : undefined;
		return {
			key,
			title: statLabel(key),
			icon: def.icon,
			to,
			formattedValue,
		};
	});
});

const visibleStatsForGrid = computed(() =>
	visibleStats.value.map((stat) => ({
		title: stat.title,
		value: stat.formattedValue,
		icon: stat.icon,
		iconBg: 'bg-primary/10',
		iconColor: 'text-primary',
		to: stat.to,
	})),
);
</script>
