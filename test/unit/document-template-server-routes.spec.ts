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
			Single: (channel: string, templateCode: string) => `merchant/document-templates/${channel}/${templateCode}`,
			SaveDraft: (channel: string, templateCode: string) => `merchant/document-templates/${channel}/${templateCode}/draft`,
			Preview: (channel: string, templateCode: string) => `merchant/document-templates/${channel}/${templateCode}/preview`,
			TestSend: (channel: string, templateCode: string) => `merchant/document-templates/${channel}/${templateCode}/test-send`,
			Publish: (channel: string, templateCode: string) => `merchant/document-templates/${channel}/${templateCode}/publish`,
			Reset: (channel: string, templateCode: string) => `merchant/document-templates/${channel}/${templateCode}/reset`,
			Revisions: (channel: string, templateCode: string) => `merchant/document-templates/${channel}/${templateCode}/revisions`,
			Restore: (channel: string, templateCode: string, revisionNo: string) => `merchant/document-templates/${channel}/${templateCode}/revisions/${revisionNo}/restore`,
		},
	},
}));

const event = { context: { merchantSession: { merchant_id: 'M-AUTHENTICATED' } } };

vi.stubGlobal('defineEventHandler', <T>(handler: T) => handler);
vi.stubGlobal('getRouterParams', getRouterParams);
vi.stubGlobal('readBody', readBody);
vi.stubGlobal('setHeader', setHeader);
vi.stubGlobal('createError', (payload: Record<string, unknown>) => Object.assign(new Error(String(payload.statusMessage ?? 'Request failed')), payload));

const { default: draftHandler } = await import('../../server/routes/merchant/document-templates/[channel]/[templateCode]/draft.put');
const { default: previewHandler } = await import('../../server/routes/merchant/document-templates/[channel]/[templateCode]/preview.post');
const { default: testSendHandler } = await import('../../server/routes/merchant/document-templates/[channel]/[templateCode]/test-send.post');
const { default: publishHandler } = await import('../../server/routes/merchant/document-templates/[channel]/[templateCode]/publish.post');
const { default: resetHandler } = await import('../../server/routes/merchant/document-templates/[channel]/[templateCode]/reset.post');
const { default: restoreHandler } = await import('../../server/routes/merchant/document-templates/[channel]/[templateCode]/revisions/[revisionNo]/restore.post');

const maliciousConfiguration = JSON.parse(`{
	"brand": { "primaryColor": "#123456", "merchant_id": "M-ATTACKER", "__proto__": { "source": "attacker" } },
	"content": { "subject": "Invoice", "recipient": "attacker@example.com" },
	"blocks": [{ "id": "items", "enabled": true, "props": { "unexpected": true }, "fixture": "order" }],
	"customer": { "email": "attacker@example.com" },
	"__proto__": { "merchant_id": "M-ATTACKER" }
}`);

const sanitizedConfiguration = {
	brand: { primaryColor: '#123456' },
	content: { subject: 'Invoice' },
	blocks: [{ id: 'items', enabled: true, props: {} }],
};

function signedBody(): Record<string, unknown> {
	return signedFetch.mock.calls.at(-1)![2].body;
}

function rawResponse(status: number, contentType: string, data: Blob) {
	return {
		status,
		ok: status >= 200 && status < 300,
		headers: new Headers({ 'content-type': contentType }),
		_data: data,
	};
}

describe('document template server routes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getRouterParams.mockReturnValue({ channel: 'email', templateCode: 'invoice' });
		readBody.mockResolvedValue({ version: 2, configuration: maliciousConfiguration });
	});

	it('allowlists draft and preview bodies while retaining authenticated signing context', async () => {
		await draftHandler(event);

		const [requestEvent, path, options] = signedFetch.mock.calls[0]!;
		expect(requestEvent).toBe(event);
		expect(requestEvent.context.merchantSession.merchant_id).toBe('M-AUTHENTICATED');
		expect(path).toBe('merchant/document-templates/email/invoice/draft');
		expect(options).toEqual(expect.objectContaining({
			method: 'PUT',
			body: { version: 2, configuration: sanitizedConfiguration },
		}));
		expect(options).not.toHaveProperty('merchant_id');
		expect(Object.getPrototypeOf(options.body)).toBeNull();

		getRouterParams.mockReturnValue({ channel: 'email', templateCode: 'invoice' });
		await previewHandler(event);
		expect(signedBody()).toEqual({ configuration: sanitizedConfiguration });
	});

	it('allowlists test-send, publish, reset, and restore bodies', async () => {
		await testSendHandler(event);
		expect(signedBody()).toEqual({ configuration: sanitizedConfiguration });
		expect(Object.getPrototypeOf(signedBody())).toBeNull();

		readBody.mockResolvedValue({
			version: 4,
			revision_no: 5,
			start_date: null,
			end_date: '2026-08-31T16:00:00.000Z',
			merchant_id: 'M-ATTACKER',
			user: { id: 'attacker' },
			to: 'attacker@example.com',
			context: { customer: 'attacker' },
			__proto__: { merchant_id: 'M-ATTACKER' },
		});
		await publishHandler(event);
		expect(signedBody()).toEqual({
			version: 4,
			revision_no: 5,
			start_date: null,
			end_date: '2026-08-31T16:00:00.000Z',
		});
		expect(Object.getPrototypeOf(signedBody())).toBeNull();

		readBody.mockResolvedValue({ version: 4, merchant_id: 'M-ATTACKER', source: 'fixture' });
		await resetHandler(event);
		expect(signedBody()).toEqual({ version: 4 });
		expect(Object.getPrototypeOf(signedBody())).toBeNull();

		getRouterParams.mockReturnValue({ channel: 'email', templateCode: 'invoice', revisionNo: '5' });
		await restoreHandler(event);
		expect(signedBody()).toEqual({ version: 4 });
		expect(Object.getPrototypeOf(signedBody())).toBeNull();
	});

	it('returns successful PDF preview bytes without decoding them as HTML', async () => {
		const pdf = new Blob(['%PDF'], { type: 'application/pdf' });
		getRouterParams.mockReturnValue({ channel: 'pdf', templateCode: 'invoice' });
		signedFetch.mockResolvedValue(rawResponse(200, 'application/pdf', pdf));

		const result = await previewHandler(event);

		expect(signedFetch).toHaveBeenCalledWith(event, 'merchant/document-templates/pdf/invoice/preview', expect.objectContaining({
			method: 'POST',
			responseType: 'blob',
			raw: true,
			ignoreResponseError: true,
		}));
		expect(setHeader).toHaveBeenCalledWith(event, 'Content-Type', 'application/pdf');
		expect(setHeader).toHaveBeenCalledWith(event, 'Cache-Control', 'no-store');
		expect(result).toBe(pdf);
	});

	it('forwards a PDF-preview JSON 409 envelope with conflict metadata', async () => {
		const conflict = {
			code: 409,
			statusCode: 409,
			message: 'The template changed in another session. Reload before saving.',
			metadata: { current_version: 7 },
		};
		getRouterParams.mockReturnValue({ channel: 'pdf', templateCode: 'invoice' });
		signedFetch.mockResolvedValue(rawResponse(409, 'application/json', new Blob([
			JSON.stringify({ success: false, error: conflict }),
		], { type: 'application/json' })));

		await expect(previewHandler(event)).rejects.toMatchObject({
			statusCode: 409,
			data: { error: conflict },
		});
	});

	it.each([400, 503])('forwards JSON %i preview errors instead of returning an error Blob', async (status) => {
		const error = { code: status, statusCode: status, message: `Upstream ${status}`, metadata: { current_version: 9 } };
		getRouterParams.mockReturnValue({ channel: 'pdf', templateCode: 'invoice' });
		signedFetch.mockResolvedValue(rawResponse(status, 'application/json', new Blob([
			JSON.stringify({ success: false, error }),
		], { type: 'application/json' })));

		await expect(previewHandler(event)).rejects.toMatchObject({
			statusCode: status,
			data: { error },
		});
	});

	it('rejects a successful non-PDF preview response without exposing its body', async () => {
		getRouterParams.mockReturnValue({ channel: 'pdf', templateCode: 'invoice' });
		signedFetch.mockResolvedValue(rawResponse(200, 'text/html', new Blob(['<html>upstream path</html>'], { type: 'text/html' })));

		await expect(previewHandler(event)).rejects.toMatchObject({
			statusCode: 502,
			statusMessage: 'Document template preview did not return a PDF',
		});
	});

	it('uses signedFetch raw mode without changing the session-owned merchant header path', async () => {
		const raw = vi.fn().mockResolvedValue(rawResponse(409, 'application/json', new Blob(['{}'])));
		const fetch = Object.assign(vi.fn(), { raw });
		vi.stubGlobal('$fetch', fetch);
		vi.stubGlobal('useRuntimeConfig', () => ({ public: { baseUrl: 'https://backend.example.test' }, apiKey: 'key' }));
		vi.stubGlobal('getCookie', (_event: unknown, key: string) => key === 'x-merchant-id' ? 'M-AUTHENTICATED' : 'access-token');
		const { signedFetch: actualSignedFetch } = await vi.importActual<typeof import('../../server/base_api')>('../../server/base_api');

		await actualSignedFetch(event, 'merchant/document-templates/pdf/invoice/preview', {
			method: 'POST',
			body: { configuration: {} },
			raw: true,
			ignoreResponseError: true,
		});

		expect(raw).toHaveBeenCalledOnce();
		expect(raw.mock.calls[0]![1].headers['x-merchant-id']).toBe('M-AUTHENTICATED');
	});

	it('keeps H3 conflict metadata usable by the document-template repository', async () => {
		const conflict = {
			code: 409,
			statusCode: 409,
			message: 'The template changed in another session. Reload before saving.',
			metadata: { current_version: 7 },
		};
		vi.stubGlobal('$fetch', vi.fn().mockRejectedValue({ data: { data: { error: conflict } } }));
		const { default: DocumentTemplateModule } = await import('../../app/repository/modules/document-template/document-template');

		await expect(new DocumentTemplateModule().saveDraft('email', 'invoice', {
			version: 7,
			configuration: {},
		})).rejects.toEqual(conflict);
	});
});
