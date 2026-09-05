import type { SummSaleBill, SummSaleCustomer, SummSaleItem, SummSalePayment, SummSaleShipping, SummSaleShippingDetail } from '~/utils/types/summ-sales';
import HttpFactory from '../../factory';
import MerchantRoutes from '../../routes.client';
import type { GetDashboardSummReq } from './models/request';
import type { GetDashboardSummResp } from './models/response';
import type { BaseODataReq } from '~/repository/base/base.req';
import type { BaseODataResp } from '~/repository/base/base.resp';

class SaleSummaryModule extends HttpFactory {
	private readonly RESOURCE = MerchantRoutes.SummSales;

	/**
	 * Fetches dashboard order summary
	 * @returns
	 */
	async getDashboardSalesSummary(query: GetDashboardSummReq): Promise<GetDashboardSummResp> {
		return await this.call<GetDashboardSummResp>({
			method: 'GET',
			url: `${this.RESOURCE.Dashboard()}`,
			query,
		});
	}

	/**
	 * Fetches summ sales
	 * @returns
	 */
	async getSummSales(query: BaseODataReq): Promise<BaseODataResp<SummSaleBill>> {
		return await this.call<BaseODataResp<SummSaleBill>>({
			method: 'GET',
			url: `${this.RESOURCE.Sales()}`,
			query,
		});
	}

	/**
	 * Exports sales summary as CSV
	 * @returns
	 */
	async exportSalesSummary(query: BaseODataReq): Promise<Blob> {
		return await this.call<Blob>({
			method: 'POST',
			url: `${this.RESOURCE.Export()}`,
			query,
			fetchOptions: {
				responseType: 'blob', // Tell the HTTP client to expect a blob response
			},
		});
	}

	/**
	 * Fetches summ sales items
	 * @returns
	 */
	async getSummSalesItems(query: BaseODataReq): Promise<BaseODataResp<SummSaleItem>> {
		return await this.call<BaseODataResp<SummSaleItem>>({
			method: 'GET',
			url: `${this.RESOURCE.Items()}`,
			query,
		});
	}

	/**
	 * Exports sales items as CSV
	 * @returns
	 */
	async exportSalesItems(query: BaseODataReq): Promise<Blob> {
		return await this.call<Blob>({
			method: 'POST',
			url: `${this.RESOURCE.ExportItems()}`,
			query,
			fetchOptions: {
				responseType: 'blob', // Tell the HTTP client to expect a blob response
			},
		});
	}

	/**
	 * Fetches summ sales customers
	 * @returns
	 */
	async getSummSalesCustomers(query: BaseODataReq): Promise<BaseODataResp<SummSaleCustomer>> {
		return await this.call<BaseODataResp<SummSaleCustomer>>({
			method: 'GET',
			url: `${this.RESOURCE.Customers()}`,
			query,
		});
	}

	/**
	 * Exports sales customers as CSV
	 * @returns
	 */
	async exportSalesCustomers(query: BaseODataReq): Promise<Blob> {
		return await this.call<Blob>({
			method: 'POST',
			url: `${this.RESOURCE.ExportCustomers()}`,
			query,
			fetchOptions: {
				responseType: 'blob', // Tell the HTTP client to expect a blob response
			},
		});
	}

	/**
	 * Fetches summ sales payments
	 * @returns
	 */
	async getSummSalesPayments(query: BaseODataReq): Promise<BaseODataResp<SummSalePayment>> {
		return await this.call<BaseODataResp<SummSalePayment>>({
			method: 'GET',
			url: `${this.RESOURCE.Payments()}`,
			query,
		});
	}

	/**
	 * Exports sales payments as CSV
	 * @returns
	 */
	async exportSalesPayments(query: BaseODataReq): Promise<Blob> {
		return await this.call<Blob>({
			method: 'POST',
			url: `${this.RESOURCE.ExportPayments()}`,
			query,
			fetchOptions: {
				responseType: 'blob', // Tell the HTTP client to expect a blob response
			},
		});
	}

	async getSummSalesShipping(query: BaseODataReq): Promise<BaseODataResp<SummSaleShipping>> {
		return await this.call<BaseODataResp<SummSaleShipping>>({
			method: 'GET',
			url: `${this.RESOURCE.Shipping()}`,
			query,
		});
	}

	async exportSalesShipping(query: BaseODataReq): Promise<Blob> {
		return await this.call<Blob>({
			method: 'POST',
			url: `${this.RESOURCE.ExportShipping()}`,
			query,
			fetchOptions: {
				responseType: 'blob',
			},
		});
	}

	async getSummSalesShippingDetails(query: BaseODataReq): Promise<BaseODataResp<SummSaleShippingDetail>> {
		return await this.call<BaseODataResp<SummSaleShippingDetail>>({
			method: 'GET',
			url: `${this.RESOURCE.ShippingDetails()}`,
			query,
		});
	}

	async exportSalesShippingDetails(query: BaseODataReq): Promise<Blob> {
		return await this.call<Blob>({
			method: 'POST',
			url: `${this.RESOURCE.ExportShippingDetails()}`,
			query,
			fetchOptions: {
				responseType: 'blob',
			},
		});
	}
}

export default SaleSummaryModule;
