import sanitizeHtml from 'sanitize-html';

const MESSAGE_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ol', 'ul', 'li', 'a'],
	allowedAttributes: {
		a: ['href', 'rel', 'target'],
	},
	allowedSchemes: ['http', 'https'],
	allowedSchemesAppliedToAttributes: ['href'],
	allowProtocolRelative: false,
	transformTags: {
		a: (_tagName, attribs) => ({
			tagName: 'a',
			attribs: {
				...(attribs.href ? { href: attribs.href } : {}),
				rel: 'noopener noreferrer',
				target: '_blank',
			},
		}),
	},
};

const ANCHOR_WITHOUT_HREF = /<a\b(?![^>]*\bhref=)[^>]*>([\s\S]*?)<\/a>/gi;

/** Announcement Message: paragraphs, bold, italic, underline, lists, and web links. */
export function reduceAnnouncementMessage(value: string): string {
	return sanitizeHtml(value ?? '', MESSAGE_OPTIONS).replace(ANCHOR_WITHOUT_HREF, '$1');
}

export function isHttpsCoverImageUrl(value: string): boolean {
	try {
		const url = new URL(value.trim());
		return url.protocol === 'https:' && url.hostname.length > 0;
	} catch {
		return false;
	}
}

function comparableMessageHtml(html: string): string {
	return html
		.replace(/\srel="noopener noreferrer"/gi, '')
		.replace(/\starget="_blank"/gi, '')
		.replace(/<br\s*\/?>/gi, '<br>')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Stored HTML is the reduced message. The editor is replaced only when visible content changed. */
export function announcementMessageEditorUpdate(value: string): {
	stored: string;
	replaceEditor: boolean;
} {
	const stored = reduceAnnouncementMessage(value);
	return {
		stored,
		replaceEditor: comparableMessageHtml(stored) !== comparableMessageHtml(value),
	};
}
