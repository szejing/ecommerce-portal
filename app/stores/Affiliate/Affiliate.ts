import { defineStore } from 'pinia';
import { KEY, type ErrorResponse } from 'yeppi-common';
import { options_page_size } from '~/utils/options';
import type { Affiliate, AffiliateTier, AffiliateReport } from '~/utils/types/affiliate';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import type { BaseODataReq } from '~/repository/base/base.req';
import type { CreateAffiliateReq } from '~/repository/modules/affiliate/request/create-affiliate.req';
import type { CreateAffiliateTierReq } from '~/repository/modules/affiliate/request/create-tier.req';
import type { PatchAffiliateTierReq } from '~/repository/modules/affiliate/request/patch-tier.req';
import { useAuthStore } from '..';

type AffiliateFilter = {
	query: string;
	page_size: number;
	current_page: number;
};

const initialFilter: AffiliateFilter = {
	query: '',
	page_size: options_page_size[0] as number,
	current_page: 1,
};

export const useAffiliateStore = defineStore('affiliateStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		affiliates: [] as Affiliate[],
		total_count: 0 as number,
		current_affiliate: undefined as Affiliate | undefined,
		tiers: [] as AffiliateTier[],
		report: undefined as AffiliateReport | undefined,
		filter: initialFilter,
	}),
	actions: {
		async updatePageSize(size: number) {
			this.filter.page_size = size;
			if (this.filter.page_size > this.affiliates.length) {
				this.filter.current_page = 1;
				return;
			}
			await this.getAffiliates();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;
			if (this.filter.current_page < 1 || this.affiliates.length === this.total_count) {
				return;
			}
			await this.getAffiliates();
		},

		async getAffiliates() {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$orderby: 'created_at desc',
				};
				if (this.filter.query?.trim()) {
					queryParams.$search = this.filter.query.trim();
				}

				const resp = await $api.affiliate.getMany(queryParams);
				const data = resp.data ?? [];
				const total = resp['@odata.count'] ?? 0;

				this.affiliates = data;
				this.total_count = total;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load affiliates';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async getAffiliateById(id: string): Promise<Affiliate | null> {
			const { $api } = useNuxtApp();
			this.loading = true;
			try {
				const resp = await $api.affiliate.getById(id);
				this.current_affiliate = resp.affiliate;
				return resp.affiliate;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load affiliate';
				failedNotification(message);
				return null;
			} finally {
				this.loading = false;
			}
		},

		async getAffiliateBySlug(slug: string): Promise<Affiliate | null> {
			const { $api } = useNuxtApp();
			this.loading = true;
			try {
				const resp = await $api.affiliate.getBySlug(slug);
				this.current_affiliate = resp.affiliate;
				return resp.affiliate;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load affiliate';
				failedNotification(message);
				return null;
			} finally {
				this.loading = false;
			}
		},

		async createAffiliate(body: CreateAffiliateReq): Promise<boolean> {
			const { $api } = useNuxtApp();
			const merchantId = useCookie(KEY.X_MERCHANT_ID);
			const authStore = useAuthStore();
			this.adding = true;
			try {
				const payload: CreateAffiliateReq = {
					...body,
					merchant_id: merchantId.value ?? undefined,
					user: authStore.user ? { id: authStore.user.id } : undefined,
				};
				const resp = await $api.affiliate.create(payload);
				if (resp?.affiliate) {
					successNotification('Affiliate created');
					await this.getAffiliates();
					return true;
				}
				return false;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to create affiliate';
				failedNotification(message);
				return false;
			} finally {
				this.adding = false;
			}
		},

		async getTiers() {
			const { $api } = useNuxtApp();
			this.loading = true;
			try {
				const resp = await $api.affiliate.getTiers();
				this.tiers = resp.tiers ?? [];
				return this.tiers;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load tiers';
				failedNotification(message);
				return [];
			} finally {
				this.loading = false;
			}
		},

		async createTier(body: CreateAffiliateTierReq): Promise<boolean> {
			const { $api } = useNuxtApp();
			const merchantId = useCookie(KEY.X_MERCHANT_ID);
			const authStore = useAuthStore();
			this.adding = true;
			try {
				const payload: CreateAffiliateTierReq = {
					...body,
					merchant_id: merchantId.value ?? undefined,
					user: authStore.user ? { id: authStore.user.id } : undefined,
				};
				const resp = await $api.affiliate.createTier(payload);
				if (resp?.tier) {
					successNotification(`${resp.tier.name} - Tier created`);
					await this.getTiers();
					return true;
				}
				return false;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to create tier';
				failedNotification(message);
				return false;
			} finally {
				this.adding = false;
			}
		},

		async updateTier(id: number, body: PatchAffiliateTierReq): Promise<boolean> {
			const { $api } = useNuxtApp();
			const merchantId = useCookie(KEY.X_MERCHANT_ID);
			const authStore = useAuthStore();
			this.updating = true;
			try {
				const payload: PatchAffiliateTierReq = {
					...body,
					merchant_id: merchantId.value ?? undefined,
					user: authStore.user ? { id: authStore.user.id } : undefined,
				};
				const resp = await $api.affiliate.updateTier(id, payload);
				if (resp?.tier) {
					successNotification(`${resp.tier.name} - Tier updated`);
					await this.getTiers();
					return true;
				}
				return false;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to update tier';
				failedNotification(message);
				return false;
			} finally {
				this.updating = false;
			}
		},

		async deleteTier(id: number): Promise<boolean> {
			const { $api } = useNuxtApp();
			const merchantId = useCookie(KEY.X_MERCHANT_ID);
			const authStore = useAuthStore();
			this.updating = true;
			try {
				await $api.affiliate.deleteTier(id, {
					merchant_id: merchantId.value ?? undefined,
					user: authStore.user ? { id: authStore.user.id } : undefined,
				});
				successNotification('Tier deleted');
				await this.getTiers();
				return true;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to delete tier';
				failedNotification(message);
				return false;
			} finally {
				this.updating = false;
			}
		},

		async getMyReport(): Promise<AffiliateReport | null> {
			const { $api } = useNuxtApp();
			const authStore = useAuthStore();
			this.loading = true;
			try {
				const resp = await $api.affiliate.getMyReport(authStore.user ? { user: { id: authStore.user.id } } : undefined);
				this.report = resp.report;
				return resp.report;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to load report';
				failedNotification(message);
				return null;
			} finally {
				this.loading = false;
			}
		},
	},
});
