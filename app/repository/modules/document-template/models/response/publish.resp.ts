import type { DocumentTemplateRevision } from '~/utils/types/document-template';

export type PublishDocumentTemplateResp = {
	version: number;
	latest_published_revision: DocumentTemplateRevision;
};
