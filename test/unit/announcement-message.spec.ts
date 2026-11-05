import { describe, expect, it } from 'vitest';
import {
	announcementMessageEditorUpdate,
	isHttpsCoverImageUrl,
	reduceAnnouncementMessage,
} from '../../app/utils/announcement-message';
import { announcementHtmlHasText } from '../../app/utils/platform-announcement';

describe('reduceAnnouncementMessage', () => {
	it('keeps bold, italic, underline, lists, and web links', () => {
		const html = '<p>Hello <strong>Sam</strong> <em>there</em> <u>now</u></p><ul><li>One</li></ul>';

		expect(reduceAnnouncementMessage(html)).toBe(html);
		expect(reduceAnnouncementMessage('<p><a href="https://example.com">good</a></p>')).toBe(
			'<p><a href="https://example.com" rel="noopener noreferrer" target="_blank">good</a></p>',
		);
	});

	it('drops pictures, scripts, and non-web links', () => {
		expect(reduceAnnouncementMessage('<p><img src="data:image/png;base64,aaa">Hi</p>')).toBe('<p>Hi</p>');
		expect(reduceAnnouncementMessage('<p>Hello<script>alert(1)</script></p>')).toBe('<p>Hello</p>');
		expect(reduceAnnouncementMessage('<p><a href="javascript:alert(1)">bad</a></p>')).toBe('<p>bad</p>');
	});

	it('replaces the editor only when visible content changed', () => {
		const clean = '<p><a href="https://example.com">good</a></p>';
		const stored = reduceAnnouncementMessage(clean);

		expect(announcementMessageEditorUpdate(clean).replaceEditor).toBe(false);
		expect(announcementMessageEditorUpdate(stored).stored).toBe(stored);
		expect(announcementMessageEditorUpdate('<p>Hi<img src="https://cdn.example/a.png"></p>')).toEqual({
			stored: '<p>Hi</p>',
			replaceEditor: true,
		});
	});

	it('treats an empty editor as no message and accepts only an https cover', () => {
		expect(announcementHtmlHasText(reduceAnnouncementMessage('<p><br></p>'))).toBe(false);
		expect(isHttpsCoverImageUrl('https://cdn.example/a.png')).toBe(true);
		expect(isHttpsCoverImageUrl('http://cdn.example/a.png')).toBe(false);
		expect(isHttpsCoverImageUrl('')).toBe(false);
	});
});
