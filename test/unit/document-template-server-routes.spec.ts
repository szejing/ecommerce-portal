import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch, getRouterParams, readBody, setHeader } = vi.hoisted(() => ({
	signedFetch: vi.fn(),
	getRouterParams: vi.fn(),
	readBody: vi.fn(),
	setHeader: vi.fn(),
}));

vi.mock('#root/server/base_api', () => ({ signedFetch }));
vi.mock('#root/server/routes.server', () => ({
	Routes: {
		DocumentTemplates: {
			SaveDraft: (channel: string, templateCode: string) => `merchant/document-templates/${channel}/${templateCode}/draft`,
			Preview: (channel: string, templateCode: string) => `merchant/document-templates/${channel}/${templateCode}/preview`,
		},
	},
}));

const event = {};

vi.stubGlobal('defineEventHandler', <T>(handler: T) => handler);
vi.stubGlobal('getRouterParams', getRouterParams);
vi.stubGlobal('readBody', readBody);
vi.stubGlobal('setHeader', setHeader);

const { default: draftHandler } = await import('../../server/routes/merchant/document-templates/[channel]/[templateCode]/draft.put');
const { default: previewHandler } = await import('../../server/routes/merchant/document-templates/[channel]/[templateCode]/preview.post');

describe('document template server routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getRouterParams.mockReturnValue({ channel: 'email', templateCode: 'invoice' });
		readBody.mockResolvedValue({
			version: 2,
			configuration: { content: { subject: 'Invoice' } },
		});
	});

	it('proxies identity from path and keeps merchant identity in signed headers', async () => {
		await draftHandler(event);

		const [requestEvent, path, options] = signedFetch.mock.calls[0]!;
		expect(requestEvent).toBe(event);
		expect(path).toBe('merchant/document-templates/email/invoice/draft');
		expect(options).toEqual(expect.objectContaining({
			method: 'PUT',
			body: { version: 2, configuration: { content: { subject: 'Invoice' } } },
		}));
		expect(options.body).not.toHaveProperty('merchant_id');
	});

	it('returns PDF preview as binary rather than decoding it as HTML', async () => {
		const pdf = new Blob(['%PDF'], { type: 'application/pdf' });
		getRouterParams.mockReturnValue({ channel: 'pdf', templateCode: 'invoice' });
		signedFetch.mockResolvedValue(pdf);

		const result = await previewHandler(event);

		expect(signedFetch).toHaveBeenCalledWith(event, 'merchant/document-templates/pdf/invoice/preview', expect.objectContaining({
			method: 'POST',
			responseType: 'blob',
		}));
		expect(setHeader).toHaveBeenCalledWith(event, 'Content-Type', 'application/pdf');
		expect(setHeader).toHaveBeenCalledWith(event, 'Cache-Control', 'no-store');
		expect(result).toBe(pdf);
	});

	it('forwards preview errors without coercing their metadata', async () => {
		const conflict = { status: 409, data: { error: { metadata: { current_version: 7 } } } };
		signedFetch.mockRejectedValue(conflict);

		await expect(previewHandler(event)).rejects.toBe(conflict);
	});
});
