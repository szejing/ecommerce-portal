import type { OrderItemStatus, OrderStatus } from 'yeppi-common';

type SummSaleTxnDaily = {
	biz_date: string;
	total_orders: number;
	total_qty: number;
	currency_code: string;
};

type SummOrderItemDaily = {
	prod_code: string;
	prod_name: string;
	prod_variant_code?: string;
	prod_variant_name?: string;
	total_qty: number;
	total_net_amt: number;
	currency_code: string;
};

export type SummDaily = {
	biz_date: string;
	summ_sale: SummSaleTxnDaily;
	summ_sale_item: SummOrderItemDaily;
};

export type SummCustomer = {
	customer_no: string;
	total_orders: number;
	total_spent: number;
};

export type SummProduct = {
	prod_code: string;
	prod_name: string;
	total_qty: number;
	total_net_amt: number;
};

export type SummSaleBill = {
	biz_date: Date;
	currency_code: string;
	status: OrderStatus;
	gross_amt: number;
	net_amt: number;
	disc_amt?: number;
	gross_amt_exc: number;
	net_amt_exc: number;
	tax_amt_inc?: number;
	tax_amt_exc?: number;
	void_amt?: number;
	adj_amt?: number;
	total_txns: number;
	total_qty: number;
	total_voided_qty: number;
};

export type SummSaleItem = {
	biz_date: Date;
	currency_code: string;
	item_status: OrderItemStatus;
	prod_code: string;
	prod_name: string;
	prod_variant_code?: string;
	prod_variant_name?: string;
	// parent_prod_code?: string;
	gross_amt: number;
	disc_amt?: number;
	net_amt: number;
	gross_amt_exc: number;
	disc_amt_exc?: number;
	net_amt_exc: number;
	tax_amt_inc?: number;
	tax_amt_exc?: number;
	adj_amt?: number;
	total_txns: number;
	total_qty: number;
};

export type SummSalePayment = {
	biz_date: Date;
	currency_code: string;
	status: OrderStatus;
	payment_type_code: string;
	payment_type_desc: string;
	payment_amt: number;
	local_amt: number;
	void_amt?: number;
	adj_amt?: number;
	redeem_point?: number;
	total_txns: number;
};

export type SummSaleCustomer = {
	biz_date: Date;
	customer_no: string;
	customer_name: string;
	currency_code: string;
	status: OrderStatus;
	email_address: string;
	gross_amt: number;
	net_amt: number;
	disc_amt?: number;
	gross_amt_exc: number;
	net_amt_exc: number;
	tax_amt_inc?: number;
	tax_amt_exc?: number;
	void_amt?: number;
	adj_amt?: number;
	total_txns: number;
	total_qty: number;
	total_voided_qty: number;
};

export type SummSaleShipping = {
	biz_date: Date;
	currency_code: string;
	net_amt: number;
	free_shipping_disc_amt: number;
	shipping_fee: number;
	integrator_charge: number;
	total_txns: number;
	total_qty: number;
};

export type SummSaleShippingDetail = {
	order_no: string;
	inv_no: string;
	biz_date: Date;
	currency_code: string;
	shipment_status: string;
	net_amt: number;
	free_shipping_disc_amt: number;
	shipping_fee: number;
	integrator_charge: number;
	total_qty: number;
};
