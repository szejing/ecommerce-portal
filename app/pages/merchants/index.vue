<template>
	<ZPagePanel id="platform-merchants" :title="t('nav.merchants')" inline-mobile-actions>
		<template #navbar-right>
			<div class="hidden items-center gap-2 lg:flex">
				<UInput v-model="search" class="w-56" icon="i-lucide-search" :placeholder="t('platformMerchants.searchPlaceholder')" @keyup.enter="loadMerchants" />
				<UButton color="neutral" variant="soft" :loading="loading" @click="loadMerchants">
					{{ t('platformMerchants.search') }}
				</UButton>
				<UButton v-if="isSuperAdmin" color="primary" :icon="ICONS.ADD" @click="openCreate">
					{{ t('platformMerchants.create') }}
				</UButton>
			</div>
			<UButton
				v-if="isSuperAdmin"
				color="primary"
				:icon="ICONS.ADD"
				:label="t('productMobileListing.add')"
				:aria-label="t('platformMerchants.create')"
				class="min-h-11 lg:hidden"
				@click="openCreate"
			/>
		</template>

		<div class="space-y-4">
			<form class="flex items-center gap-2 lg:hidden" @submit.prevent="loadMerchants">
				<UInput
					v-model="search"
					class="min-w-0 flex-1"
					icon="i-lucide-search"
					:placeholder="t('platformMerchants.searchPlaceholder')"
					:ui="{ base: 'min-h-11 text-base' }"
				/>
				<UButton type="submit" color="neutral" variant="soft" :loading="loading" class="min-h-11 shrink-0">
					{{ t('platformMerchants.search') }}
				</UButton>
			</form>
			<div class="flex flex-wrap items-end justify-between gap-2">
				<div class="min-w-0">
					<p class="text-sm text-muted">
						{{ t('platformMerchants.subtitle') }}
					</p>
					<p v-if="!initialize && !loading" class="mt-1 text-xs text-muted">
						{{ t('platformMerchants.listCount', { n: merchants.length }) }}
						<span v-if="isSuperAdmin"> · {{ t('platformMerchants.rowClickHint') }}</span>
					</p>
				</div>
			</div>

			<template v-if="initialize">
				<div class="space-y-2 lg:hidden" role="status">
					<span class="sr-only">{{ t('common.loading') }}</span>
					<USkeleton v-for="i in 5" :key="i" class="h-16 w-full" />
				</div>
				<div class="hidden rounded-lg overflow-hidden divide-y divide-neutral-200 border border-default lg:block dark:divide-neutral-700">
					<div class="grid grid-cols-4 gap-4 bg-elevated/40 p-4">
						<USkeleton v-for="i in 4" :key="`head-${i}`" class="h-4 flex-1 min-w-0" />
					</div>
					<div v-for="i in 5" :key="`row-${i}`" class="grid grid-cols-4 items-center gap-4 p-4">
						<USkeleton v-for="j in 4" :key="j" class="h-4 flex-1 min-w-0" />
					</div>
				</div>
			</template>

			<section v-else class="lg:hidden" :aria-label="t('nav.merchants')">
				<UEmpty
					v-if="!merchants.length"
					:icon="ICONS.OUTLET"
					:title="search.trim() ? t('platformMerchants.noSearchResults') : t('platformMerchants.empty')"
					:description="search.trim() ? t('pages.tryAdjustingFilters') : undefined"
				/>
				<ul v-else class="divide-y divide-default border-y border-default">
					<li v-for="merchant in merchants" :key="merchant.merchant_id">
						<ZRecordLink v-if="isSuperAdmin" @click="openEdit(merchant)">
							<span class="block text-sm font-semibold text-highlighted">{{ merchant.name }}</span>
							<span class="block text-xs text-muted">{{ merchant.merchant_id }}</span>
							<span v-if="merchant.store_handle" class="block text-xs text-muted wrap-anywhere">{{ merchant.store_handle }}</span>
							<template #trailing>
								<UBadge color="neutral" variant="subtle" size="sm" class="whitespace-normal">
									{{ accountTypeLabel(merchant.package, t) }}
								</UBadge>
								<UBadge :color="merchant.hide_store ? 'warning' : 'success'" variant="subtle" size="sm">
									{{ merchant.hide_store ? t('platformMerchants.yes') : t('platformMerchants.no') }}
								</UBadge>
							</template>
						</ZRecordLink>
						<div v-else class="flex min-h-16 items-center gap-2 px-2 py-2.5">
							<span class="min-w-0 flex-1 wrap-anywhere">
								<span class="block text-sm font-semibold text-highlighted">{{ merchant.name }}</span>
								<span class="block text-xs text-muted">{{ merchant.merchant_id }}</span>
								<span v-if="merchant.store_handle" class="block text-xs text-muted wrap-anywhere">{{ merchant.store_handle }}</span>
							</span>
							<span class="flex max-w-1/2 flex-col items-end gap-1 text-end">
								<UBadge color="neutral" variant="subtle" size="sm">{{ accountTypeLabel(merchant.package, t) }}</UBadge>
							</span>
						</div>
					</li>
				</ul>
			</section>

			<UCard v-if="!initialize" class="hidden lg:block" :ui="{ body: 'p-0 sm:p-0', root: 'overflow-hidden' }">
				<div class="overflow-x-auto">
					<UTable :data="merchants" :columns="columns" :loading="loading" :ui="{ tr: isSuperAdmin ? 'cursor-pointer' : undefined }" :on-select="selectMerchant">
						<template #empty>
							<div class="flex flex-col items-center justify-center py-14 gap-3 px-4">
								<div class="rounded-full bg-elevated p-3">
									<UIcon :name="ICONS.OUTLET" class="size-10 text-muted" />
								</div>
								<p class="text-sm font-medium text-default">
									{{ search.trim() ? t('platformMerchants.noSearchResults') : t('platformMerchants.empty') }}
								</p>
								<p v-if="search.trim()" class="text-xs text-muted text-center max-w-sm">
									{{ t('pages.tryAdjustingFilters') }}
								</p>
							</div>
						</template>
					</UTable>
				</div>
			</UCard>
		</div>
	</ZPagePanel>
</template>

<script setup lang="ts">
import { UserRoles, type ErrorResponse } from 'yeppi-common';
import { accountTypeLabel } from '~/utils/options/account-type';
import type { TableRow } from '@nuxt/ui';
import { ZModalConfirmation, ZModalPlatformMerchantCreate, ZModalPlatformMerchantDetail } from '#components';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';
import { ICONS } from '~/utils/icons';
import { getPlatformMerchantColumns } from '~/utils/table-columns';
import type { PlatformMerchantRow } from '~/repository/modules/platform-merchant/models/response/platform-merchant.resp';
import type { CreatePlatformMerchantReq } from '~/repository/modules/platform-merchant/models/request/create-platform-merchant.req';
import { buildPlatformMerchantUpdateBody, type PlatformMerchantEditForm } from '~/utils/platform-merchant-update';

definePageMeta({
	layout: 'default',
});

const { t } = useI18n();
const { $api } = useNuxtApp();
const authStore = useAuthStore();
const overlay = useOverlay();

const isSuperAdmin = computed(() => authStore.user?.role === UserRoles.SUPER_ADMIN);

const merchants = ref<PlatformMerchantRow[]>([]);
const search = ref('');
const loading = ref(false);
const initialize = ref(true);

const copyText = async (value: string | null | undefined, label: string) => {
	if (!value) {
		failedNotification(t('platformMerchants.copyEmpty', { label }));
		return;
	}
	try {
		await navigator.clipboard.writeText(value);
		successNotification(t('platformMerchants.copied', { label }));
	} catch {
		failedNotification(t('platformMerchants.copyFailed'));
	}
};

const columns = computed(() =>
	getPlatformMerchantColumns(t, {
		onCopy: (value, label) => {
			void copyText(value, label);
		},
	}),
);

async function loadMerchants() {
	loading.value = true;
	try {
		const res = await $api.platformMerchant.list(search.value);
		merchants.value = res.merchants ?? [];
	} catch (err: unknown) {
		failedNotification((err as ErrorResponse).message ?? t('platformMerchants.loadFailed'));
	} finally {
		loading.value = false;
	}
}

const selectMerchant = (_e: Event, row: TableRow<PlatformMerchantRow>) => {
	const merchant = row.original;
	if (!merchant || !isSuperAdmin.value) return;
	openEdit(merchant);
};

const openCreate = () => {
	const createModal = overlay.create(ZModalPlatformMerchantCreate, {
		props: {
			onCreate: async (payload: CreatePlatformMerchantReq) => {
				try {
					await $api.platformMerchant.create(payload);
					successNotification(t('platformMerchants.createSuccess'));
					createModal.close();
					await loadMerchants();
				} catch (err: unknown) {
					failedNotification((err as ErrorResponse).message ?? t('platformMerchants.createFailed'));
				}
			},
			onCancel: () => {
				createModal.close();
			},
		},
	});

	createModal.open();
};

const openEdit = (merchant: PlatformMerchantRow) => {
	const editModal = overlay.create(ZModalPlatformMerchantDetail, {
		props: {
			merchant: JSON.parse(JSON.stringify(merchant)) as PlatformMerchantRow,
			onUpdate: async (form: PlatformMerchantEditForm) => {
				const wasHidden = merchant.hide_store;
				const willUnhide = wasHidden && form.hide_store === false;

				const persist = async () => {
					try {
						await $api.platformMerchant.update(merchant.merchant_id, buildPlatformMerchantUpdateBody(form));
						successNotification(t('platformMerchants.updateSuccess'));
						editModal.close();
						await loadMerchants();
					} catch (err: unknown) {
						failedNotification((err as ErrorResponse).message ?? t('platformMerchants.updateFailed'));
					}
				};

				if (!willUnhide) {
					await persist();
					return;
				}

				const confirmModal = overlay.create(ZModalConfirmation, {
					destroyOnClose: true,
					props: {
						message: t('platformMerchants.unhideConfirm'),
						action: 'confirm',
						onConfirm: async () => {
							confirmModal.close();
							await persist();
						},
						onCancel: () => {
							confirmModal.close();
						},
					},
				});
				confirmModal.open();
			},
			onCancel: () => {
				editModal.close();
			},
		},
	});

	editModal.open();
};

onMounted(async () => {
	initialize.value = true;
	try {
		await loadMerchants();
	} finally {
		initialize.value = false;
	}
});
</script>
