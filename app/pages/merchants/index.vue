<template>
	<ZPagePanel id="platform-merchants" :title="t('nav.merchants')">
		<template #navbar-right>
			<div class="flex flex-wrap items-center gap-2">
				<UInput
					v-model="search"
					class="w-56"
					icon="i-lucide-search"
					:placeholder="t('platformMerchants.searchPlaceholder')"
					@keyup.enter="loadMerchants"
				/>
				<UButton color="neutral" variant="soft" :loading="loading" @click="loadMerchants">
					{{ t('platformMerchants.search') }}
				</UButton>
				<UButton v-if="isSuperAdmin" color="primary" :icon="ICONS.ADD" @click="void openCreate()">
					{{ t('platformMerchants.create') }}
				</UButton>
			</div>
		</template>

		<div class="space-y-4">
			<p class="text-sm text-muted">
				{{ t('platformMerchants.subtitle') }}
			</p>

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

			<UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
				<div class="overflow-x-auto">
					<!--
						Detach onSelect while a modal is open so dismiss/focus-restore
						cannot re-fire row select (UTable sets tabindex=0 when onSelect is set).
					-->
					<UTable
						:data="merchants"
						:columns="columns"
						:loading="loading"
						:on-select="rowSelectHandler"
						:ui="{ tr: isSuperAdmin && !modalOpen ? 'cursor-pointer' : undefined }"
					>
						<template #empty>
							<div class="flex flex-col items-center justify-center py-12 gap-3">
								<UIcon :name="ICONS.ADDITIONAL" class="w-12 h-12 text-gray-400" />
								<p class="text-sm text-gray-600 dark:text-gray-400">
									{{ search.trim() ? t('platformMerchants.noSearchResults') : t('platformMerchants.empty') }}
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
import type { TableRow } from '@nuxt/ui';
import { ZModalConfirmation, ZModalPlatformMerchantCreate, ZModalPlatformMerchantDetail } from '#components';
import { failedNotification, successNotification } from '~/stores/AppUi/AppUi';
import { ICONS } from '~/utils/icons';
import { getPlatformMerchantColumns } from '~/utils/table-columns';
import type { PlatformMerchantRow } from '~/repository/modules/platform-merchant/models/response/platform-merchant.resp';
import type { CreatePlatformMerchantReq } from '~/repository/modules/platform-merchant/models/request/create-platform-merchant.req';
import {
	buildPlatformMerchantUpdateBody,
	type PlatformMerchantEditForm,
} from '~/utils/platform-merchant-update';

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
const modalOpen = ref(false);
let rowSelectResumeTimer: ReturnType<typeof setTimeout> | undefined;

const beginModalSession = () => {
	if (rowSelectResumeTimer) {
		clearTimeout(rowSelectResumeTimer);
		rowSelectResumeTimer = undefined;
	}
	modalOpen.value = true;
};

const endModalSession = () => {
	if (rowSelectResumeTimer) {
		clearTimeout(rowSelectResumeTimer);
	}
	// Keep onSelect detached until focus-restore / click-through has settled.
	rowSelectResumeTimer = setTimeout(() => {
		modalOpen.value = false;
		rowSelectResumeTimer = undefined;
	}, 400);
};

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
	if (!merchant || !isSuperAdmin.value || modalOpen.value) return;
	void openEdit(merchant);
};

const rowSelectHandler = computed(() => {
	if (!isSuperAdmin.value || modalOpen.value) return undefined;
	return selectMerchant;
});

const openCreate = async () => {
	if (modalOpen.value) return;
	beginModalSession();

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

	try {
		await createModal.open();
	} finally {
		endModalSession();
	}
};

const openEdit = async (merchant: PlatformMerchantRow) => {
	if (modalOpen.value) return;
	beginModalSession();

	const editModal = overlay.create(ZModalPlatformMerchantDetail, {
		props: {
			merchant: JSON.parse(JSON.stringify(merchant)) as PlatformMerchantRow,
			onUpdate: async (form: PlatformMerchantEditForm) => {
				const wasHidden = merchant.hide_store;
				const willUnhide = wasHidden && form.hide_store === false;

				const persist = async () => {
					try {
						await $api.platformMerchant.update(
							merchant.merchant_id,
							buildPlatformMerchantUpdateBody(form),
						);
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

	try {
		await editModal.open();
	} finally {
		endModalSession();
	}
};

onMounted(async () => {
	initialize.value = true;
	try {
		await loadMerchants();
	} finally {
		initialize.value = false;
	}
});

onBeforeUnmount(() => {
	if (rowSelectResumeTimer) {
		clearTimeout(rowSelectResumeTimer);
	}
});
</script>
