import Quill from 'quill';
import Embed from 'quill/blots/embed';
import { normalizeTemplateToken, splitTemplateTokenSegments } from '~/utils/document-template';

export class TemplateTokenBlot extends Embed {
	static blotName = 'templateToken';
	static className = 'template-token-chip';
	static tagName = 'SPAN';

	static create(value: string) {
		const node = super.create(value) as HTMLElement;
		const token = normalizeTemplateToken(value);
		const name = token.slice(2, -2);
		node.setAttribute('data-token', name);
		node.setAttribute('contenteditable', 'false');
		node.classList.add(
			'inline-flex',
			'items-center',
			'gap-1',
			'rounded-full',
			'border',
			'border-primary/30',
			'bg-primary/10',
			'px-2',
			'py-0.5',
			'font-mono',
			'text-xs',
			'text-primary',
		);
		const label = document.createElement('span');
		label.textContent = token;
		node.appendChild(label);
		const remove = document.createElement('button');
		remove.type = 'button';
		remove.setAttribute('data-token-remove', name);
		remove.setAttribute('aria-label', `Remove token ${token}`);
		remove.className = 'inline-flex size-4 items-center justify-center rounded-full text-primary';
		remove.textContent = '×';
		node.appendChild(remove);
		return node;
	}

	static value(domNode: HTMLElement) {
		const name = domNode.getAttribute('data-token') ?? '';
		return normalizeTemplateToken(name);
	}

	html() {
		return TemplateTokenBlot.value(this.domNode as HTMLElement);
	}
}

if (!Quill.imports['formats/templateToken']) {
	Quill.register(TemplateTokenBlot);
}

export function hydrateTemplateTokensInHtml(html: string, allowedTokens: readonly string[]): string {
	if (!html || !allowedTokens.length) return html;
	const segments = splitTemplateTokenSegments(html, allowedTokens);
	return segments.map((segment) => {
		if (segment.type === 'text') return segment.value;
		const name = segment.value.slice(2, -2);
		return `<span class="template-token-chip" data-token="${name}">${segment.value}<button type="button" data-token-remove="${name}">×</button></span>`;
	}).join('');
}

export function serializeTemplateTokenHtml(html: string): string {
	if (!html.includes('template-token-chip')) return html;
	if (typeof DOMParser !== 'undefined') {
		const doc = new DOMParser().parseFromString(html, 'text/html');
		doc.querySelectorAll('.template-token-chip[data-token]').forEach((node) => {
			const name = node.getAttribute('data-token') ?? '';
			node.replaceWith(doc.createTextNode(`{{${name}}}`));
		});
		return doc.body.innerHTML;
	}
	return html.replace(
		/<span\b[^>]*\btemplate-token-chip\b[^>]*>[\s\S]*?<\/span>/gi,
		(match) => {
			const name = /\bdata-token="([^"]+)"/i.exec(match)?.[1];
			return name ? `{{${name}}}` : match;
		},
	);
}
