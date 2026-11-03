import HttpFactory from '~/repository/factory';
import MerchantRoutes from '~/repository/routes.client';
import type { CreatePlatformMerchantReq } from './models/request/create-platform-merchant.req';
import type { UpdatePlatformMerchantReq } from './models/request/update-platform-merchant.req';
import type {
	PlatformMerchantListResp,
	PlatformMerchantResp,
} from './models/response/platform-merchant.resp';

export type { CreatePlatformMerchantReq } from './models/request/create-platform-merchant.req';
export type { UpdatePlatformMerchantReq } from './models/request/update-platform-merchant.req';
export type {
	PlatformMerchantListResp,
	PlatformMerchantResp,
	PlatformMerchantRow,
} from './models/response/platform-merchant.resp';

class PlatformMerchantModule extends HttpFactory {
	private readonly routes = MerchantRoutes.PlatformMerchants;

	async list(q?: string): Promise<PlatformMerchantListResp> {
		return await this.call<PlatformMerchantListResp>({
			method: 'GET',
			url: this.routes.Many(),
			query: q?.trim() ? { q: q.trim() } : undefined,
		});
	}

	async create(body: CreatePlatformMerchantReq): Promise<PlatformMerchantResp> {
		return await this.call<PlatformMerchantResp>({
			method: 'POST',
			url: this.routes.Many(),
			body,
		});
	}

	async update(merchantId: string, body: UpdatePlatformMerchantReq): Promise<PlatformMerchantResp> {
		return await this.call<PlatformMerchantResp>({
			method: 'PATCH',
			url: this.routes.Single(merchantId),
			body,
		});
	}
}

export default PlatformMerchantModule;
