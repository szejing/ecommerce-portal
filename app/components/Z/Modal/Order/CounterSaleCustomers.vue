<template>
	<UModal
		:title="t('pages.counterSaleAllCustomers')"
		:close="{ onClick: () => settle(undefined) }"
		:ui="{
			content: 'w-[calc(100vw-1rem)] max-w-lg',
			body: 'max-lg:px-3 overflow-hidden',
			footer: 'max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))]',
		}"
		@update:open="onOpenChange"
	>
		<template #body>
			<div class="flex max-h-[min(70vh,32rem)] flex-col gap-3">
				<UInput
					v-model="query"
					type="search"
					icon="i-heroicons-magnifying-glass"
					:loading="loading"
					:placeholder="t('pages.counterSaleFindCustomer')"
					:aria-label="t('pages.counterSaleFindCustomer')"
					@update:model-value="onSearch"
				/>
				<div class="min-h-0 flex-1 overflow-y-auto" :aria-busy="loading">
					<ul v-if="loading" class="space-y-2" :aria-hidden="true">
						<li v-for="row in 8" :key="row" class="space-y-2 rounded-lg border border-default p-3">
							<USkeleton class="h-4 w-2/5" />
							<USkeleton class="h-3 w-1/3" />
						</li>
					</ul>
					<div v-else-if="showEmpty" class="py-10 text-center">
						<p class="text-sm text-muted">{{ t('pages.noCustomersFound') }}</p>
						<p v-if="query.trim()" class="mt-1 text-xs text-muted">{{ t('pages.tryAdjustingFilters') }}</p>
					</div>
					<ul v-else class="overflow-hidden rounded-lg border border-default bg-default" :aria-label="t('pages.counterSaleAllCustomers')">
						<li v-for="row in rows" :key="rowKey(row)" class="border-b border-default last:border-b-0">
							<p v-if="row.kind === 'letter'" class="sticky top-0 z-10 bg-elevated px-3 py-1.5 text-xs font-semibold tracking-wide text-muted">
								{{ row.letter }}
							</p>
							<UButton
								v-else
								color="neutral"
								variant="ghost"
								block
								class="h-auto min-h-14 justify-start rounded-none px-3 py-2 text-left"
								@click="settle(row.customer)"
							>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-sm font-semibold text-highlighted">{{ row.customer.name || row.customer.phone_no }}</span>
									<span v-if="customerPhone(row.customer)" class="block text-xs text-muted">{{ customerPhone(row.customer) }}</span>
								</span>
							</UButton>
						</li>
					</ul>
				</div>
			</div>
		</template>
		<template v-if="total > PAGE_SIZE" #footer>
			<div class="flex w-full justify-center lg:justify-end">
				<ZPagination v-model:page="page" :items-per-page="PAGE_SIZE" :total="total" :disabled="loading" />
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
import type { Customer } from '~/utils/types/customer';
import { counterSaleErrorMessage } from '~/utils/counter-sale';
import { failedNotification } from '~/stores/AppUi/AppUi';

type DirectoryRow = { kind: 'letter'; letter: string } | { kind: 'customer'; customer: Customer };

const PAGE_SIZE = 50;

const emit = defineEmits<{
	close: [customer: Customer | undefined];
}>();

const { t } = useI18n();
const { $api } = useNuxtApp();

const query = ref('');
const customers = ref<Customer[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const loaded = ref(false);
let settled = false;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let generation = 0;

const showEmpty = computed(() => loaded.value && !loading.value && !customers.value.length);

const rows = computed<DirectoryRow[]>(() => {
	const next: DirectoryRow[] = [];
	let previous = '';
	for (const customer of customers.value) {
		const letter = customerLetter(customer);
		if (letter !== previous) {
			next.push({ kind: 'letter', letter });
			previous = letter;
		}
		next.push({ kind: 'customer', customer });
	}
	return next;
});

function settle(customer: Customer | undefined) {
	if (settled) return;
	settled = true;
	emit('close', customer);
}

function onOpenChange(open: boolean) {
	if (!open) settle(undefined);
}

function customerPhone(customer: Customer) {
	if (!customer.phone_no) return '';
	return customer.dial_code ? `+${customer.dial_code} ${customer.phone_no}` : customer.phone_no;
}

function customerLetter(customer: Customer) {
	const first = (customer.name ?? '').trim().charAt(0).toLocaleUpperCase();
	return first || '#';
}

function rowKey(row: DirectoryRow) {
	return row.kind === 'letter' ? `letter-${row.letter}` : row.customer.customer_no;
}

async function load() {
	const current = ++generation;
	const term = query.value.trim();
	customers.value = [];
	loaded.value = false;
	loading.value = true;
	try {
		const response = await $api.customer.getMany({
			$top: PAGE_SIZE,
			$skip: (page.value - 1) * PAGE_SIZE,
			$count: true,
			$orderby: 'name asc,customer_no asc',
			...(term ? { $search: term } : {}),
		});
		if (current !== generation) return;
		customers.value = response.data ?? [];
		total.value = response['@odata.count'] ?? response.count ?? customers.value.length;
		loaded.value = true;
	} catch (error) {
		if (current !== generation) return;
		customers.value = [];
		total.value = 0;
		loaded.value = true;
		failedNotification(counterSaleErrorMessage(error, t('pages.counterSaleNothingSaved')));
	} finally {
		if (current === generation) loading.value = false;
	}
}

function onSearch() {
	clearTimeout(searchTimer);
	searchTimer = setTimeout(() => {
		if (page.value !== 1) {
			page.value = 1;
			return;
		}
		void load();
	}, 300);
}

watch(page, () => {
	void load();
});

onMounted(() => {
	void load();
});

onUnmounted(() => {
	clearTimeout(searchTimer);
	generation += 1;
});
</script>
