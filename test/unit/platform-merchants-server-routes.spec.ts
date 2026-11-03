import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch, getQuery, readBody, getRouterParam } = vi.hoisted(() => ({
	signedFetch: vi.fn(),
	getQuery: vi.fn(),
	readBody: vi.fn(),
	getRouterParam: vi.fn(),
}));

vi.mock('#root/server/base_api', () => ({ signedFetch }));
vi.mock('#root/server/routes.server', () => ({
	Routes: {
		PlatformMerchants: {
			Many: () => 'platform/merchants',
			Single: (merchantId: string) => `platform/merchants/${encodeURIComponent(merchantId)}`,
		},
	},
}));

vi.stubGlobal('getQuery', getQuery);
vi.stubGlobal('readBody', readBody);
vi.stubGlobal('getRouterParam', getRouterParam);
vi.stubGlobal('defineEventHandler', <T>(handler: T) => handler);
vi.stubGlobal('createError', (payload: Record<string, unknown>) =>
	Object.assign(new Error(String(payload.statusMessage ?? 'Request failed')), payload),
);

const event = { context: {} } as never;

const { default: listHandler } = await import('../../server/routes/platform/merchants/index.get');
const { default: createHandler } = await import('../../server/routes/platform/merchants/index.post');
const { default: patchHandler } = await import('../../server/routes/platform/merchants/[merchantId].patch');

describe('platform merchants Nitro routes', () => {
	beforeEach(() => {
		signedFetch.mockReset();
		getQuery.mockReset();
		readBody.mockReset();
		getRouterParam.mockReset();
		signedFetch.mockResolvedValue({ merchants: [], count: 0 });
	});

	it('lists with search query and without merchant id', async () => {
		getQuery.mockReturnValue({ q: 'M00001' });

		await listHandler(event);

		expect(signedFetch).toHaveBeenCalledWith(event, 'platform/merchants', {
			method: 'GET',
			includeMerchantId: false,
			query: { q: 'M00001' },
		});
	});

	it('creates via POST without merchant id', async () => {
		const body = { name: 'Store' };
		readBody.mockResolvedValue(body);

		await createHandler(event);

		expect(signedFetch).toHaveBeenCalledWith(event, 'platform/merchants', {
			method: 'POST',
			includeMerchantId: false,
			body,
		});
	});

	it('patches a merchant by id', async () => {
		getRouterParam.mockReturnValue('M00002');
		readBody.mockResolvedValue({ hide_store: false });

		await patchHandler(event);

		expect(signedFetch).toHaveBeenCalledWith(event, 'platform/merchants/M00002', {
			method: 'PATCH',
			includeMerchantId: false,
			body: { hide_store: false },
		});
	});
});
