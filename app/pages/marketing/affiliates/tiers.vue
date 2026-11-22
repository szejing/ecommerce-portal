<template>
	<ZPagePanel id="affiliate-tiers" :title="t('affiliate.tiers')" back-to="/marketing/affiliates">
		<div class="mobile-form-controls max-w-3xl space-y-3 lg:space-y-6">
			<UCard :ui="{ header: 'max-lg:p-3', body: 'max-lg:p-3' }">
				<template #header>
					<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{{ t('common.create') }} {{ t('affiliate.tier') }}</h2>
				</template>
				<form class="grid gap-3 sm:grid-cols-2 lg:gap-4" @submit.prevent="onCreateTier">
					<UFormField :label="t('common.name')" class="sm:col-span-2">
						<UInput v-model="newTier.name" required />
					</UFormField>
					<UFormField :label="t('affiliate.minReferrals')">
						<UInput v-model.number="newTier.min_referrals" type="number" min="0" required />
					</UFormField>
					<UFormField :label="t('affiliate.commissionPercentage')">
						<UInput v-model.number="newTier.default_commission_percentage" type="number" min="0" step="0.01" required />
					</UFormField>
					<UButton type="submit" color="primary" class="min-h-11 justify-center sm:col-span-2 sm:justify-self-start" :loading="adding">
						<UIcon v-if="!adding" :name="ICONS.ADD_OUTLINE" class="w-4 h-4" />
						{{ t('common.create') }}
					</UButton>
				</form>
			</UCard>

			<UCard :ui="{ header: 'max-lg:p-3', body: 'max-lg:p-3' }">
				<template #header>
					<h2 class="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{{ t('affiliate.tiers') }}</h2>
				</template>
				<div v-if="loading" class="space-y-2">
					<USkeleton v-for="i in 3" :key="i" class="h-10 w-full" />
				</div>
				<div v-else-if="tiers.length === 0" class="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
					{{ t('pages.noAffiliatesFound') }}
				</div>
				<template v-else>
					<ul class="divide-y divide-default lg:hidden">
						<li v-for="tier in tiers" :key="tier.id" class="flex items-center justify-between gap-2 py-2">
							<div class="min-w-0 wrap-anywhere">
								<p class="text-sm font-semibold text-highlighted">{{ tier.name }}</p>
								<p class="text-xs text-muted">{{ t('affiliate.minReferrals') }} · {{ tier.min_referrals }}</p>
								<p class="text-xs text-muted">{{ t('affiliate.commissionPercentage') }} · {{ tier.default_commission_percentage }}%</p>
							</div>
							<UButton variant="ghost" color="error" class="min-h-11 shrink-0" :loading="updating" @click="onDeleteTier(tier)">
								{{ t('common.delete') }}
							</UButton>
						</li>
					</ul>
					<div class="hidden overflow-x-auto lg:block">
						<table class="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
							<thead>
								<tr>
									<th class="px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">{{ t('common.name') }}</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">{{ t('affiliate.minReferrals') }}</th>
									<th class="px-4 py-2 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400">{{ t('affiliate.commissionPercentage') }}</th>
									<th class="px-4 py-2 w-20" />
								</tr>
							</thead>
							<tbody class="divide-y divide-neutral-200 dark:divide-neutral-700">
								<tr v-for="tier in tiers" :key="tier.id">
									<td class="px-4 py-2 text-sm text-neutral-900 dark:text-neutral-100">{{ tier.name }}</td>
									<td class="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400">{{ tier.min_referrals }}</td>
									<td class="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400">{{ tier.default_commission_percentage }}</td>
									<td class="px-4 py-2">
										<UButton variant="ghost" color="error" size="xs" :loading="updating" @click="onDeleteTier(tier)">
											{{ t('common.delete') }}
										</UButton>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</template>
			</UCard>
		</div>
	</ZPagePanel>
</template>

<script lang="ts" setup>
import type { AffiliateTier } from '~/utils/types/affiliate';
import { useAffiliateStore } from '~/stores/Affiliate/Affiliate';
import { ZModalConfirmation } from '#components';
import { ICONS } from '~/utils/icons';

const { t } = useI18n();
useHead({ title: () => t('affiliate.tiers') });

const affiliateStore = useAffiliateStore();
const overlay = useOverlay();
const { loading, adding, updating, tiers } = storeToRefs(affiliateStore);

const newTier = ref({
	name: '',
	min_referrals: 0,
	default_commission_percentage: 0,
});

const onCreateTier = async () => {
	const ok = await affiliateStore.createTier({
		name: newTier.value.name,
		min_referrals: newTier.value.min_referrals,
		default_commission_percentage: newTier.value.default_commission_percentage,
	});
	if (ok) {
		newTier.value = { name: '', min_referrals: 0, default_commission_percentage: 0 };
	}
};

const onDeleteTier = (tier: AffiliateTier) => {
	const confirmModal = overlay.create(ZModalConfirmation, {
		props: {
			message: t('modal.confirmationMessage'),
			action: 'delete',
			onConfirm: async () => {
				await affiliateStore.deleteTier(tier.id);
				confirmModal.close();
			},
			onCancel: () => confirmModal.close(),
		},
	});
	confirmModal.open();
};

onMounted(async () => {
	await affiliateStore.getTiers();
});
</script>
