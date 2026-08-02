import type { DocumentTemplateConfiguration } from '~/utils/types/document-template';

export type SaveDocumentTemplateDraftReq = {
	version: number;
	configuration: DocumentTemplateConfiguration;
};
