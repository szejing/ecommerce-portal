import type { DocumentTemplateRevision } from '~/utils/types/document-template';

export type DocumentTemplateMutationResp = {
	version: number;
	draft_revision: DocumentTemplateRevision;
};
