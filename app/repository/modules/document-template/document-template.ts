import HttpFactory from '~/repository/factory';
import MerchantRoutes from '~/repository/routes.client';
import type { DocumentTemplateChannel, DocumentTemplateDetail } from '~/utils/types/document-template';
import type { PreviewDocumentTemplateReq } from './models/request/preview.req';
import type { PublishDocumentTemplateReq } from './models/request/publish.req';
import type { SaveDocumentTemplateDraftReq } from './models/request/save-draft.req';
import type { DocumentTemplateVersionReq } from './models/request/version.req';
import type { DocumentTemplateListResp } from './models/response/list.resp';
import type { DocumentTemplateMutationResp } from './models/response/mutation.resp';
import type { PreviewEmailDocumentTemplateResp } from './models/response/preview-email.resp';
import type { PublishDocumentTemplateResp } from './models/response/publish.resp';
import type { DocumentTemplateRevisionsResp } from './models/response/revisions.resp';
import type { TestSendDocumentTemplateResp } from './models/response/test-send.resp';

class DocumentTemplateModule extends HttpFactory {
	private readonly RESOURCE = MerchantRoutes.DocumentTemplates;

	async list(): Promise<DocumentTemplateListResp> {
		return await this.call<DocumentTemplateListResp>({
			method: 'GET',
			url: this.RESOURCE.List(),
		});
	}

	async get(channel: DocumentTemplateChannel, templateCode: string): Promise<DocumentTemplateDetail> {
		return await this.call<DocumentTemplateDetail>({
			method: 'GET',
			url: this.RESOURCE.Single(channel, templateCode),
		});
	}

	async saveDraft(
		channel: DocumentTemplateChannel,
		templateCode: string,
		body: SaveDocumentTemplateDraftReq,
	): Promise<DocumentTemplateMutationResp> {
		return await this.call<DocumentTemplateMutationResp>({
			method: 'PUT',
			url: this.RESOURCE.SaveDraft(channel, templateCode),
			body,
		});
	}

	async previewEmail(
		channel: 'email',
		templateCode: string,
		body: PreviewDocumentTemplateReq,
	): Promise<PreviewEmailDocumentTemplateResp> {
		return await this.call<PreviewEmailDocumentTemplateResp>({
			method: 'POST',
			url: this.RESOURCE.Preview(channel, templateCode),
			body,
		});
	}

	async previewPdf(
		channel: 'pdf',
		templateCode: string,
		body: PreviewDocumentTemplateReq,
	): Promise<Blob> {
		return await this.call<Blob>({
			method: 'POST',
			url: this.RESOURCE.Preview(channel, templateCode),
			body,
			fetchOptions: { responseType: 'blob' },
		});
	}

	async testSend(
		channel: 'email',
		templateCode: string,
		body: PreviewDocumentTemplateReq,
	): Promise<TestSendDocumentTemplateResp> {
		return await this.call<TestSendDocumentTemplateResp>({
			method: 'POST',
			url: this.RESOURCE.TestSend(channel, templateCode),
			body,
		});
	}

	async publish(
		channel: DocumentTemplateChannel,
		templateCode: string,
		body: PublishDocumentTemplateReq,
	): Promise<PublishDocumentTemplateResp> {
		return await this.call<PublishDocumentTemplateResp>({
			method: 'POST',
			url: this.RESOURCE.Publish(channel, templateCode),
			body,
		});
	}

	async reset(
		channel: DocumentTemplateChannel,
		templateCode: string,
		body: DocumentTemplateVersionReq,
	): Promise<DocumentTemplateMutationResp> {
		return await this.call<DocumentTemplateMutationResp>({
			method: 'POST',
			url: this.RESOURCE.Reset(channel, templateCode),
			body,
		});
	}

	async listRevisions(channel: DocumentTemplateChannel, templateCode: string): Promise<DocumentTemplateRevisionsResp> {
		return await this.call<DocumentTemplateRevisionsResp>({
			method: 'GET',
			url: this.RESOURCE.Revisions(channel, templateCode),
		});
	}

	async restore(
		channel: DocumentTemplateChannel,
		templateCode: string,
		revisionNo: number,
		body: DocumentTemplateVersionReq,
	): Promise<DocumentTemplateMutationResp> {
		return await this.call<DocumentTemplateMutationResp>({
			method: 'POST',
			url: this.RESOURCE.Restore(channel, templateCode, revisionNo),
			body,
		});
	}
}

export default DocumentTemplateModule;
