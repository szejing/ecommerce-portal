import { options_page_size } from '~/utils/options';
import type { SummSaleShipping, SummSaleShippingDetail } from '~/utils/types/summ-sales';
import type { Range } from '~/utils/interface';
import { sub } from 'date-fns';

type SaleSummShipping = {
	filter: {
		date_range: Range;
		currency_code: string;
		shipment_status?: string;
		search?: string;
	};
	exporting: boolean;
	current_page: number;
	page_size: number;
	loading: boolean;
	data: SummSaleShipping[];
	details: SummSaleShippingDetail[];
	total_data: number;
};

export const initialEmptySaleSummShipping: SaleSummShipping = {
	filter: {
		date_range: {
			start: sub(new Date(), { days: 14 }),
			end: new Date(),
		},
		currency_code: 'MYR',
		shipment_status: undefined,
		search: undefined,
	},
	exporting: false,
	current_page: 1,
	page_size: options_page_size[0] as number,
	loading: false,
	data: [],
	details: [],
	total_data: 0,
};
