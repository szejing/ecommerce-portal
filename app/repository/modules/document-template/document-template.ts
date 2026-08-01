import HttpFactory from '~/repository/factory';
import MerchantRoutes from '~/repository/routes.client';
import type {
	DocumentTemplateChannel,
	DocumentTemplateDetail,
	DocumentTemplateListResponse,
	DocumentTemplateMutationResponse,
	DocumentTemplateRevisionsResponse,
	DocumentTemplateVersionRequest,
	PreviewDocumentTemplateRequest,
	PreviewEmailDocumentTemplateResponse,
	PublishDocumentTemplateRequest,
	PublishDocumentTemplateResponse,
	SaveDocumentTemplateDraftRequest,
	TestSendDocumentTemplateResponse,
} from '~/utils/types/document-template';

class DocumentTemplateModule extends HttpFactory {
	private readonly RESOURCE = MerchantRoutes.DocumentTemplates;

	async list(): Promise<DocumentTemplateListResponse> {
		return await this.call<DocumentTemplateListResponse>({
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
		body: SaveDocumentTemplateDraftRequest,
	): Promise<DocumentTemplateMutationResponse> {
		return await this.call<DocumentTemplateMutationResponse>({
			method: 'PUT',
			url: this.RESOURCE.SaveDraft(channel, templateCode),
			body,
		});
	}

	async previewEmail(
		channel: 'email',
		templateCode: string,
		body: PreviewDocumentTemplateRequest,
	): Promise<PreviewEmailDocumentTemplateResponse> {
		return await this.call<PreviewEmailDocumentTemplateResponse>({
			method: 'POST',
			url: this.RESOURCE.Preview(channel, templateCode),
			body,
		});
	}

	async previewPdf(
		channel: 'pdf',
		templateCode: string,
		body: PreviewDocumentTemplateRequest,
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
		body: PreviewDocumentTemplateRequest,
	): Promise<TestSendDocumentTemplateResponse> {
		return await this.call<TestSendDocumentTemplateResponse>({
			method: 'POST',
			url: this.RESOURCE.TestSend(channel, templateCode),
			body,
		});
	}

	async publish(
		channel: DocumentTemplateChannel,
		templateCode: string,
		body: PublishDocumentTemplateRequest,
	): Promise<PublishDocumentTemplateResponse> {
		return await this.call<PublishDocumentTemplateResponse>({
			method: 'POST',
			url: this.RESOURCE.Publish(channel, templateCode),
			body,
		});
	}

	async reset(
		channel: DocumentTemplateChannel,
		templateCode: string,
		body: DocumentTemplateVersionRequest,
	): Promise<DocumentTemplateMutationResponse> {
		return await this.call<DocumentTemplateMutationResponse>({
			method: 'POST',
			url: this.RESOURCE.Reset(channel, templateCode),
			body,
		});
	}

	async listRevisions(channel: DocumentTemplateChannel, templateCode: string): Promise<DocumentTemplateRevisionsResponse> {
		return await this.call<DocumentTemplateRevisionsResponse>({
			method: 'GET',
			url: this.RESOURCE.Revisions(channel, templateCode),
		});
	}

	async restore(
		channel: DocumentTemplateChannel,
		templateCode: string,
		revisionNo: number,
		body: DocumentTemplateVersionRequest,
	): Promise<DocumentTemplateMutationResponse> {
		return await this.call<DocumentTemplateMutationResponse>({
			method: 'POST',
			url: this.RESOURCE.Restore(channel, templateCode, revisionNo),
			body,
		});
	}
}

export default DocumentTemplateModule;
