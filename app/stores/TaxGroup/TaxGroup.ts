import { options_page_size } from '~/utils/options';
import { failedNotification, successNotification } from '../AppUi/AppUi';
import type { ErrorResponse } from 'yeppi-common';
import type { TaxGroup } from '~/utils/types/tax-group';
import type { TaxGroupCreate } from '~/utils/types/form/tax/tax-group-creation';

type TaxGroupFilter = {
	query: string;
	page_size: number;
	current_page: number;
};

const initialTaxGroupFilter: TaxGroupFilter = {
	query: '',
	page_size: options_page_size[0] as number,
	current_page: 1,
};

const initialEmptyTaxGroup: TaxGroupCreate = {
	code: undefined,
	description: undefined,
	tax_codes: [],
};

export const useTaxGroupStore = defineStore('taxGroupStore', {
	state: () => ({
		loading: false as boolean,
		adding: false as boolean,
		updating: false as boolean,
		exporting: false as boolean,
		tax_groups: [] as TaxGroup[],
		filter: structuredClone(initialTaxGroupFilter),
		total_tax_groups: 0 as number,
		new_tax_group: structuredClone(initialEmptyTaxGroup),
		errors: [] as string[],
	}),
	actions: {
		resetNewTaxGroup() {
			this.new_tax_group = structuredClone(initialEmptyTaxGroup);
		},

		async updatePageSize(size: number) {
			this.filter.page_size = size;

			if (this.filter.page_size > this.tax_groups.length) {
				this.filter.current_page = 1;
				return;
			}

			this.getTaxGroups();
		},

		async updatePage(page: number) {
			this.filter.current_page = page;

			if (this.filter.current_page < 0 || this.tax_groups.length === this.total_tax_groups) {
				return;
			}

			this.getTaxGroups();
		},

		async getTaxGroups() {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const { data, '@odata.count': total } = await $api.taxGroup.getMany({
					$top: this.filter.page_size,
					$count: true,
					$skip: (this.filter.current_page - 1) * this.filter.page_size,
				});

				if (data) {
					this.tax_groups = data;
					this.total_tax_groups = total ?? 0;
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process tax group';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async getTaxGroupByCode(code: string) {
			this.loading = true;
			const { $api } = useNuxtApp();
			try {
				const data = await $api.taxGroup.getSingle(code);

				return data.tax_group;
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process tax group';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},

		async createTaxGroup() {
			this.adding = true;
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				if (!this.new_tax_group.code) {
					failedNotification('Tax group code is required');
					return;
				}

				const data = await $api.taxGroup.create({
					code: this.new_tax_group.code,
					description: this.new_tax_group.description ?? '',
					tax_codes: this.new_tax_group.tax_codes ?? [],
				});

				if (data.tax_group) {
					successNotification(`${this.new_tax_group.code} - Tax Group Created !`);
					this.getTaxGroups();
				}
				this.resetNewTaxGroup();
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process tax group';
				failedNotification(message);
			} finally {
				this.adding = false;
				this.loading = false;
			}
		},

		async updateTaxGroup(code: string, taxGroup: TaxGroup) {
			this.updating = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.taxGroup.update(code, {
					description: taxGroup.description,
					taxes: taxGroup.taxes.map((t) => ({ code: t.code })),
				});

				if (data.tax_group) {
					successNotification(`Tax Group Updated !`);
					this.getTaxGroups();
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process tax group';
				failedNotification(message);
			} finally {
				this.updating = false;
			}
		},

		async deleteTaxGroup(code: string) {
			this.loading = true;

			const { $api } = useNuxtApp();

			try {
				const data = await $api.taxGroup.delete({ code });

				if (data.tax_group && data.tax_group.code == null) {
					successNotification(`Tax Group Deleted !`);
					this.tax_groups = this.tax_groups.filter((t) => t.code !== code);
				}
			} catch (err: unknown | ErrorResponse) {
				const message = (err as ErrorResponse).message ?? 'Failed to process tax group';
				failedNotification(message);
			} finally {
				this.loading = false;
			}
		},
	},
});
