import { z } from 'zod';
import { UpdateAppointmentValidation } from '../../Appointment/Update/AppointmentValidation';

type TranslateFn = (key: string) => string;

export function UpdateOrderItemValidation(t: TranslateFn) {
	const AppointmentSchema = UpdateAppointmentValidation(t);
	return z.object({
		item_line: z.number(),
		status: z.string({ message: t('validation.order.itemStatusRequired') }),
		parent_item_line: z.number(),
		prod_code: z.string({ message: t('validation.order.prodCodeRequired') }),
		prod_name: z.string({ message: t('validation.order.prodNameRequired') }),
		prod_variant_code: z.string().optional().nullable(),
		prod_variant_name: z.string().optional().nullable(),
		prod_variant_sku: z.string().optional().nullable(),
		prod_variant_barcode: z.string().optional().nullable(),
		currency_code: z.string({ message: t('validation.order.currencyCodeRequired') }),
		qty: z.number({ message: t('validation.order.qtyRequired') }),
		unit_sell_price: z.number({ message: t('validation.order.unitSellPriceRequired') }),
		orig_sell_price: z.number().optional().nullable(),
		is_preorder: z.boolean().optional().nullable(),
		gross_amt: z.number().optional().nullable(),
		disc_amt: z.number().optional().nullable(),
		net_amt: z.number().optional().nullable(),
		gross_amt_exc: z.number().optional().nullable(),
		disc_amt_exc: z.number().optional().nullable(),
		net_amt_exc: z.number().optional().nullable(),
		tax_amt_inc: z.number().optional().nullable(),
		tax_amt_exc: z.number().optional().nullable(),
		adj_amt: z.number().optional().nullable(),
		appointment: AppointmentSchema.optional().nullable(),
	});
}
