export type DocumentTemplateChannel = 'email' | 'pdf';
export type DocumentTemplateRevisionStatus = 'draft' | 'published' | 'archived';

export type DocumentTemplateConfiguration = {
	brand?: {
		logoAssetId?: number;
		primaryColor?: string;
		secondaryColor?: string;
	};
	merchantInfo?: {
		companyName?: string;
		companyAddress?: string;
		companyPhone?: string;
		companyEmail?: string;
		companyWebsite?: string;
	};
	content?: {
		subject?: string;
		greeting?: string;
		introduction?: string;
		footer?: string;
	};
	blocks?: Array<{
		id: string;
		enabled: boolean;
		props: Record<string, never>;
	}>;
};

export type DocumentTemplateRevisionSummary = {
	id: string;
	revision_no: number;
	status: DocumentTemplateRevisionStatus;
	schema_version: number;
	system_template_version: number;
	created_by: string | null;
	start_date: string | null;
	end_date: string | null;
	published_at: string | null;
	created_at: string;
	updated_at?: string;
};

export type DocumentTemplateRevision = DocumentTemplateRevisionSummary & {
	configuration: DocumentTemplateConfiguration;
};

export type DocumentTemplateField = {
	path: string;
	label: string;
	kind: 'plain-text' | 'rich-text' | 'color' | 'asset' | 'merchant-info';
	max_length: number;
	allow_blank: boolean;
	allowed_tokens: string[];
};

export type DocumentTemplateBlock = {
	id: string;
	label: string;
	required: boolean;
	default_enabled: boolean;
};

type DocumentTemplateDescriptor = {
	template_code: string;
	channel: DocumentTemplateChannel;
	display_name: string;
	category: 'customer' | 'merchant' | 'system';
	editable: boolean;
	version: number;
};

export type DocumentTemplateSummary = DocumentTemplateDescriptor & {
	draft_revision: DocumentTemplateRevisionSummary | null;
	latest_published_revision: DocumentTemplateRevisionSummary | null;
	active_revision: DocumentTemplateRevisionSummary | null;
	scheduled_revisions: DocumentTemplateRevisionSummary[];
	expired_revisions: DocumentTemplateRevisionSummary[];
};

export type DocumentTemplateListResponse = {
	document_templates: DocumentTemplateSummary[];
};

export type DocumentTemplateDetail = DocumentTemplateDescriptor & {
	catalog_schema_version: number;
	catalog_system_template_version: number;
	fields: DocumentTemplateField[];
	blocks: DocumentTemplateBlock[];
	allowed_tokens: string[];
	configuration: DocumentTemplateConfiguration;
	inherited_values: { merchantInfo?: DocumentTemplateConfiguration['merchantInfo'] };
	effective_preview_values: DocumentTemplateConfiguration;
	draft_revision: DocumentTemplateRevision | null;
	latest_published_revision: DocumentTemplateRevision | null;
	active_revision: DocumentTemplateRevision | null;
};

export type SaveDocumentTemplateDraftRequest = {
	version: number;
	configuration: DocumentTemplateConfiguration;
};

export type PreviewDocumentTemplateRequest = {
	configuration: DocumentTemplateConfiguration;
};

export type PublishDocumentTemplateRequest = {
	version: number;
	revision_no: number;
	start_date: string | null;
	end_date: string | null;
};

export type DocumentTemplateVersionRequest = { version: number };

export type DocumentTemplateMutationResponse = {
	version: number;
	draft_revision: DocumentTemplateRevision;
};

export type PublishDocumentTemplateResponse = {
	version: number;
	latest_published_revision: DocumentTemplateRevision;
};

export type PreviewEmailDocumentTemplateResponse = {
	html: string;
	subject: string;
	revision_id: string | null;
	revision_no: number | null;
};

export type TestSendDocumentTemplateResponse = { message: string };
export type DocumentTemplateRevisionsResponse = { revisions: DocumentTemplateRevision[] };

export type DocumentTemplateVersionConflict = {
	code: 409;
	message: string;
	statusCode: 409;
	metadata: { current_version: number };
};
