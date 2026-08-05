import { options_page_size } from '~/utils/options';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import type { ErrorResponse } from 'yeppi-common';
import type { Tax } from '~/utils/types/tax';
import type { TaxCreate } from '~/utils/types/form/tax/tax-creation';
import type { BaseODataReq } from '~/repository/base/base.req';
import type { UpdateTaxReq } from '~/repository/modules/taxes/models/request/update-tax.req';

type TaxFilter = {
	query: string;
	page_size: number;
	current_page: number;
};

const initialTaxFilter: TaxFilter = {
	query: '',
	page_size: options_page_size[0] as number,
	current_page: 1,
};

const initialEmptyTax: TaxCreate = {
	code: undefined,
	description: undefined,
	is_inclusive: false,
	is_active: true,
	metadata: undefined,
};

export const useTaxStore = defineStore('taxStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		exporting: false as boolean,
		filter: structuredClone(initialTaxFilter),
		taxes: [] as Tax[],
		total_taxes: 0 as number,
		new_tax: structuredClone(initialEmptyTax),
		errors: [] as string[],
	}),
	actions: {
		resetNewTax() {
			this.new_tax = structuredClone(initialEmptyTax);
		},

		async updatePageSize(size: number) {
			this.filter.page_size = size;

			if (this.filter.page_size > this.taxes.length) {
				this.filter.current_page = 1;
				return;
			}

			this.getTaxes();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;

			if (this.filter.current_page < 0 || this.taxes.length === this.total_taxes) {
				return;
			}

			this.getTaxes();
		},

		async getTaxes() {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const queryParams: BaseODataReq = {
					$top: this.filter.page_size,
					$count: true,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
					$orderby: 'updated_at desc',
				};

				if (this.filter.query) {
					queryParams.$search = this.filter.query;
				}

				const { data, '@odata.count': total } = await $api.tax.getMany(queryParams);

				if (data) {
					this.taxes = data;
					this.total_taxes = total ?? 0;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process tax';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async getTaxByCode(code: string) {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const data = await $api.tax.getSingle(code);

				return data.tax;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process tax';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async createTax() {
			this.adding = true;
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				if (!this.new_tax.code) {
					failedNotification('Tax code is required');
					return;
				}

				const data = await $api.tax.create({
					code: this.new_tax.code,
					description: this.new_tax.description ?? '',
					is_inclusive: this.new_tax.is_inclusive,
					is_active: this.new_tax.is_active,
					metadata: this.new_tax.metadata,
				});

				if (data.tax) {
					successNotification(`${this.new_tax.code} - Tax Created !`);
					this.taxes.push(data.tax);
				}
				this.resetNewTax();
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process tax';
				failedNotification(message);
			} finally {
				this.adding = false;
				this.loading = false;
			}
		},

		async updateStatus(tax: Tax, is_active: boolean) {
			await this.updateTax(tax.code, { is_active });
		},

		async updateTax(code: string, tax: Partial<UpdateTaxReq>) {
			this.updating = true;

			const { $api } = useNuxtApp();

			try {
				// Build payload with only defined fields (partial update: omit = no change)
				const body: UpdateTaxReq = {};
				if (tax.description !== undefined) body.description = tax.description;
				if (tax.is_inclusive !== undefined) body.is_inclusive = tax.is_inclusive;
				if (tax.is_active !== undefined) body.is_active = tax.is_active;
				if (tax.metadata !== undefined) body.metadata = tax.metadata;

				const data = await $api.tax.update(code, body);

				if (data.tax) {
					successNotification(`${data.tax.code} - Tax Updated !`);
					this.getTaxes();
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process tax';
				failedNotification(message);
			} finally {
				this.updating = false;
			}
		},

		async deleteTax(code: string) {
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.tax.delete({ code });

				if (data.tax.code) {
					successNotification(`Tax #${data.tax.code} Deleted !`);

					const index = this.taxes.findIndex((t) => t.code === data.tax.code);
					this.taxes.splice(index, 1);
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process tax';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},
	},
});
